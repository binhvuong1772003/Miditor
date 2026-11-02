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
| End of M0 (phases 6 and 7)       | 284.14 kB | 74.73 kB |
| M1a, the control API             | 290.81 kB | 76.28 kB |
| M1b, the controller              | 293.46 kB | 77.19 kB |

## Lines of `Editor.tsx`

| Moment    | Lines |
| --------- | ----- |
| Before M0 | 2554  |
| Phase 2   | 2576  |
| Phase 3   | 2548  |
| Phase 4   | 2152  |
| Phase 5   | 2128  |
| Phase 6   | 1086  |
| Phase 7   | 1078  |

Phase 2 moves state, it does not remove code: the lines go down from phase 4 on, when the commands
leave the component. The goal of 2300 lines at the end of phase 2 in the first plan was too early.

Phase 4 took 22 functions that changed the page out of the component into pure commands, 3105 lines
of `store/` (more than half of it tests), and the lines of `Editor.tsx` went down by about 400. What is
left in it is the measuring of the screen, the gestures and the JSX, which phase 6 splits into parts.
The estimate of 1500 lines at the end of phase 4 in the first plan was too low for the same reason.

Phase 5 put ten commands under names (`store/commands.ts`), one door `run(name, args)`, and the keys as
data (`keymap.ts`). Render counts did not change in the two moments `pnpm perf` measures (type 5 chars 2, drag 15); add
and select were not measured again, the e2e perf spec only checks that the parts draw. The only code that is smaller is the wrappers in `Editor.tsx`; the gain is a single place
for a rule or a message to the host, which M1 and M3 use.

## End of M0: renders, measured again

`pnpm perf` now measures five moments (the pause before "select block" comes from the new
"hover block" step). Same script, run on the commit before the store (`906943d`) and on the end of M0:

| Moment       | Before the store | End of M0 |
| ------------ | ---------------- | --------- |
| add Text     | 2                | 2         |
| type 5 chars | 2                | 2         |
| drag 100px   | 15               | 15        |
| select none  | 4                | 4         |
| hover block  | 3                | 3         |
| select block | 4                | 4         |

Every part commits the same number of times in each moment (canvas, blocks, selection, properties,
editor), so the store did not add renders to the editor.

One thing to know when reading the script: if "select block" is run as one instant click (the mouse
moves onto the block and presses in the same moment), the end of M0 shows 5 and the old code 4. The fifth
commit is the hover that the old code merged into the press; it came with phase 3, when the hover moved
into the store, whose updates are rendered at once. With a pause between the move and the press, as a
person has, both give the same numbers above.

Phase 6 split `Editor.tsx` into `Toolbar`, `Rail`, `StartPanel`, `EndPanel`, `canvas/StagePage`,
`canvas/Marquee` and five hooks in `canvas/` (1086 lines left, from 2127). The overlays of the canvas
stay in it: they share the canvas elements with the toolbar, the Tab key, paste and the library drop.

## M1a: renders, measured again

After the control API (`useEditor`, the host status in the store), `pnpm perf` gives the same numbers as
the end of M0 in all six moments (add Text 2, type 5 chars 2, drag 100px 15, select none 4, hover block 3,
select block 4). A host part that reads `useEditor((view) => view.canUndo)` is drawn again only when
that value changes (`e2e/control.spec.ts` counts its renders).

## M1b: renders

The `controller` prop adds no state to the store and no render to editors that do not use it: an
editor given no controller does not touch the controller code. `pnpm perf` gives the same numbers as
after M1a in all six moments (add Text 2, type 5 chars 2, drag 100px 15, select none 4, hover block 3,
select block 4).

Under StrictMode an editor that is refused a controller logs its error twice for one editor, because
React mounts it, lets go and mounts it again. The first editor is not affected.
