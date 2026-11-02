# M5a: a custom field the host draws

First slice of M5 of `2026-10-31-overrides-and-composition-plan.md`; the owner chose to do the `custom`
field before arrays, objects, external data and rail tools (those stay for later slices).

**Intent.** A host can declare a prop whose input the built-in field types cannot be (a product picker)
and draw that input itself.

**What it is.**
- `core`: the `Field` type gains `{ type: "custom", label, kind }`. `kind` names the input the host gave
  the editor (lower case letters, digits and `-`, at most 40 characters; `validateRegistry` checks it). Any
  JSON value is accepted by `validateProps`; the registry stays plain data, so no function is in it.
- `editor`: `config.customFields: Record<kind, ComponentType<CustomFieldProps>>`. The panel draws the host's
  input for the field with `name`, `label`, `value`, `onChange(value)`, `readOnly` (from `permissions.canEdit`),
  `nodeId` and `editor` (the control object). A kind with no input shows a note and warns once. The input is
  not made again when its value changes (it keeps its state and focus); the M2 `field` place still wraps it.
- Everything is `@experimental`.

**Not in this slice.** `array`, `object` and `external` fields (they touch props checks, copy, migration),
tools on the rail, and a way for the host to check a custom value inside `core`.

**Checked.** Unit tests in `core` and `editor`, e2e in the playground (`?nopicker` for the note), the whole
suite and the render counts unchanged.
