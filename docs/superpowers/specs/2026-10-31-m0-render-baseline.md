# M0 render baseline

Taken before the store refactor, with `?perf` on the playground (`pnpm perf`). Each number is how
many times that part of the editor committed during the action. M0 phase 7 measures again and
compares.

| Action                            | editor | canvas | blocks | selection | properties |
| --------------------------------- | ------ | ------ | ------ | --------- | ---------- |
| Add a Text block (one click)      | 2      | 2      | 2      | 2         | 2          |
| Select another block (one click)  | 4      | 4      | 4      | 4         | 4          |
| Type 5 characters in a text field | 2      | 2      | 2      | 2         | 2          |
| Drag a block 100 px (10 moves)    | 15     | 15     | 15     | 15        | 15         |

Every part commits as often as the editor does: nothing is skipped, so a drag redraws the Blocks
panel and the properties as much as the canvas. The target after M0 is that typing redraws only the
properties, a selection change only Layers, properties and the selection box, and a drag only the
canvas.

## Package size

`packages/editor/dist/index.mjs`, raw and gzip.

| Moment                           | raw       | gzip     |
| -------------------------------- | --------- | -------- |
| Before the store                 | 253.86 kB | 66.15 kB |
| Phase 1, with zustand bundled in | 255.54 kB | 66.71 kB |
| Phase 2, view state in the store | 258.75 kB | 67.73 kB |
| Phase 3, selection in the store | 263.07 kB | 68.86 kB |

## Lines of `Editor.tsx`

| Moment    | Lines |
| --------- | ----- |
| Before M0 | 2554  |
| Phase 2   | 2576  |

Phase 2 moves state, it does not remove code: the lines go down from phase 4 on, when the commands
leave the component. The goal of 2300 lines at the end of phase 2 in the first plan was too early.
