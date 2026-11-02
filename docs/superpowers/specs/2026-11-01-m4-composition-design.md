# M4: composition

Design for milestone M4 of `2026-10-31-overrides-and-composition-plan.md`. M0 to M3 are done and merged.

## Intent

With M2 a host can wrap or replace a part, but the parts stay where the editor puts them: a fixed grid of a
header, a rail, a left panel, the canvas and a right panel. A host that wants the Layers panel on the right,
the properties in a dialog, the rail along the bottom, or the editor inside a card of its own page cannot do
it. M4 lets the host **lay the parts out itself**: the editor is split into parts that can be placed anywhere
inside a provider, and `<Editor />` with no children is the same default layout, built from the same parts.

"User" is the developer who embeds the editor.

## Goals

- `<EditorProvider>` takes the props `<Editor>` takes (data, config, permissions, overrides, hide, controller,
  appearance, i18n...) and the host's children; the children place the parts.
- Parts, each usable once or more, anywhere under the provider: `Editor.Header`, `Editor.Rail`,
  `Editor.Blocks`, `Editor.Layers`, `Editor.Images`, `Editor.Themes`, `Editor.StartPanel` (the panel the
  rail chooses), `Editor.Canvas`, `Editor.Properties`.
- `<Editor />` with no children keeps its look, behaviour and render counts, and draws the parts in the old
  grid.
- Keys, copy and paste, the CSS variables of the appearance, the language and everything of M1 to M3
  (`useEditor`, overrides, permissions, hide) work the same whatever the layout.
- A host may leave a part out: the editor works without a rail, without a header, without the properties.

## Non-goals

- Replacing the canvas's insides (handles, gestures, zoom): the canvas is a part to place, not to rebuild.
- Responsive rules of the host's own layout: the host's shell decides its own sizes and breakpoints.
- Making a part work outside a provider.
- Changing M2's override names or M3's hide names; the parts keep drawing their slots.

## Anti-goals

- A second copy of the editor's state or logic for the parts: they read the provider's one source.
- More renders of `<Editor />` than today, or a part that draws more often than it did.
- A layout that works only with the grid CSS of the default.

## The provider and the shell

Today `EditorBody` holds the state and the hooks (store commands, selection, gestures, keys, clipboard) and also
draws the grid. M4 splits those two jobs:

- **`EditorProvider`** keeps everything `EditorBody` does except drawing the grid. It draws one root element
  (the one that has the appearance variables, `lang`, the keys, copy, cut and paste, and `data-miditor-editor`)
  around the host's children, and gives the parts one context value, the **shell**.
- **The shell** is a plain object rebuilt on each render of the provider. It holds what the parts need that is
  not already in the store or in the existing contexts (`TContext`, `IconsContext`, the control API, overrides,
  hide, permissions): the registry and its display form, the document, selection and view commands, `run`,
  the host's `logo`, `headerStart`, `headerActions`, `status`, `onSave`, `config`, and the canvas handle below.
  Because the provider already re-draws on each change today and passes everything down, a part that reads the
  shell draws exactly when it drew before.
- **The canvas handle** is what the parts that are not the canvas need from it: the scrolling workspace element,
  the element of the selected block, the measures of the stage, the drag-hint setter, and the "a gesture is on"
  flag the keys look at. The canvas part fills it (the workspace element is state, set when the canvas mounts, as
  it is today). Without a canvas the handle is empty: adding a block uses zero sizes, Fit does nothing, and
  properties that need the page's drawn height show 0.

## The parts

