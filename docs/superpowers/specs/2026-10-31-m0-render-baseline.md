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
| Phase 3, selection in the store  | 263.07 kB | 68.86 kB |
| Phase 4, document and commands   | 277.04 kB | 72.41 kB |
| Phase 5, command table and keys  | 280.74 kB | 73.60 kB |

## Lines of `Editor.tsx`

| Moment    | Lines |
| --------- | ----- |
| Before M0 | 2554  |
| Phase 2   | 2576  |
| Phase 3   | 2548  |
| Phase 4   | 2152  |
| Phase 5   | 2128  |

Phase 2 moves state, it does not remove code: the lines go down from phase 4 on, when the commands
leave the component. The goal of 2300 lines at the end of phase 2 in the first plan was too early.

Phase 4 took 22 functions that changed the page out of the component into pure commands, 3105 lines
of `store/` (more than half of it tests), and the lines of `Editor.tsx` went down by about 400. What is
left in it is the measuring of the screen, the gestures and the JSX, which phase 6 splits into parts.
The estimate of 1500 lines at the end of phase 4 in the first plan was too low for the same reason.

Phase 5 put ten commands under names (`store/commands.ts`), one door `run(name, args)`, and the keys as
data (`keymap.ts`). Render counts did not change (type 5 chars 2, drag 15; add and select in the e2e
perf spec). The only code that is smaller is the wrappers in `Editor.tsx`; the gain is a single place
for a rule or a message to the host, which M1 and M3 use.
