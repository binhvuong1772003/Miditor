# M1: a control API for the host

Design for milestone M1 of `2026-10-31-overrides-and-composition-plan.md`. M0 (the store and the named
commands) is done and merged; this builds on it.

## Intent

Today the host can put things _into_ the editor (`headerActions`, `logo`, `headerStart`) and hear from
it (`onSave`, `onChange`), but it cannot _drive_ it. A Publish button of the host cannot save, a host
button cannot be greyed out when there is nothing to undo, a tutorial cannot select a block, an AI
helper cannot add one. M1 opens the editor's own commands and a small read side to the host's code.

"User" in this document is the developer who embeds the editor. People editing pages press buttons;
they write no code.

## Goals

- A host calls the editor's commands from its own code: `editor.save()`, `editor.undo()`,
  `editor.select(id)`, `editor.addBlock("Text")`.
- A host reads what the editor is doing, and its own parts redraw only when what they read changes:
  `useEditor((s) => s.canUndo)`.
- One list of commands: the editor's buttons, keys and menus, and the host's calls, run the same code.
- Hosts that do nothing new keep working with no change.
- A public surface that is small, named and labelled stable or experimental, so the inside can change.

## Non-goals

- Hiding or replacing the editor's own buttons and panels (M2, M3, M4).
- Rules that block a command (M3). The place for them, `hooks.before` in `store/commands.ts`, exists
  and stays closed to the host.
- An MCP server or any bridge between a page and another process. M1 is what such a bridge would
  call; the bridge is separate.
- A controlled `data` prop. The page stays read once when the editor mounts.

## Anti-goals

- A second copy of the commands for the host. If `editor.undo()` and the Undo button can disagree,
  M1 failed.
- A raw `dispatch` or the store handed out. The inside must stay free to change.
- Making a host that uses nothing pay for it, in code or in renders.

## The three tiers

Decided with the owner, from simplest to most:

| Tier                         | The host writes                                                                                                                       | For                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. Use it                    | `<Editor />`                                                                                                                          | An editor that just works                                                 |
| 2. Buttons inside the editor | `<Editor headerActions={<MyButton />} />`, and `useEditor()` in `MyButton`                                                            | Host buttons, host status, anything drawn inside the editor               |
| 3. Control from outside      | `const editor = useCreateEditor()`, `<Editor controller={editor} />`, then `editor.save()` and `useEditor(editor, selector)` anywhere | The host's own app bar, a sidebar outside the editor, an AI or MCP bridge |

Tier 3 holds tier 2: `useEditor()` inside the tree reads the same thing the controller gives. A host
moves between tiers without learning a second API.

**Order:** tiers 1 and 2 first (M1a), tier 3 after (M1b). M1a is built so that M1b adds code and
changes none of it (see "Made for tier 3").

## The surface

Two parts, one object. Names are a first proposal; the builder may adjust them if the same ideas are
kept.

**Read** (`EditorView`, what a selector receives):

