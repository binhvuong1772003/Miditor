# M5 rest: rail tools, array and object fields, external fields

M5a (the `custom` field) is done. This is the design and the plan for the other three slices of M5 of
`2026-10-31-overrides-and-composition-plan.md`, in the order the owner will meet them. Each slice is
`@experimental`, adds no render to a host that does not use it, and ends with the whole suite green.

## M5b: tools of the host on the rail

- `config.tools?: readonly HostTool[]`, `HostTool = { id: string; label: string; icon?: IconName | ReactNode;
  panel: ComponentType<HostToolPanelProps> }`, `HostToolPanelProps = { editor: EditorApi; label: string }`.
  `id` is lower case letters, digits and `-`, and not a built-in name. The panel is drawn in the left panel's
  `aside` (`aria-label` = `label`) when its tool is the one chosen.
- `Tool` widens to the four built-ins or a string. The rail draws the built-ins (minus the hidden) and then the
  host's tools; `RailTool.icon` may be a node; the `rail` and `panelStart` overrides see the host's tools like
  the built-in ones. A chosen tool that is no longer known falls back on the first visible built-in.
- `tool.pick` takes a string; the editor only offers known ids. A new part `Editor.Tool` (`<Editor.Tool id="..."/>`)
  draws any tool's panel on its own in a custom layout.
- Not in this slice: hiding a host tool by `hide` (the host just does not give it).

## M5c: array and object fields

- `Field` gains `{ type: "array"; label; item: Field; minItems?; maxItems? }` and
  `{ type: "object"; label; fields: Record<string, Field> }`. Inside them a field may be any type except
  `image`, `action`, `payload` (which need the page's host context), nested at most 3 deep; an array holds at
  most 100 items (default cap, `maxItems` can only lower it). `group`, `perDevice` and `help` belong to the top
  level only.
- `core`: a function `validateValue(field, value)` (the code behind `validateProps`) is exported and recurses;
  `validateRegistry` refuses a nested forbidden type, a missing `item` or `fields`, and bad limits; defaults must
  pass. `defaultValueOf(field)` gives the value of a new item.
- `editor`: the leaf inputs of `PropField` become value-level (they validate with `validateValue`), then an
  array is a list of rows (each row the item's input, with move up, move down and remove, and an Add button that
  stops at `maxItems` and Remove stops at `minItems`), and an object is a group of its fields. A host's `custom`
  field works as an item. The value is one step of history as a whole.
- Copy, paste and duplicate need nothing: props are plain JSON. No migration: old pages have no such fields.

## M5d: external fields

- `Field` gains `{ type: "external"; label; source: string }`; the stored value is `null` or `{ id, label }`.
- `config.sources?: Record<string, ExternalSource>`, `ExternalSource = { search(query: string, signal: AbortSignal):
  Promise<readonly { id: string; label: string }[]> }`. The input is a button with the chosen label (or
  "Choose..."), opening a small panel with a search box and the results (loading, empty and error states, the
  search debounced and aborted when it changes), a pick stores `{ id, label }`, and a Clear button stores `null`.
  A source with no entry in `config.sources` shows a note and warns once, like a `custom` field with no input.
- `core`: `validateValue` accepts `null` or an object with string `id` and `label`.

## Plan (each task ends with the unit tests, `pnpm e2e` and `E2E_STRICT=1 pnpm e2e` green, `pnpm perf` not worse)

1. **B1** `Tool` and `config.tools`; Rail, StartPanel, `ToolPanel`, `Editor.Tool`; unit tests.
2. **B2** playground `?tools` and e2e; README; surface snapshot.
3. **C1** `core`: types, `validateValue`, `defaultValueOf`, `validateProps` recursion, `validateRegistry`; tests.
4. **C2** `editor`: value-level `FieldInput`, array and object inputs; unit tests.
5. **C3** playground `Menu` kind (an array of `{ label, link }`) and e2e; README; surface.
6. **D1** `core` and `editor` for `external`; unit tests.
7. **D2** playground and e2e; README; surface; baseline numbers.
