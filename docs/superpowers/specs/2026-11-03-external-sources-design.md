# External sources: data from the host's own system, in a block

## Why

A host that keeps products, articles or prices wants a block to show them without the person typing
them again. Today the `external` field (M5) lets a person pick an item from the host's list, and stores
`{ id, label }`. That is all: the block cannot show a price or a picture of the item, and nothing says
when the stored label is out of date.

We measured Puck (`@puckeditor/core` 0.24.0, 30 blocks with a `resolveData` each, a 300 ms fake API):
on opening the page it calls all 30 at once with no limit, does not merge two blocks that point at the
same item (the API was hit twice for one id), and rewrites the page, so `onChange` fires 30 times before
the person touched anything. `<Render>` calls nothing; a host who wants fresh data at view time must run
`resolveAllData` itself, with the same 30 parallel calls. Puck stores a snapshot; there is no "reference"
mode, and no `get`-many call for the host to give.

## What the person and the host get

**The person** picks an item from a searchable list that shows what it is (label, and what the host
adds, such as a picture and a price). The block shows the item's data in the canvas. On opening a page,
the editor checks the items in the background; if some changed it says "3 blocks have newer data.
Update", and nothing changes until the person presses it (one undo step, one `onChange`). An item
that is gone, or a source that cannot be reached, never empties the block: it keeps what it had and
shows "no longer in the source" or "could not check".

**The host** gives one object per source, with one function required and the rest optional:

```ts
config.sources = {
  products: {
    search(query, signal, ctx) => Promise<ExternalItem[]>,   // exists today (ctx is new)
    get?(id, signal, ctx) => Promise<ExternalItem | null>,    // one item, to check or refresh
    getMany?(ids, signal, ctx) => Promise<Record<string, ExternalItem | null>>, // the whole page at once
  },
}
// ExternalItem = { id: string; label: string; data?: JsonValue }   // `data` is new: what the block shows
```

A host with no `get` and no `getMany` gets today's behaviour: no check, no banner. A host that gives
`getMany` gets one call for the page; one that gives only `get` gets calls in parallel, at most 5 at a
time. Equal ids are asked once. No extra wiring on the host's side for the banner, the loading and
error states, or the update.

## How it is stored: the host chooses per field

The field gets `store?: "snapshot" | "reference"` (default `"snapshot"`).

- `snapshot`: the page holds `{ id, label, data, at }`. `<Render>` draws from it as it is, with no
  network call, so a page opens offline and an item deleted later does not break it. The check and
  banner keep it from going stale without anyone knowing.
- `reference`: the page holds `{ id, label }` only. For a value that must be right at view time (a
  price, stock). A helper `resolveSources(page, registry, sources, ctx)` (in `@miditor/core`, no
  React) returns a copy of the page with `data` filled in, using `getMany` or `get` as above; the host
  runs it where it wants (at build, on its server, in the browser) and passes the result to `<Render>`.
  In the editor, the canvas reads `data` from the source (cached for the session), shows loading and
  error states, and never writes it into the page.

`<Render>` stays pure: it never calls the network. A page with `{ id, label }` and no `data` draws
the block with `data` missing; the block's renderer decides what that looks like.

`ctx` is `metadata` (see below), so `search`/`get`/`getMany` can use a language, a shop id, the
viewer's rights.

## `metadata`

A prop `metadata?: JsonValue` on `<Editor>` and on `<Render>`. Not stored in the page. It reaches
`search`/`get`/`getMany` as `ctx.metadata`, and the renderers of kinds as a second argument.

## Goals

- A person never sees a block silently go out of date, and never sees a change they did not ask for.
- A host can start with one function (`search`) and add `getMany` when its API has one.
- `<Render>` keeps making no network call.
- A page stored before this change (`{ id, label }`) opens unchanged.

## Non-goals

- Choosing several items in one field (a grid of products): that goes with the `array` field, a later piece.
- Refreshing at view time inside `<Render>`; the host does it with `resolveSources`.
- A cache that lasts between sessions, or between editors.
- Writing to the host's system.

## Anti-goals (a failure even if it works)

