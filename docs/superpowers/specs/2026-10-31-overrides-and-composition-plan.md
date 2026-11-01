# Overrides and composition: a plan for letting a host reshape the editor

Status: **proposed, not started** (2026-10-31). Nothing here is built yet. The comparison with Puck is
from memory and has not been checked against Puck's current documentation.

## Why

A host that embeds `<Editor>` today can change the colours (`appearance`), the icons (`icons`), the
language (`i18n`) and three places in the header (`logo`, `headerStart`, `headerActions`). It cannot
replace the header, add a panel of its own, hide a feature, forbid an action, or lay the parts out
differently. Puck calls this `overrides` and a compositional API (`Puck.Components`, `Puck.Fields`,
`Puck.Preview`, `Puck.Outline`) plus `usePuck`.

## Where we are

- `Editor.tsx` is about 2550 lines. One component holds almost all the state (selection, history,
  zoom, frame, open tool, the draft being typed) and about 50 handlers in one closure.
- The header, the tool rail, both panels and the canvas are JSX inside it. The panels
  (`BlocksPanel`, `LayersPanel`, `PropertiesPanel`...) take clear props but can only be used inside `Editor`.
- Only two small React contexts exist (`TContext`, `IconsContext`). A host cannot ask for state or issue a command.

So no part can be replaced or recomposed without breaking another: they share state through the closure.

## Principles

1. **Add, never break.** Existing props keep working; every new thing is optional.
2. **The default UI is built from the public API** (dogfooding), so there is one path, not two that drift apart.
3. **One place enforces.** Permissions, hiding and commands go through the store, not only through hidden buttons.
4. **One module per branch**, a few small commits, mergeable on its own. Before it is called done: `pnpm test`, `pnpm -r exec tsc --noEmit`, `pnpm exec biome check .`, `pnpm build`, and a look at the playground.
5. **No visible change** in the refactoring steps (M0, M4). That is their acceptance test.

## Modules

### M0. Take the state out of `Editor.tsx` (foundation)

- **Need: required.** Every later module depends on it.
- **What:** an editor store outside React (`createEditorStore(data, config)`) with four groups:
  the document (`data` and history), the selection (`selectedId`, `picked`, `scopeId`), the view
  (`frame`, `zoom`) and the interface (`tool`, `panelOpen`). Commands are pure functions on the
  store (`select`, `addBlock`, `removeSelected`, `undo`...). React reads it with `useSyncExternalStore` and selectors.
- **How, safely:** move one group at a time, one commit each, `Editor.tsx` working at every step.
  Interface and view first (low risk); document and history last (most coupled: the typed draft,
  `commitPatch`, grouped changes).
- **Performance:** with selectors, typing in a field does not redraw the Layers panel or the rail.
  Measure with the React Profiler: renders per panel while typing, dragging and changing selection, before and after.
- **Scale and upkeep:** commands are pure, so they are testable without a DOM. Target: `Editor.tsx`
  under about 600 lines, only layout and wiring. Parts import from the store, not from each other (checked by lint).
- **Against Puck:** Puck has an `appState` and `dispatch` reducer, and `usePuck` reads everything, so
  it redraws more than needed unless `createUsePuck` with a selector is used. Here selectors are the default.
- **Risk:** the highest of the plan. Mitigation: the existing tests, a manual checklist (select,
  drag, rotate, group, undo, type in place, zoom), and no change to the look.
- **Size:** large.

### M1. A public control API (`useEditor`, `ref`)

- **Need: required** for a navbar of the host, panels of the host, and every override.
- **What:** two doors to the same thing.
  ```tsx
  const editor = useEditor();                  // inside the tree of <Editor>
  const canUndo = useEditor((s) => s.canUndo); // a selector: redraws only when this value changes
  editor.undo(); editor.save(); editor.setFrame("phone"); editor.select(id); editor.addBlock("Text");
  <Editor ref={editorRef} />                   // outside the tree: editorRef.current.undo()
  ```
- **A small, versioned surface:** read `data`, `selection`, `frame`, `zoom`, `canUndo`, `canRedo`,
  `status`; commands: undo, redo, save, setFrame, setZoom, fit, select, addBlock, remove, duplicate,
  group... Say which parts are stable and which are experimental.
- **Upkeep:** one list of commands feeds the API, the shortcuts and the menus. An API report
  (api-extractor or similar) shows changes to the public surface in review.
- **Against Puck:** like `usePuck`, but commands are separate from a raw `dispatch`, so changing the
  insides does not break hosts.
- **Size:** medium, after M0.

### M2. Overrides (replace or wrap a part)

- **Need: high.** This is the navbar question.
- **What:** an `overrides` prop. Each override gets a context and the default (`children`), so a host
  can wrap instead of rewriting:
  ```tsx
  <Editor overrides={{
    header: ({ children }) => <MyBar>{children}</MyBar>,
    headerActions: ({ editor }) => <Publish onClick={editor.save} />,
    rail: ({ tools }) => <MyRail tools={tools} />,
    field: ({ field, children }) => (field.name === "href" ? <MyLinkPicker /> : children),
  }} />
  ```
- **A fixed list of places, named once** (header, headerActions, rail, each panel, field, block row,
  layer row, preview...). The same ids serve hiding and permissions (M3): no second naming system.
