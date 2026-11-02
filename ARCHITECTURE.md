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
Save, adding a block, and the gestures (drag, resize, turn). They use the commands of the document,
selection and view directly (`useDocumentCommands`, `useSelectionCommands`, `useViewCommands`).

Keys are read by `keymap.ts`: `matchKey(event, selectedId)` names the command, and the caller runs it.

## The screen

`Editor.tsx` holds the pieces together and owns what they share: the elements of the canvas
(`workspace`, the selected block), the keyboard handler of the root and the clipboard. The parts read the
store themselves:

| Part                  | Draws                                                      |
| --------------------- | ---------------------------------------------------------- |
| `Toolbar`             | undo, redo, frame, zoom, save                              |
| `Rail`                | the tool buttons                                           |
| `StartPanel`          | blocks, layers, images, themes                             |
| `EndPanel`            | the page settings, or the properties of the selected block |
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

The overlays of the canvas (name tags, quick actions, the edge of the page, the frame of a group) stay
in `Editor.tsx`: they read `workspace`, `block` and the gesture, which the toolbar, the Tab key, paste
and the library drop use too.

## Rules

- The store library is imported only in `store/`.
- The store is changed only by its own commands: `store.setState` is called only in `store/`.
- `store/` does not draw: only `context.tsx` uses React, and nothing there imports a component or CSS.
- `canvas/` does not import `Editor.tsx`.
- A command returns the same state when it does nothing.

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
