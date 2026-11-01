# M0 phase 6.1: what each part of Editor.tsx needs

`EditorBody` in `packages/editor/src/Editor.tsx` (2127 lines). The JSX starts at line 1531 and has five regions.
This lists what each region reads and calls, so each part can be taken out without guessing.

| Region | Lines | From the store | From props or config | Still from the body (handler, ref, local state) |
| --- | --- | --- | --- | --- |
| Toolbar `header` | 1651-1775 | `frame`, `zoom`, `draft`, `history.present`, `history`, `selectedId`, `picked`, `tool` (via `canState`) | `logo`, `headerStart`, `headerActions`, `status`, `onSave`, `registry` | `run`, `documents.save`, `viewing.setZoom`, `workspace` (element), `stageBox`, `headerStatus` |
| Rail `nav` | 1776-1797 | `tool`, `panelOpen` | none | `run` |
| Left panel `aside` | 1798-1865 | `tool`, `history.present`, `selectedId`, `picked`, `hoverId`, `frame` | `config` (images, themes, `uploadImage`, theme save/rename/delete) | `pickFromLayers`, `addPicture`, `addLibraryImage`, `chooser` ref, `adding`, `addBlockOf`, `dragFromLibrary`, `dropFromLibrary`, `documents.putTheme`, `shownRegistry` |
| Stage `section` | 1866-2072 | most of the view state, `draft`, `editing`, `scopeId` | `config`, `registry` | all gestures: `press`, `enter`, `hover`, `gesture`, `groupGesture`, `pendingDrag`, `dragControls`, `measure`, `marquee`, `menuAt`, `dropId`, `block`, `frameEl`, `altHeld` |
| Right panel `aside` | 2073-2125 | `frame`, `picked`, `draft`, `history.present` | `config` (actions, `uploadImage`, fonts) | `changeMeta`, `commitPatch`, `setDraft`, `resetPhone`, `alignSelected`, `distributeSelected`, `changeAnchor`, `setRect`, theme colour and font commands |

## What this means for the order

1. **Toolbar and Rail** need only `run`, a few store fields and one handler (`documents.save`, `viewing.setZoom`). They can leave first and be nearly props-free.
2. **Panels** read the store for the data, but call handlers that close over body refs (`addBlockOf` uses `landingFor` and `parentSize`). The handlers move to hooks next to the panel that uses them, or stay and are passed as a few props. Decide per panel.
3. **Stage** shares refs with the keyboard handler on the root (`gesture.current` is read in `onKeyDown`) and with the toolbar (`workspace`, `stageBox`). Those three refs get one owner before the gestures move.

## Shared refs and who owns them

| Ref | Written by | Read by | Owner after the split |
| --- | --- | --- | --- |
| `workspace` (element) | Stage `ref` | Toolbar Fit, Tab key, many layout effects | Stage, passed up through a context or callback |
| `stageBox` | layout effect (size observer) | Toolbar Fit | Stage, exposed through the same channel |
| `gesture` | gesture starts and ends | root `onKeyDown` (stops keys during a drag) | Gestures hook; the root asks `isGesturing()` |
| `note` | `run` context | announce effect | stays in `Editor` |
| `lastNudge` | root `onKeyDown` | root `onKeyDown` | stays in `Editor` |
