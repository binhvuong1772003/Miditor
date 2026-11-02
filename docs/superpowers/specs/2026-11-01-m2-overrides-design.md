# M2: overrides

Design for milestone M2 of `2026-10-31-overrides-and-composition-plan.md`. M0 (store, commands) and M1
(the control API, `useEditor`, the controller) are done and merged; M2 builds on them.

## Intent

A host can put its own content _into_ three places of the editor (`logo`, `headerStart`,
`headerActions`) and nowhere else. It cannot wrap the header in its own bar, replace the buttons of the
rail, change the panels, add a line to the right-click menu, or give one property its own input. M2
adds an `overrides` prop: a fixed list of named places, each of which the host can **wrap** (keep the
editor's own part and put something around or next to it) or **replace** (draw its own).

"User" here is the developer who embeds the editor.

## Goals

- A host changes any of the places below with an ordinary React component, and gets `editor` (the
  control object of M1) to drive the editor from it.
- Wrap is the easy path: each override receives the editor's own part as `children`.
- A host that gives no `overrides` sees no change, in code or in renders.
- A mistake in the host's component does not kill the editor.
- The names of the places are fixed, typed and written once. M3 uses the same names to hide parts.

## Non-goals

- Hiding a part or blocking a command (M3); the names are shared, the behaviour is not.
- Adding a tool to the rail with its own panel (M5), or laying the parts out as the host likes (M4).
- Changing the page's own settings fields (title, height, background, colours, fonts); only the
  property fields of a block.
- Per-block or per-instance rules that change while the editor is open: `overrides` is read on each
  render, like any prop, and that is all.

## Anti-goals

- A second way to name things. Overrides, hiding (M3) and permissions use the same place names.
- Slowing a host that overrides nothing: the default part is drawn as it is today.
- A host component that has to know the editor's insides (the store, `run`, CSS module names).

## The places

Eight, in two slices. Names are the ones M3 will use to hide.

| Name            | Is                                                                 | The host's component receives                                                     |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `header`        | The whole bar at the top                                           | `{ editor, children }`; `children` is the editor's bar                            |
| `headerActions` | The right end of the bar: the host's `headerActions` prop and Save | `{ editor, children }`                                                            |
| `field`         | The input of one property of a block (not the page's settings)     | `{ editor, name, field, value, onChange, nodeId, children }`                      |
| `rail`          | The tool buttons beside the left panel                             | `{ editor, tools, children }`; `tools` lists `{ id, name, icon, active, pick() }` |
| `panelStart`    | The left panel (blocks, layers, images, themes)                    | `{ editor, tool, children }`                                                      |
| `panelEnd`      | The right panel (page settings, or the properties of the block)    | `{ editor, children }`                                                            |
| `quickActions`  | The row of buttons under the selected block                        | `{ editor, children }`                                                            |
| `contextMenu`   | The lines of the right-click menu                                  | a function: `({ editor, items }) => items`                                        |
- **Slice one:** `header`, `headerActions`, `field`. **Slice two:** the other five. Each slice ends with
  a working build, so slice one can be used before slice two exists.
- `editor` is the `EditorApi` of M1. A host that wants to read state uses `useEditor(selector)` inside
  its component: overrides are drawn inside the editor's context.
- Wrapping: `header: ({ children }) => <MyBar>{children}</MyBar>`. Replacing: ignore `children`.
- `contextMenu` is a function, not a component, because a menu is data: the host returns the list it
  wants (add a line, drop one, reorder). `ContextMenuItem` is exported for it.
- `field` receives `children`, the editor's own input, so a host replaces only the properties it
  cares about: `field: ({ name, children }) => (name === "href" ? <PagePicker /> : children)`.

## Safety

- Each override is drawn inside an error boundary. If the host's component throws while drawing, the
  editor's own part is drawn instead and one `console.error` says which place failed. The rest of the
  editor goes on. (A throw inside an event handler of the host is the host's own, as everywhere in React.)
- `contextMenu` is called in a try/catch: if it throws or returns something that is not a list of
  items, the menu is the default one and one error is logged.
- The accessibility contract of each part is written down in the README: what a replacement must keep
  (the name of the region, keyboard reach, focus return for the menu and Esc to close it).

## Stability

All of `overrides` is `@experimental` in the first release, as Puck's is. The type of each override's
props is part of the public surface and goes in the surface snapshot.

## Performance

A place without an override draws what it does today; the check is one lookup in the `overrides`
object. A host should keep `overrides` stable (module level or `useMemo`); the docs say so. `pnpm perf`
numbers stay.

## Testing

- Unit: the slot draws the default when there is no override, `children` for a wrapper, and nothing
  of the default when the override ignores `children`; the boundary draws the default when the
  override throws; `contextMenu` falls back on a throw and on a bad return; each override receives
  the props in the table.
- e2e in the playground (`?overrides`): a host bar around the header that still has Undo working;
  a replaced rail; a wrapped panel; a line added to the menu that runs; a `field` replaced for one
  property and not for the others; a component that throws shows the default and logs one error.
  Also under StrictMode.
- The architecture test and the surface snapshot keep passing, with the snapshot updated.

## Left to the builder

File and folder names, how the slot component and the boundary are built, how the default part is
made lazily, and the exact wording of docs and messages.

## Calls made by the designer

- All existing props (`logo`, `headerStart`, `headerActions`, `config.*`) stay and work as before;
  overrides come on top. `headerActions` as an override wraps what the prop and Save draw.
- The names above are final for M2; adding a place later is a new name, not a change.
- `field` covers the properties of the selected block only.
- Overrides are experimental in the first release.

## Open for the owner

Nothing the design cannot settle alone is left. The builder check may add some.
