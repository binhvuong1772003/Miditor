# M0 phase 5: where each command is called today

Read before the command table. `Editor.tsx` line numbers are from `2b5bc7b`.

## Commands that go into the table

| Command | Keyboard | Menu | QuickActions | Toolbar / rail | Guard today | Side effect in the component |
|---|---|---|---|---|---|---|
| `history.undo` / `history.redo` | Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y | | | Undo/Redo buttons (`disabled` from `canUndo/canRedo`) | none | none |
| `block.duplicate` | Ctrl/Cmd+D | yes | yes | | store: no-op on phone, without a selection | `note.current = a11y.duplicated`, `parentSize()` measured from the DOM |
| `block.delete` | Delete, Backspace (needs `selectedId`) | yes | yes | | `onPhone` returns first; store no-op for the root | `note.current = a11y.deleted` (set only when not on phone) |
| `block.group` / `block.ungroup` | Ctrl/Cmd+G, Ctrl/Cmd+Shift+G | yes | yes | | store: no-op on phone | `parentSize()` |
| `block.reorder` (forward, backward, front, back) | | yes | yes | | store: no-op on phone, root | none |
| `view.zoom` (in, out, reset) | Ctrl/Cmd + `=` `+` `-` `0` | | | zoom buttons (`disabled` at MIN/MAX_ZOOM) | none | none |
| `view.fit` | | | | Fit button | none | needs a workspace measure (`fitZoom(...)`) |
| `view.frame` | | | | desktop/phone buttons | none | none |
| `tool.pick` | | | | rail buttons | none | none |

`block.nudge` (arrows) reads `lastNudge` (a ref that merges presses) and `event.timeStamp`. It stays in the
component for now; only its call to `documents.nudgeSelected` is already a command.

## Not in the table (DOM or focus bound, phase 6)

Tab, Escape, Enter (into text / into a group), gestures, marquee, copy / cut / paste events (clipboard
events, not keys), add block (three measured sizes and the `a11y.added` note), save.

## Facts the design depends on

- The store already guards the phone (`state.frame === "phone"`) inside the structure commands, so
  `enabled` can read the same state and agree with them. `onPhone` is therefore not a context value.
- `note.current` (the screen reader text joined to the next selection announcement) lives in the
  component. A command needs a `ctx.note(text)` callback to keep it.
- `parentSize()` comes from the DOM. The context gets it as `ctx.parentSize()`.
- Old quirk: the note is set even when the command then does nothing (Ctrl+D with nothing selected).
  With `enabled` checked first the note is no longer set in that case. This is the one intentional
  difference; it only changes what a screen reader says on the next selection.
- Keyboard order matters: the Ctrl+Shift+Z / Ctrl+Y redo test comes before plain Ctrl+Z, and the zoom
  keys come before the lower-cased `d`, `g`, `z` tests.
