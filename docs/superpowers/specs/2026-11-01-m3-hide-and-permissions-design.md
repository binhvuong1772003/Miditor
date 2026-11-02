# M3: hide and permissions

Design for milestone M3 of `2026-10-31-overrides-and-composition-plan.md`. M0 (store, commands), M1 (the
control API) and M2 (overrides, with fixed place names) are done and merged; M3 builds on them.

## Intent

A host often has people who may not do everything: a viewer who may not change the page, a block owned
by another team that nobody may delete, a plan without access to themes. Today the editor has no way to
say so. M3 adds two things the host controls:

1. **Hide:** parts of the interface that are not drawn.
2. **Permissions:** things that cannot be done, **whatever way they are asked for**: the button, a key,
   the right-click menu, a drag, a typed value, a paste, or a call of the control API (`editor.remove()`).
   A button that is hidden while the Delete key still deletes is a hole; M3 does not leave one.

"User" in this document is the developer who embeds the editor. The people who press the buttons are the
"people".

## Goals

- Five permissions, each a boolean or a function of the block: `canEdit`, `canDelete`, `canDuplicate`,
  `canDrag`, `canAdd`.
- Enforced in one place of the store that every change of the page passes through, so no path is missed
  and a new path added later is covered without remembering.
- The interface follows the permission: buttons are off, handles and typing are off, the menu lines are
  off, and the host is told when something was refused.
- Hide parts of the interface by a typed list of names, with the names of M2 reused.
- A test for each way of changing the page that proves a refused permission refuses it.

## Non-goals

- Security on its own. A permission here stops the editor and the code that drives it. The page data is
  plain JSON and the host's **server must check it again** before storing it. The docs say so first.
- A flag stored on a node (`locked: true` in the page data). A host expresses locking as a function of
  the node it already stores (a prop, a style, an id). Storing flags in `core` belongs to the Layers work.
- Roles, users or login. The host decides what a person may do and gives the editor booleans and functions.
- Hiding _or_ blocking the control API of M1 as a whole; the API is refused only where the change it
  makes is refused.

## Anti-goals

- A permission that only hides a button.
- A refused change that is half done: a change is allowed whole or refused whole.
- Work done on every render to find permissions: they are worked out when a block is selected or a change
  is made, and kept while the block and the settings are the same objects.

## The chokepoint

Every change of the page already ends in one of three functions of `store/document.ts`: `edit`,
`editAndEndDraft` and `editInLastStep` (23 call sites: add, drop, paste, duplicate, group, delete,
reorder, nudge, align, distribute, anchor, typed numbers, gestures, panel patches, page info, theme).
They receive what they need through `Env` (`limit`, `registry`). M3 gives `Env` the host's permissions
and makes these three functions ask before they store:

- They compare the page before and after the change and sort what changed into kinds:
  **added** (a node that was not there), **removed**, **moved** (position, size, rotation, parent or
  place among its siblings changed), **edited** (props or styles other than position changed, or the page's
  own theme and info).
- Each kind is asked of the permission for the node concerned: added → `canAdd(parent, kind)`; removed →
  `canDelete(node)`; moved → `canDrag(node)`; edited → `canEdit(node)`. An edit to the page's own settings
  (title, height, background, theme, fonts) is asked of `canEdit(page root)`.
- **Duplicate** is the one change the comparison cannot tell from an add. The `block.duplicate` command
  (and a paste) says so with an intent that is passed down; a duplicate asks `canDuplicate(original)` and
  not `canAdd`. A paste asks `canAdd`.
- If any answer is no, the function gives the state back as it was and tells the host (`onDenied`). A
  change is never partly done.
- **Undo and redo are never refused.** They only walk back through changes that were allowed.
- If the host gives no permissions, nothing is asked and nothing changes: the same objects, the same
  renders.

This is why the design does not scatter checks over `run`, buttons, keys and gestures: those only ask the
same permission to draw themselves correctly (off buttons, no handles), and the chokepoint is what makes
the rule true.

## The interface follows

Not needed for safety, needed so the editor does not look broken:

- Buttons, menu lines and quick actions for a command are off when `canRun` would say yes but the
  permission says no (`canRun` gets the permission as well).
- A block whose `canDrag` is false shows no resize or turn handles and cannot be dragged.
- A block whose `canEdit` is false has its property fields read-only and cannot be typed on.
- Library cards and the Add button are off when `canAdd` for the page is false.
- When something is refused (a key, a drop), `onDenied` is called and the screen reader hears one short
  announcement.

## The surface

```tsx
<Editor
  permissions={{
    canEdit: (node) => !node.props.locked,
    canDelete: false,
    canDuplicate: true,
    canDrag: (node) => node.id !== "footer",
    canAdd: (parent, kind) => kind !== "Video",
  }}
  hide={["tool.themes", "props.anchors", "header.zoom"]}
  onDenied={({ action, nodeId }) => toast(`Not allowed: ${action}`)}
/>;
```

- `permissions`: each key optional, default `true`; a boolean or a function. Functions are called with the
  node as stored; they must be pure and cheap.
- `hide`: a list of names from one typed union (below). Unknown names are a type error and are ignored with
  a warning at run time.
- `onDenied({ action: "edit" | "delete" | "duplicate" | "drag" | "add", nodeId: string | null })`.
- All of it is `@experimental` in the first release.

### Names that can be hidden

One list, shared with the places of M2 where they overlap. First version:

| Group             | Names                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Places of M2      | `header`, `rail`, `panelStart`, `panelEnd`, `quickActions`, `contextMenu`                           |
| Header parts      | `header.undo`, `header.redo`, `header.frame`, `header.zoom`, `header.save`, `header.status`         |
| Tools             | `tool.blocks`, `tool.layers`, `tool.images`, `tool.themes`                                          |
| Block panel parts | `props.align` (align and distribute), `props.anchors`, `props.phone` (reset to automatic placement) |

Hiding a tool that is open opens the first tool left. Hiding `panelEnd` hides the properties but the
people can still select blocks. Hiding does **not** stop a command; only permissions do.

## Testing

- A property test: for each way of changing the page, with the matching permission off, the state comes
  back unchanged and `onDenied` is told once; with it on, the change happens.
- One test for each path: add by button, drop, paste, duplicate, group, ungroup, delete, reorder, nudge,
  align, distribute, anchor, typed number, drag, resize, turn, move into a parent, panel patch, page info,
  theme colour, theme font, put theme; and the same changes through the control API.
- Undo and redo still work with every permission off.
- e2e in the playground (`?permissions`): the Delete key, the menu line and `editor.remove()` all refuse a
  locked block; a viewer can select and look but nothing changes; hidden parts are absent; a refused
  action shows the host's notice. Also under StrictMode.
- `pnpm perf` numbers stay when no permission is given.

## Left to the builder

How the before/after comparison is written, how permissions are kept while the objects are the same,
the exact wording of announcements and docs, and the final names inside the first list of hideable parts
where the interface needs a name not listed.

## Calls made by the designer

- All-or-nothing: a change that includes any refused part is refused whole.
- Undo and redo are never refused.
- Page settings are governed by `canEdit` of the page root.
- `onDenied` is part of M3 even though events are otherwise a later piece, because a refusal with no
  feedback looks like a bug.
- Locking is the host's function of what it stores; no new flag in the page data.
- Everything is `@experimental` in the first release.

## Open for the owner

Nothing the design cannot settle alone is left. The builder check may add some.
