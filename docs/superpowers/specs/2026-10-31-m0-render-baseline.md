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