| Read                 | Type                                                | Note                                                                     |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| `data`               | `PageData`                                          | The page as it is stored, as `onSave` would receive it                   |
| `selection`          | `{ id: string \| null; picked: readonly string[] }` |                                                                          |
| `frame`              | `"desktop" \| "phone"`                              |                                                                          |
| `zoom`               | `number`                                            |                                                                          |
| `canUndo`, `canRedo` | `boolean`                                           |                                                                          |
| `status`             | `SaveStatus`                                        | What the header says (the `status` prop, or the Save button's own state) |

**Commands** (`EditorApi`): `undo`, `redo`, `save`, `setFrame`, `setZoom`, `fit`, `select`,
`clearSelection`, `addBlock`, `remove` (delete the selection), `duplicate`, `group`, `ungroup`.

Every command that exists in `commandTable` (`store/commands.ts`) is called through `run`, so the
buttons, keys, menus and the host share it. Commands the table does not yet have (`save`, `select`,
`addBlock`, `fit`, `setZoom`) get a name in the table, with the same rules (`before` and `after` hooks
run for them).

A command that cannot run now (nothing to undo, a phone frame that takes no new blocks) does nothing
and returns `false`, as `run` does. It never throws for that.

**Stability:** each member carries `@stable` or `@experimental` in its type comment. The first
release marks the read side and `undo`, `redo`, `save`, `select`, `setFrame` stable, the rest
experimental.

## How it is built (tiers 1 and 2)

What the code of today shows, which shapes this:

- The store is made in `Editor` and holds the view, selection and document state.
- Some commands need the screen: `addBlock` measures the selected block and the page, and several
  commands measure a parent (`parentSize`). That is why `EditorBody` gives `run` a context through a
  ref updated on every render. `save` also lives in `EditorBody`, because it calls the `onSave` prop.
- So the control object is **built in `EditorBody`**, from the same `run`, the same `save` and the
  same `addBlockOf` the editor's buttons use, held in a ref that is updated each render, and given to
  the parts through a context. It is a plain object whose identity does not change between renders.
- `useEditor()` without an argument returns that object. `useEditor(selector)` reads
  `EditorView` through the store hook that exists (`useEditorState`), so a part redraws only when its
  selected value changes. `canUndo` and `canRedo` are derived with the `canRun` rules the buttons use.
- `status` is not in the store today: `EditorBody` works it out from the `status` prop, the Save button
  and the history. The builder decides how it reaches a selector (mirror it into the store, or
  read it through the context) without making a part redraw more often than now.
- Outside an editor, `useEditor` throws a clear error, as the store hooks already do.

## Tier 3: the controller (M1b)

M1b changes the plan above in one way, found while designing it: the controller does **not** hold the
store. The editor keeps making its own store from `data` as it does today, and the controller is a
handle that the editor attaches itself to. So tiers 1 and 2 change by nothing, and there is no empty
store waiting for data.

- `createEditor(): EditorController` and `useCreateEditor(): EditorController` (made once, stable in
  StrictMode). `EditorController` has every member of `EditorApi`, so `editor.save()` works anywhere.
- `<Editor controller={editor} />`: when the editor mounts it attaches its control object and its
  store to the controller; when it unmounts it lets go.
- `useEditor(editor)` returns `editor`; `useEditor(editor, (view) => view.canUndo)` reads a piece of
  the attached editor and redraws only when that piece changes. Inside the tree `useEditor()` stays as
  it is.
- Before an editor is attached, after it is gone, or when no `controller` was given: a command does
  nothing and returns `false` (`null` for `addBlock`, `Promise<false>` for `save`), warning once; a
  read gives an idle view (an empty page, nothing selected, desktop, 100 %, nothing to undo, no
  status).
- A second editor given a controller that is already attached: the first keeps it, the second is
  ignored, and a `console.error` says so. Giving another controller to a mounted editor attaches the
  new one and lets go of the old.
- Opening the editor again starts a new page from `data`, with a new history: the controller keeps
  nothing between editors.
- The way to attach is internal (not exported from the package), so the public surface is
  `createEditor`, `useCreateEditor`, `EditorController` and the extra forms of `useEditor`.

## Testing

- Unit: each command through the control object gives the same state as the same command through
  `run`; `canUndo` and `canRedo` follow the history; a selector redraws only when its value changes;
  two editors on one page do not share control objects.
- e2e: a host button inside `headerActions` that calls `save`, `undo`, `select` and `addBlock`, and
  one that greys out with `canUndo`; run in StrictMode as well.
- `pnpm perf`: no part commits more than before, in the six moments of the baseline.
- The architecture test keeps its rules; the new files obey them.
- An API report of the public types (api-extractor or a snapshot of `index.d.ts`) so a change to the
  surface shows in review.

## Calls made by the designer

Settled without the owner, after the builder check; each can be changed.

- **`save()`** returns `Promise<boolean>`: `true` once `onSave` has settled, `false` when it could not
  run (no editor attached, or `onSave` threw). It is not a pure reducer, so it is not in the
  reducer table. `save`, `addBlock` and `fit` need the screen and are plain functions of the
  control object; the `before`/`after` hooks are for the table commands only, and are widened to these
  three in M3, when a rule needs them.
- **`addBlock(kind, overrides?)`** takes what `addBlockOf` takes. It lands where the editor's own
  add does (inside the selected block if that kind can hold it, otherwise on the page). It returns the id of
  the new block, or `null` on the phone frame, as the buttons are off there.
- **Before the editor has mounted, or after it unmounted:** a command does nothing, returns `false`
  and warns once in development. The same rule serves tier 3.
- **`select`, `clearSelection`, `setZoom`** are plain reducers and join `commandTable`; `fit`,
  `save` and `addBlock` need the screen (measures) and go through the command context.
- **API report:** a Vitest snapshot of the public types, run with the other tests. No extra tool.

## Left to the builder

File and folder names, the internal shape of the context, how `@stable` is checked, how the demo in
`apps/playground` shows the tiers, and the exact wording of docs and error messages.

## Decisions made

- Three tiers; tiers 1 and 2 first, tier 3 after.
- `useEditor()` in the tree and a controller are two doors to one object; a raw `dispatch` is not
  offered.

## Decided by the owner

Answered on 2026-11-01, as proposed:

1. **Events back to the host** (`onEvent` from `hooks.after`): not in M1. Later, as its own piece.
2. **A `ref` on `<Editor>`**: left out; the controller of tier 3 covers it.
3. **`save()` without `onSave`**: does nothing and resolves `false`.
4. **`data` in the read side**: the page as stored, without a pending draft, as `onChange` gives it.
   `save()` still stores a pending draft first; the docs say so.
5. **`addBlock`** returns the id of the new block, or `null` when nothing was added (the phone
   frame, or no editor attached).
