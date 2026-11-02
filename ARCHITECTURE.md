# Architecture of the editor

How `packages/editor` is put together, and the rules that keep it so. The rules a tool can check are in
`packages/editor/src/architecture.test.ts`.

## One store for each editor

Everything the editor knows lives in one store, made when `<Editor>` mounts and handed down through
React context. Two editors on one page share nothing. The store library (zustand) is used only inside
`src/store/` and is bundled into the package.

The state has three parts, in `store/state.ts`:

- **Document:** the page (`history`, with undo and redo), the colour or value being picked (`draft`),
  the page as it was last saved.
- **Selection:** the selected block, the ones picked with it, the block being typed on, the hover.
- **View:** zoom, the frame (desktop or phone), the open tool, the panel, what a screen reader is told.

Save does not include the selection or the view.

## Commands

A change to the state is a pure function `(state, args, env) => state`. When it changes nothing it
returns the very same object, so nothing draws again.

The commands a person can give by key, menu, button or toolbar are in a table, `store/commands.ts`:
`history.undo`, `history.redo`, `block.duplicate`, `block.delete`, `block.group`, `block.ungroup`,
`block.reorder`, `view.zoom`, `view.frame`, `tool.pick`. `run(name, args)` is the one door to them. It
finds the command, calls `hooks.before` (a `false` blocks the command), changes the state, then calls
`hooks.after`. The hooks are not offered to the host yet; they are where the host events (M1) and the
host's rules (M3) will go.

`canRun(state, name, args)` says whether a button or a menu line is on. It is for the screen only:
`run` does not ask it.

What does not go through `run`: Tab, Esc and Enter, the arrow keys that nudge, copy, cut and paste,
Save, adding a block, fit, and the gestures (drag, resize, turn). They use the commands of the document,
selection and view directly (`useDocumentCommands`, `useSelectionCommands`, `useViewCommands`).

Keys are read by `keymap.ts`: `matchKey(event, selectedId)` names the command, and the caller runs it.

## Control API

What a host can read and do from its own code (`control.ts`, `control-api.ts`, `control-context.tsx`).
Its types are the public surface and are kept in snapshots by `public-surface.test.ts`.

- `EditorBody` builds the control object (`createApi`) from the same `run`, `save`, add-block and fit
  that the buttons use, so a host call and a button cannot differ. It is made once, its identity does
  not change between renders, and it is given to the parts through `ControlProvider`.
- `useEditor()` returns that object. `useEditor(selector)` gives the selector an `EditorView` (`viewOf`,
  a pure function of the state) through the store hook, so a part is drawn again only when its
  selected value changes.
- The host's side of the header (the `status` prop, whether `onSave` exists) lives in the store, put
  there by `useHostSync` in `Editor.tsx`, so `status` is read like the rest.
- A command called after the editor unmounted does nothing and warns once. A command that cannot run
  returns `false`; the check is `canRun`, the same one the buttons use.
- `hooks.before` and `hooks.after` cover the commands of the table only. `save`, `addBlock` and `fit`
  need the screen and do not go through them.
- The store is never handed out, and there is no raw `dispatch`.
- The controller (`controller.ts`) is the same API for a host outside the tree. It holds the control
  object and the store of the editor attached to it, forwards commands to that control object, and
  answers with `false` (and one warning) when there is none. `useEditor(controller, selector)` follows
  it with `useSyncExternalStore`, and gives the idle view while nothing is attached. Attaching
  (`attachController`) is internal and not exported; the editor still makes its own store, and the
  controller only points at it.

## Overrides

What a host can wrap or replace (`overrides.tsx`, the `overrides` prop of `<Editor>`). Its types are in
the surface snapshot.

- One context, `OverridesContext`, holds the host's `overrides`. `Editor.tsx` provides it.
- `OverrideSlot` is a place. It looks its name up in the context: with no entry it draws its
  `children`, the editor's own part, and nothing else, so a host with no `overrides` pays one lookup.
  With an entry it draws the host's component with `editor`, the props of the place and the same
  `children`.
- `OverrideBoundary` wraps the host's component. If it throws, the editor's own part is drawn outside
  the boundary and one error names the place; it tries the host's component again when the entry changes.
- `applyContextMenu` is the same for the menu, which is data and not a component: the host's function is
  called in a try/catch each time the menu opens, and a throw or a bad result gives the default lines.
- The parts wrap themselves (`Toolbar`, `Rail`, `StartPanel`, `EndPanel`, the property inputs), so
  `Editor.tsx` only draws the quick actions and the menu through the slot and `applyContextMenu`.
- The place names are written once, in `ComponentOverrides` and `Overrides`; hiding a part (M3) uses the
  same names.

## Permissions

What a host lets people do (`store/permissions.ts`, the `permissions` and `onDenied` props). Its types
are in the surface snapshot.