- An `onChange` the person did not cause.
- A request per block when one request would do, or the same id asked twice.
- An empty block because the source was slow, down or lost the item.

## Constraints

- Editor bundle: 356.55 of 360 kB raw today. The new code (check, banner, preview list) goes in the
  smallest place that fits; if it cannot, the budget is raised on purpose, in its own commit, not hit by accident.
- `resolveSources` is in `core` or `render`, not in `editor`, so a host that only renders does not
  carry the editor.
- Everything the person does goes through the store's `runner`: permissions, undo and `onChange` apply
  to "Update" like to any command. A hidden or refused field is not checked.
- `data` is plain JSON, at most 8 kB per field (our call; `validatePage` reports more).

## What the builder decides

Names of new i18n keys and their wording (English and Vietnamese); the look of the item preview and the
banner; the exact types of `ctx`; where the check lives in the store; how many ids go in one `getMany`
call when a page has hundreds (the host may refuse a long list: split it, in chunks of 100, our call).

## Order of work

1. `data` on `ExternalItem` and in the stored value; `search` gets `ctx`/`metadata`; validation; the
   preview list shows `data`; the canvas shows it. (`snapshot` only.)
2. `get`/`getMany`; the check on opening; the banner; the "Update" command (`refreshSources`); the
   states: loading, gone, could not check; the controller gets `checkSources()`.
3. `store: "reference"`, `resolveSources`, the canvas reading from the source.
4. `metadata` on `<Render>` and the renderers (the editor's half is in step 1).

Each step is its own branch of small commits and can be merged alone.

## Decided after the builder check (the author's calls, to be checked in the review)

1. **What a block reads.** The renderer of a kind reads the field's whole value, `props.<field> =
   { id, label, data?, at? }`; `data` is any JSON. The canvas and `<Render>` share the renderer. For a
   `reference` field `data` is put into a copy of the value before the renderer sees it, so the
   renderer always reads `props.<field>.data`. `data` and `at` are optional, so a stored `{ id, label }`
   stays valid.
2. **Changed.** A deep JSON compare of `{ label, data }` between what is stored and what the source
   returns; `at` is left out (it is the ISO time of the fetch that gave `data`). Missing `data` counts as
   changed. Update writes `label`, `data` and `at`. An item the source says is gone (`null`) is not
   updated: the field shows "no longer in the source" and keeps what it had.
3. **`reference` in the editor.** One loader and one session cache for the check and for the canvas, with
   the same limits and merging. Items from `search` seed the cache. With neither `get` nor `getMany`
   the block is drawn with `data` missing, with a note in the panel; it is never hidden. Moving a field
   from `snapshot` to `reference` leaves old `data` in the page, ignored and overwritten at view time;
   moving the other way shows the banner (missing `data` counts as changed).
4. **Scope.** The current page (one page per editor), every `external` field including those inside
   `array` and `object` values. Hidden fields, and fields the person may not edit, are skipped; a change
   of permissions does not trigger a new check.
5. **When it runs.** On opening, on `controller.checkSources()`, and when `metadata` changes (deep
   compare). The banner is worked out by comparing the last answers with the page as it is now, so Update,
   undo and later edits keep it right with no extra bookkeeping, and an old answer cannot overwrite a
   newer edit. A new check or unmounting aborts the earlier calls with their `signal`.
6. **`getMany` rules.** A key present with `null` is "gone"; a key missing from the answer is "could
   not check". Chunks of 100; the chunks that answered count even if another failed. 15 s timeout per call,
   no retry.
7. **`resolveSources`.** In `@miditor/core`, with the loader (batching, merging, limits) the editor also
   uses, so `ExternalSource` and `ExternalItem` move to core as types. It walks nested values. It never
   throws for a source: it returns `{ page, failed }`, where `failed` lists the ids it could not load, and
   leaves `data` missing for them.
8. **Size.** The 8 kB limit is checked when an item is picked: if `data` is larger, the pick is refused
   with a message. A `reference` field stores no `data`, so it never reaches the limit.

## Still the owner's to decide

- The editor bundle budget (see Constraints). Options: raise 360 kB on purpose, or put the check and
  the preview list in a chunk that loads only when a page has an `external` field.