| Part                                          | Is today                                                                                        | Notes                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Editor.Header`                               | `Toolbar`                                                                                       | Reads the host's header props from the shell; `header` and `headerActions` slots stay |
| `Editor.Rail`                                 | `Rail`                                                                                          | Needs the shell's `run`                                                               |
| `Editor.StartPanel`                           | `StartPanel`                                                                                    | The panel of the tool the rail chose                                                  |
| `Editor.Blocks`, `Layers`, `Images`, `Themes` | the four panels inside `StartPanel`                                                             | New: usable directly, whatever tool is chosen                                         |
| `Editor.Canvas`                               | the `<section>` with the page, labels, quick actions, selection box, menu, marquee, inline edit | Owns the canvas state; fills the handle                                               |
| `Editor.Properties`                           | `EndPanel`                                                                                      | Page settings or the block's properties                                               |
- A part drawn twice (two Layers panels) is allowed except `Canvas`, which must be drawn at most once under a
  provider: a second one logs an error and draws nothing.
- Each part keeps its M2 slot and M3 hide name (`panelStart` for `StartPanel`; the four tool panels draw the
  `panelStart` slot too when drawn on their own; this is the one place a slot is shared).
- Parts are static members of `Editor` (`Editor.Header`) and are also exported by name (`EditorHeader`) for hosts
  that avoid static members; the surface snapshot covers both.

## The default layout

`<Editor {...props} />` without children is `<EditorProvider {...props} layout="default">` and, inside, the old
grid: header, rail, start panel, canvas, properties. The root element gets `data-layout="default"`; the grid and
the narrow-screen rules of `Editor.module.css` apply only under that attribute, so a custom layout is not hit
by them. With children and no `layout`, the root is a plain block element with the appearance variables, sized by
the host (`block-size: 100%` is left to the host; the docs say so).

## Safety and accessibility

- The default layout keeps its landmarks and `aria-label`s. A custom layout is the host's: the README lists which
  roles the parts bring (header is a `<header>`, rail a `<nav>`, panels `<aside>`, canvas a labelled region) and
  what the host keeps (one canvas, reachable by keyboard).
- A part outside a provider throws a clear error, like `useEditor`.
- A second `Canvas` is refused with one error and draws nothing; the first keeps working.

## Performance

No moment of `pnpm perf` may count more commits than today, for `<Editor />` or for a custom layout that draws all
parts; a count may go down once the canvas keeps its own state (see "Settled after the builder check").

## Testing

- Unit: each part draws the same markup inside `<Editor />` as before (compare with the markup of the current
  parts); a part outside a provider throws; a second canvas is refused; a layout without a canvas still adds a
  block and does not throw; the four tool panels work without a rail.
- e2e in the playground (`?compose`): a custom layout (Layers on the right, properties in a dialog, rail along the
  bottom) where selecting, adding, dragging, undo, the keys and the context menu work; a layout without a header;
  two providers on one page keep their own state; `<Editor />` default unchanged (the whole existing suite).
  Also under StrictMode.
- The architecture test and surface snapshots keep passing, updated for the new names.

## Left to the builder

How the shell is typed and built, how the canvas handle is shared (refs, state), the file layout of the parts,
the CSS split between the root and the default layout, and docs wording.

## Calls made by the designer

- Parts are context readers; the provider keeps the state (no state moves into the parts except the canvas's own).
- `Canvas` at most once; every other part any number of times.
- Static members and named exports for each part.
- Without a canvas the handle is empty and the dependent behaviour degrades quietly (zero sizes, no Fit).
- The CSS grid is bound to `data-layout="default"`.
- Everything new is `@experimental` in the first release.

## Settled after the builder check

Questions a fresh reader asked; each is the designer's call and can be changed.

- **What the other parts read of the canvas, and how.** The elements and measures that other parts need are
  **state of the provider**, filled by the canvas: the workspace element (when the canvas mounts), the
  selected block's element (when the selection or the render changes), and the stage measures. They are what
  `EditorBody` holds as state today, and they change at the same moments, so the parts that read them draw
  when they drew before. What only the canvas needs stays inside the canvas: dragging, the measure hints, the
  drop hint, the marquee, the menu position, whether Alt is held, the labels. The few things another part
  needs from that inner state are **registered by the canvas as functions** in a non-reactive part of the
  handle, read on demand: `gesturing()` for the keys, and `setDropHint(id)` for the library drag. A value the
  properties panel shows is derived from the stored page and the elements, not from a drag in progress, so it
  does not update during a drag today and need not after. Consequence for the tests: a part may draw **less**
  often than today (moves of a drag no longer redraw the provider's other parts) and **never more**; the perf
  rule is "no moment's count rises".
- **Hide and the panel being open.** A hidden tool is hidden everywhere: `hide: ["tool.layers"]` removes the
  rail button and also `Editor.Layers` drawn on its own. `Editor.StartPanel` follows `panelOpen` only in the
  default layout (the root keeps `data-panel`, and the grid CSS under `data-layout="default"` collapses it); a
  panel placed by the host is drawn whatever `panelOpen` says. The four tool panels ignore `panelOpen`.
- **Portals.** The appearance variables, `lang` and the key handlers are on the provider's root. React events
  bubble through portals, so keys and copy/paste work in a portal; the variables and `lang` do not. The
  provider offers `useEditorRoot(): HTMLElement | null` so a host can `createPortal(dialog, root)` and keep the
  look. The README says to use it for dialogs.
- **Keys and effects stay with the provider** (announcements, `note`, `heard`, the nudge memory, focus return to
  the root). They read the handle. With no canvas, the keys that need a container (nudge, group, ungroup,
  duplicate) do nothing, because the commands already refuse a missing container; Tab, Esc, Enter-to-edit and
  undo work as they only need the store.
- **Mounting and unmounting the canvas.** The handle is cleared when the canvas unmounts. "At most one" counts
  the canvases that are mounted now, so a canvas in a closing dialog may be mounted again later and
  StrictMode's mount, unmount, mount is fine.
- **Dialogs that close.** The selection, the history and a pending draft are in the store, so closing a
  properties dialog loses nothing; only the panel's own tab choice (Design or Advanced) starts again.

## Order of work

The change is large, so it goes in steps that each leave `<Editor />` as it was:
1. Provider and shell, with the panel parts reading the shell (the canvas still draws from the provider).
2. The canvas as a part reading the shell, the public names, the layout attribute and the CSS split.
3. Moving the canvas-only state into the canvas part with the handle. This is the step that can change counts,
   and the one with the render check.

## Open for the owner

Nothing the design cannot settle alone is left.