- Every change of the page ends in one of three functions of `store/document.ts`: `edit`,
  `editAndEndDraft` and `editInLastStep`. Each makes the next page, then asks `guard(before, after,
  permissions, intent)` before it stores anything. `guard` sorts the change into added, removed, moved
  and edited blocks and asks the permission for each; with no permissions it does nothing and the same
  objects come back.
- A refusal is told to the host (`Env.denied`, through `coalesced`, so a held key is told once) and marked
  in `Env.refusal`. `runner` reads the mark and gives the command up whole: the state comes back as it
  was, with the panel draft ended when it was the panel's change that was refused. `createRun` returns
  `false` for such a command, and so does the control API.
- Undo and redo (`step`) and Save do not ask `guard`.
- **Why not check in the buttons, keys and gestures.** There are many paths (23 call sites) and a new one
  would be a hole until someone remembered it. One place that every change must pass is true for all of
  them, now and later. The interface only asks the same permissions (`permissions-context.tsx`, `canRun`)
  so it can draw itself off; that is looks, not safety.
- **Hide** (`hide.tsx`) is a different thing: a context that holds the names to hide. The parts read it
  with `useHidden(name)` when they draw, and `OverrideSlot` reads it for the places. Hiding never
  reaches the store, so it never stops a command.

## The screen

`Editor.tsx` holds the pieces together and owns what they share: the keyboard handler of the root, the
clipboard and the few canvas elements other parts need (see [Composition](#composition)). The parts read
the store themselves:

| Part                  | Draws                                                      |
| --------------------- | ---------------------------------------------------------- |
| `Toolbar`             | undo, redo, frame, zoom, save                              |
| `Rail`                | the tool buttons                                           |
| `StartPanel`          | blocks, layers, images, themes                             |
| `EndPanel`            | the page settings, or the properties of the selected block |
| `canvas/CanvasView`   | the canvas: the page and everything drawn over it          |
| `canvas/StagePage`    | the page, scaled by the zoom                               |
| `canvas/SelectionBox` | the handles of the selected block                          |

Behaviour of the canvas is in hooks, in `src/canvas/`:

| Hook            | Does                                                   |
| --------------- | ------------------------------------------------------ |
| `useGestures`   | drag, resize and turn, and the hints while they are on |
| `usePointer`    | press, hover, right press, double press, the box drag  |
| `useBlockMarks` | the outlines put on the blocks `<Render>` made         |
| `useStageSize`  | the wheel zoom and the size of the room the page has   |
| `useAltHeld`    | whether Alt is held                                    |

The overlays of the canvas (name tags, quick actions, the edge of the page, the frame of a group, the
menu, the marquee) are drawn by `canvas/CanvasView.tsx`.

## Composition

A host can place the parts itself (`parts.tsx`, `shell.tsx`; the types are in the surface snapshot).

- `EditorProvider` (in `Editor.tsx`) holds the state, the hooks, the keys, the clipboard and the one root
  element that has the appearance variables, `lang` and `data-miditor-editor`. It draws the host's
  children inside that root.
- The shell is an object the provider builds on each render and gives through `ShellContext`. It holds
  the props each part is drawn with. A part reads it with `useShell(name)`, which throws outside a
  provider. A part draws when it drew before the split.
- The canvas holds its own state: gestures, pointer, marks, the context menu, the labels. The provider
  keeps only what other parts read: the workspace, the selected block's element and the measures of the
  stage. Two functions are not state, because nothing draws from them: `gesturing` (the keys ask whether
  a gesture is on) and `dropHint` (the library drag sets the hint). The canvas registers both while it is
  mounted and clears them when it unmounts. This is why a drag, a hover and the menu no longer redraw the
  provider or the other parts.
- One canvas is mounted at a time (`canvasClaim` in the shell). Without one the handle is empty and what
  needs it does nothing.
- The default layout is the old grid built from the same parts (`DefaultLayout`), marked with
  `data-layout="default"`; the grid rules in `Editor.module.css` apply only under it.

## Rules

- The store library is imported only in `store/`.
- The store is changed only by its own commands: `store.setState` is called only in `store/`.
- `store/` does not draw: only `context.tsx` uses React, and nothing there imports a component or CSS.
- `canvas/` does not import `Editor.tsx`.
- `overrides.tsx` does not import `Editor.tsx`: the parts use the slot, not the other way round.
- A command returns the same state when it does nothing.
- The guard lives in `store/` and is the only place that decides a refusal.

## Checking a change

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e                 # E2E_STRICT=1 pnpm e2e also runs it in React StrictMode
cd apps/playground && pnpm exec vite --port 5199 --strictPort   # in another terminal
pnpm perf                # how many times the parts draw while typing and dragging
```

`docs/superpowers/specs/2026-10-31-m0-render-baseline.md` has the numbers to keep.