- **Performance:** an override is an ordinary component; the default is built only when the host uses it.
- **Safety:** every override sits in an error boundary. If the host's code throws, the default shows
  and a warning is logged; the editor does not die. The accessibility contract of a part is written down.
- **Against Puck:** same idea (`overrides`). Better here: typed and generated names, the error
  boundary, and `editor` (M1) passed to every override.
- **Size:** medium.

### M3. Hide and permissions

- **Need: high** for large systems (roles, locked blocks).
- **What:** two layers.
  - Hide the interface by id: `hide: ["align", "props.anchors", "layers", "tool.themes"]`.
  - Real permissions, per block or global: `canDrag`, `canDuplicate`, `canDelete`, `canEdit`,
    `canAdd`; each may be a function of the block (`(node) => boolean`).
- **The key point: enforce in the store,** not only hide buttons. Hiding "Delete" while the Delete
  key or the context menu still deletes is a hole. One `remove` command checks the permission, and every
  way in (button, key, menu, the API of M1) goes through it.
- **Performance:** permissions of a block are worked out when it is selected, not on every render.
- **Upkeep:** one table of permission to command, and a test for each command: "with permission X
  off, command Y is refused".
- **Against Puck:** has `permissions` and `resolvePermissions`. Same idea here, with "enforced in the
  store" and a test per command as a commitment.
- **Note:** a permission in the editor is the first line only. The server of the host must check again.
- **Size:** medium.

### M4. Composition (the host lays the parts out)

- **Need: should have;** after M0 to M2.
- **What:** split `<Editor>` into parts that can be used inside `<EditorProvider>`:
  ```tsx
  <EditorProvider data={page} config={config}>
    <MyShell>
      <Editor.Header />
      <Editor.Rail /> <Editor.Blocks /> <Editor.Layers />
      <Editor.Canvas />
      <Editor.Properties />
    </MyShell>
  </EditorProvider>
  ```
  `<Editor>` with no children stays the default layout, **built from these same parts**.
- **The hard part is `Canvas`:** it is tied to `react-moveable`, the measurements of the workspace,
  zoom and the overlays. Split the panels first and **the canvas last**, and only if needed: most
  hosts want their own header and panels, not a moved canvas.
- **Upkeep:** each part reads only from the store (M0, M1). The layout is CSS variables and grid
  areas, so a host changes panel sizes without touching a part.
- **Against Puck:** Puck has `Puck.Components`, `Puck.Fields`, `Puck.Preview`, `Puck.Outline`. MiDito
  has a free-position canvas, harder to move than Puck's flow layout, hence the late slot.
- **Size:** large (most of it in the canvas).

### M5. Extending content: tools, fields, new field kinds

- **Need: high, but its own stream.** Custom tools on the rail (`tools`), a `custom` field (the host
  draws it), `array`, `object` and `external` (data from the host). It touches `core` (the `Field`
  type, props checks, migration) and `render`, so it needs its own brainstorm. This is where Puck is
  far ahead. It is the second programme after M0 to M3.

### M6. Plugins

- **Need: can wait.** A plugin is a bundle `{ overrides, tools, hide, permissions, i18n, appearance }`
  merged in order with clear rules for conflicts. It only makes sense once M2 and M3 are stable.
  Better than Puck: merge rules are tested, and a plugin states the API version it needs.

### M7. Upkeep infrastructure (throughout)

- **Need: required.**
  - An API report in CI; a change to the public surface has to be approved.
  - Measure redraws and bundle size, with thresholds.
  - Playground host modes (`?host` exists; add one that uses `overrides`, one that composes parts).
  - Docs from code: the table of ids for overrides, hiding and permissions; the list of commands and permissions.
  - Versioning rules: what is stable, what is experimental, how things are phased out.

## Order

```
M0 store --> M1 control API --> M2 overrides --> M3 hide/permissions --> M4 composition --> M6 plugins
                                     |
M7 infrastructure (alongside, from M0)  +--> M5 fields and tools (own stream, needs M1)
```

- **Stage A (foundation):** M0 and M7.
- **Stage B (value you can see):** M1, then M2 and M3. After B a host has its own navbar, can wrap any part, and can hide and lock by role.
- **Stage C:** M4, then M5 and M6.

## Ideas beyond Puck

1. Permissions enforced in the store, with a test for every command.
2. Selectors by default, with redraw counts as an acceptance measure.
3. An error boundary around every override.
4. Typed ids with generated docs, shared by overrides, hiding and permissions.
5. `editor.transact(() => {...})`: several changes by the host become one undo step.
6. Events to observe (`onEvent`: selection changed, added, removed, saved) for analytics and audit.
7. An accessibility contract for overrides (name, keys, focus the host must keep).

## Decisions needed before M0

1. **How much breaking is acceptable?** The packages are at `0.0.0`. May old props be renamed or removed, or must everything stay compatible?
2. **Does a host need to replace the canvas,** or only the panels and the header? (Decides whether the hard part of M4 is done.)
3. **Are permissions a hard requirement** (security) or a convenience of the interface? If hard, the host's server must check again.
4. **Order of work:** results soon (M1 to M3 on the present structure, accepting the debt) or the right foundation first (M0, slower but lasting). Recommended: **M0 first**.

## What is not in this plan

Layers extras (rename, hide, lock, drag to reorder), the missing kinds of field, and a keyboard
route for dragging are separate pieces of work. Hiding and locking blocks needs a flag on the node in
`core` and `render`, and belongs with the Layers work.
