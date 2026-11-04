# @miditor/editor

`<Editor>` is an embeddable visual page editor for React. The host app mounts it on its own route,
gives it a page, and stores what comes back. The editor keeps no files, no keys and no back end of
its own: data goes in through props and comes out through callbacks.

New here? Start with [Getting started](../../docs/GETTING-STARTED.md); this file is the reference.

## Use it

```tsx
import { Editor, type PageData } from "@miditor/editor";
import "@miditor/editor/style.css";

export function EditPage({ page }: { page: PageData }) {
  return (
    // The editor fills its parent, so the parent needs a height.
    <div style={{ height: "100vh" }}>
      <Editor data={page} onSave={(data) => save(data)} />
    </div>
  );
}
```

`data` is read once, when the editor mounts. Give the editor a new `key` to open another page.
Without `data` it opens an empty page. A page of an older version is upgraded on opening.

Show a stored page to visitors with `<Render>` from `@miditor/render`. Pass `responsive` to
draw the desktop and the phone layouts at once, switched by CSS with no script:

```tsx
import { Render } from "@miditor/render";

<Render data={page} responsive={{}} />;
```

## Props

| Prop               | What it does                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `data`             | The page to open. Read once.                                                                                                  |
| `onSave`           | Called with the whole page when the person presses Save. The Save button shows only when it is given.                         |
| `onChange`         | Called with the whole page after each change that is final (see [Saving](#saving)).                                           |
| `onAction`         | Called for each kept change with what was done (`action`), the page after and the page before. Experimental.                  |
| `onChangeDebounce` | A wait in ms, or `{ wait, maxWait }`, so a run of changes is one `onChange` call.                                             |
| `status`           | `"saved"`, `"unsaved"`, `"saving"` or `"error"`: what the header says about the host's storing.                               |
| `headerActions`    | Your own controls, drawn in the header before Save: a preview link, a Publish button.                                         |
| `overrides`        | Wrap or replace parts of the editor; see [Change the editor with overrides](#change-the-editor-with-overrides). Experimental. |
| `historyLimit`     | How many steps undo goes back. 100 by default; `Infinity` for no limit.                                                       |
| `permissions`      | What people may do, by block; see [Control what people can do](#control-what-people-can-do). Experimental.                    |
| `hide`             | Names of parts of the editor not to draw, same section. Experimental.                                                         |
| `onDenied`         | Called when a change is refused, same section. Experimental.                                                                  |
| `className`        | An extra class on the root element.                                                                                           |
| `config`           | `components`, `renderers`, `uploadImage` and `theme`; see below.                                                              |


## Inside your product

The editor fills the box it is given (`block-size: 100%`), so put it in an element with a height. It
has a header of its own (Undo and Redo, Desktop and Phone, zoom, Save), which a page editor needs,
and three props make it sit in your product:

| Prop            | What it does                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `logo`          | The mark at the left of the header. Without it, the editor's own "M". `null` for none, or your own element. |
| `headerStart`   | Your content after the mark: a "Back to pages" link, the name of the page.                                  |
| `headerActions` | Your content at the right end, before Save: a preview link, Publish.                                        |

```tsx
<Editor
  logo={null}
  headerStart={<a href="/pages">← Pages</a>}
  headerActions={<button type="button">Publish</button>}
/>;
```

### Looks

The `appearance` prop sets the look in code, with types:

```tsx
<Editor
  appearance={{
    scheme: "dark", // "light" (default) or "dark": the set of colours to start from
    colors: { accent: "#7c3aed", onAccent: "#ffffff", focus: "#a78bfa" },
    radius: "10px",
    font: "'DM Sans', system-ui, sans-serif",
  }}
/>;
```

`colors` takes `chrome`, `workspace`, `canvas`, `soft`, `border`, `borderInput`, `text`, `muted`,
`focus`, `danger`, `scrollbar`, `paper` and `accent` / `onAccent` (the Save button and the text on
it). Other fields: `radius`, `radiusCard`, `control` and `font`. A value that is empty or could not
be one CSS value is ignored. The page itself keeps its own colour (`paper`, white by default), so a
dark editor still shows the page as a visitor will see it.

### Icons

`config.icons` replaces the editor's icons with your own, by name. Each is a component that takes the
`size` in px, so an icon of a library goes in as it is:

```tsx
import { Undo2, Redo2, Image } from "lucide-react";
import { ICON_NAMES, type IconName } from "@miditor/editor";

<Editor config={{ icons: { undo: Undo2, redo: Redo2, img: Image } }} />;
// ICON_NAMES lists every name that can be replaced
```

A name you leave out keeps the editor's icon, and so does a name the editor does not have or a value
that is not a component. Icons are decoration (the editor hides them from a screen reader and the
button keeps its own name), so yours need no label. The stroke of the editor's own icons can be set
with `--miditor-icon-stroke` (1.4 by default); your icons draw their own. The kinds of block you add
name an icon from the same list.

The same can be done in CSS, on an ancestor of the editor or on its root class `className`, with the
variables below. Set only the ones you want to change:

| Variable                 | Default               | What it is                                       |
| ------------------------ | --------------------- | ------------------------------------------------ |
| `--miditor-chrome`       | `#ffffff`             | The header, rail and side panels                 |
| `--miditor-workspace`    | `#e4e4e7`             | The ground around the page                       |
| `--miditor-canvas`       | `#ffffff`             | Fields and cards                                 |
| `--miditor-soft`         | `#ececef`             | Hover and quiet fills                            |
| `--miditor-border`       | `#a9a9b2`             | Dividers                                         |
| `--miditor-border-input` | `#71717a`             | The edge of a field                              |
| `--miditor-text`         | `#09090b`             | Text                                             |
| `--miditor-muted`        | `#3f3f46`             | Quiet text                                       |
| `--miditor-focus`        | `#1d4ed8`             | Focus rings and selection                        |
| `--miditor-danger`       | `#b91c1c`             | Errors                                           |
| `--miditor-scrollbar`    | `#71717a`             | Scrollbars                                       |
| `--miditor-radius`       | `6px`                 | Fields and buttons                               |
| `--miditor-radius-card`  | `8px`                 | Cards                                            |
| `--miditor-control`      | `2.25rem`             | The height of a field or button                  |
| `--miditor-font`         | Inter, system-ui, ... | The font of the editor                           |
| `--miditor-icon-stroke`  | `1.4`                 | The line width of the editor's own icons         |
| `--miditor-paper`        | `#ffffff`             | The page itself (not changed by the dark scheme) |
| `--miditor-accent`       | the text colour       | The main button (Save)                           |
| `--miditor-on-accent`    | the canvas colour     | The text on the main button                      |

The playground shows it: open `?host` to see the editor in a stand-in product with its own sidebar
and navbar.

## Control the editor from your code

A part you draw inside the editor (`headerActions`, `headerStart`, `logo`) can read the editor and give
it commands with `useEditor`.

```tsx
import { Editor, useEditor } from "@miditor/editor";

function PublishButton() {
  const editor = useEditor(); // the commands
  const canUndo = useEditor((view) => view.canUndo); // a piece of the editor

  return (
    <>
      <button type="button" disabled={!canUndo} onClick={() => editor.undo()}>
        Undo
      </button>
      <button
        type="button"
        onClick={async () => {
          if (await editor.save()) publish();
        }}
      >
        Save and publish
      </button>
    </>
  );
}

<Editor onSave={(data) => store(data)} headerActions={<PublishButton />} />;
```

`useEditor()` outside an `<Editor>` throws. A part that reads with a selector is drawn again only when
what the selector gives changes; the selector may build a new object or array (`(view) => ({ id:
view.selection.id })`), its members are compared.

**What you can read** (the argument of the selector):

| Read                 | What it is                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| `data`               | The page as stored, as `onSave` would get it, without a pending draft.        |
| `selection`          | `{ id, picked }`: the selected block (or `null`) and the ones picked with it. |
| `frame`              | `"desktop"` or `"phone"`.                                                     |
| `zoom`               | The zoom of the canvas, 1 for the page at its own size.                       |
| `canUndo`, `canRedo` | Whether there is a step to undo or redo.                                      |
| `status`             | What the header says: the `status` prop or the Save button's own state.       |

**What you can do** (the object `useEditor()` gives): `undo`, `redo`, `save`, `select(id)`, `clearSelection`,
`setFrame`, `setZoom`, `fit`, `addBlock(kind, overrides?)`, `remove`, `duplicate`, `group`, `ungroup`.
They run the same code as the editor's buttons and keys, so a host button and the editor's own button
cannot disagree.

- **Stable and experimental.** Each member is marked `@stable` or `@experimental` in its type comment.
  Stable: `data`, `selection`, `frame`, `canUndo`, `canRedo`, `status`, `undo`, `redo`, `save`, `select`,
  `setFrame`. The rest is experimental and may change.
- **A command that cannot run says `false`.** Nothing to undo, no block selected, an id that is not in
  the page: nothing changes and the call returns `false`. It does not throw.
- **`save()`** stores a pending draft (a colour or value still being picked) first,
  then calls `onSave`. It resolves `true` once `onSave` has settled, and `false` when it could not run:
  no `onSave`, the status is `"saving"`, `onSave` threw, or the editor is gone.
- **`addBlock(kind, overrides?)`** adds the block where the editor's own add would (inside the selected
  block if it can hold it, otherwise on the page), selects it and returns its id. It returns `null`
  when nothing was added: an unknown `kind`, or the phone frame.
- **After the editor went away**, or before it started, a command does nothing, returns `false` (`null`
  for `addBlock`) and warns once in the console. Keeping `editor` after the part unmounted is safe.

### Control the editor from outside

For an app bar, a sidebar or a script that is not drawn by the editor, make a controller and give it to
the editor. `useCreateEditor()` makes it once for the part that calls it.

```tsx
import { Editor, type EditorController, useCreateEditor, useEditor } from "@miditor/editor";

function App() {
  const editor = useCreateEditor();
  return (
    <>
      <AppBar editor={editor} />
      <Editor controller={editor} data={page} onSave={(data) => store(data)} />
    </>
  );
}

function AppBar({ editor }: { editor: EditorController }) {
  const canUndo = useEditor(editor, (view) => view.canUndo);
  return (
    <>
      <button type="button" disabled={!canUndo} onClick={() => editor.undo()}>
        Undo
      </button>
      <button type="button" onClick={() => editor.save()}>
        Save
      </button>
    </>
  );
}
```

The controller has the same commands as `useEditor()` and `useEditor(controller, selector)` reads the
same view as the one inside the editor, with the same rules for the selector.

- **One controller, one editor at a time.** A second editor given a controller that already has one is
  ignored and an error is logged; the first keeps working.
- **With no editor attached** (not opened yet, or closed) a command does nothing and returns `false`
  (`null` for `addBlock`, a promise of `false` for `save`), and warns once in the console.
- **A read gives an idle view** then: an empty page, nothing selected, `"desktop"`, zoom 1, nothing to
  undo or redo, no status.
- **Opening the editor again** starts a new page from its `data` with a new history; nothing of the
  last session is kept in the controller.
- **The controller is a handle, not the store.** It forwards commands and reads to the editor it holds;
  it keeps no page of its own.

## Change the editor with overrides

> Experimental. `overrides` and everything under it may change before it is stable.

`overrides` is a prop of `<Editor>`: a list of named places, each of which you can **wrap** (keep the
editor's own part and put something around or next to it) or **replace** (draw your own). A component
override receives `editor` (the same object as `useEditor()`) and `children` (the editor's own part).
Draw `children` to wrap, leave it out to replace. Your component is drawn inside the editor, so it can
call `useEditor(selector)`.

| Place           | Is                                                              | Props besides `editor` and `children`                                               |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `header`        | The bar at the top.                                             | none                                                                                |
| `headerActions` | The right end of the bar: your `headerActions` prop and Save.   | none                                                                                |
| `field`         | The input of one property of the selected block.                | `name`, `field`, `value`, `onChange(value)`, `nodeId`                               |
| `rail`          | The tool buttons beside the left panel.                         | `tools`: a list of `{ id, name, icon, active, pick() }` (`RailTool`)                |
| `panelStart`    | The left panel (blocks, layers, images, themes).                | `tool`: `"blocks"`, `"layers"`, `"images"` or `"themes"`                            |
| `panelEnd`      | The right panel: the page's settings or the block's properties. | `mode`: `"page"` or `"block"`; `nodeId`: the selected block, or `null` in page mode |
| `quickActions`  | The row of buttons under the selected block.                    | `disabled`: true on the phone frame, where blocks cannot be added or removed        |
| `contextMenu`   | The lines of the right-click menu.                              | A function, not a component: `({ editor, items }) => items`                         |

Wrap a place:

```tsx
import { Editor, type Overrides } from "@miditor/editor";

const overrides: Overrides = {
  header: ({ children }) => <MyBar>{children}</MyBar>,
};

<Editor overrides={overrides} />;
```

Replace a place. This draws the tool buttons from `tools` and ignores `children`:

```tsx
const overrides: Overrides = {
  rail: ({ tools }) => (
    <nav aria-label="Tools">
      {tools.map((tool) => (
        <button key={tool.id} type="button" aria-pressed={tool.active} onClick={tool.pick}>
          {tool.name}
        </button>
      ))}
    </nav>
  ),
};
```

`contextMenu` gets the lines the editor would show and gives back the ones to show: add a line, drop
one, reorder. It is called each time the menu opens, for a block (the page and the empty canvas have no
menu). A line is `"separator"` or `{ label, onSelect }`, with an optional `id`, `hint`, `disabled` and
`danger` (`ContextMenuItem`). Give your own lines an `id`: rows are keyed by `id`, else by label and
place. A line you add closes the menu and then runs, like the editor's own.

```tsx
const overrides: Overrides = {
  contextMenu: ({ editor, items }) => [
    ...items,
    "separator",
    { id: "my-publish", label: "Save and publish", onSelect: () => editor.save() },
  ],
};
```

### The field place

`field` draws one property of the selected block as one input. Wrap it, or replace it for the
properties you care about and return `children` for the rest:

```tsx
const overrides: Overrides = {
  field: ({ name, value, onChange, children }) =>
    name === "href" ? <PagePicker value={String(value)} onChange={onChange} /> : children,
};
```

- **One property, one input.** A run of two or more booleans is drawn as one group of switches; that
  group is not overridable. A lone boolean is. An `action` or `payload` property is overridden as a
  whole; its inner inputs stay inside `children`. The page's own settings (title, height, colours,
  fonts) are not fields.
- **`onChange(value)` writes this property only.** It cannot write another.
- **The input is drawn again from scratch when the stored value changes**, as the editor's own is
  (undo and redo rely on it). An input of yours that keeps its own state should expect that.

### Rules

- **Keep `overrides` stable**: a constant at module level, or `useMemo`. A new function for a place is a
  new component to the editor, so it is drawn again from scratch. A new object whose functions are the
  same is fine.
- **The parts sit in a CSS grid, and your wrapper becomes the grid item.** The header spans the whole
  top row, and the rail and the two panels each take a column. A plain `<div>` around one of them loses
  its place and the layout collapses. Give the wrapper the place of the part it wraps (for the header,
  `grid-column: 1 / -1`), or use `display: contents` on a wrapper that only adds behaviour. This is
  true of the default layout only; a [layout of your own](#lay-the-editor-out-yourself) has no grid.
- **A mistake in your component does not kill the editor.** If an override throws while drawing, the
  editor's own part is drawn instead and one error in the console names the place. It is tried again
  only when your entry for that place changes. If `contextMenu` throws, or does not give a list of
  lines, the default menu is shown and one error is logged. A throw in your own event handler is yours,
  as in any React app.
- **A host with no `overrides` sees no change**, in code or in renders.

### What a replacement must keep

The editor's parts are accessible; a replacement has to stay so.

- **`header`:** keep a landmark (`<header>` or `role="banner"`). If you replace Undo, Redo or Save,
  keep them reachable by keyboard.
- **`rail`:** use real `<button>`s with a name and `aria-pressed` or `aria-current` for the open tool.
- **`panelStart`, `panelEnd`:** keep an `aria-label` on the region (the editor's own panels have one).
- **`contextMenu`:** the menu closes on Esc and gives focus back; this is the editor's, and your lines
  take part in it. Give every line a `label`.
- **`quickActions`:** the buttons stay reachable by keyboard.

## Lay the editor out yourself

`<Editor>` is a fixed layout: header, rail, left panel, canvas and properties. To put the parts
elsewhere, use `<EditorProvider>`. It takes the same props as `<Editor>` (`data`, `onSave`, `overrides`,
`hide`, `permissions`, `controller`, `appearance`, `i18n`...) and the parts you place as its children.

```tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { Editor, EditorProvider, useEditorRoot, type PageData } from "@miditor/editor";
import "@miditor/editor/style.css";

// Properties in a dialog. It is drawn in the editor's root, so it keeps the look and the language.
function PropertiesDialog() {
  const root = useEditorRoot();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Properties
      </button>
      {open && root
        ? createPortal(
            <dialog open>
              <Editor.Properties />
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </dialog>,
            root,
          )
        : null}
    </>
  );
}

export function EditPage({ page }: { page: PageData }) {
  return (
    <EditorProvider data={page} onSave={(data) => save(data)}>
      <div style={{ display: "flex", height: "100vh" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editor.Canvas />
        </div>
        <div style={{ width: "18rem" }}>
          <Editor.Layers />
        </div>
        <PropertiesDialog />
      </div>
    </EditorProvider>
  );
}
```

Each part is a member of `Editor` (`Editor.Layers`) and is also exported by name (`EditorLayers`).
All of it is experimental: names and behaviour may change in a minor version.

| Part                                          | Draws                                                                 | Brings                            |
| --------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| `Editor.Header`                               | Undo, redo, the frame, the zoom and Save                              | a `<header>`                      |
| `Editor.Rail`                                 | The tool buttons                                                      | a `<nav>` with an `aria-label`    |
| `Editor.StartPanel`                           | The panel of the tool the rail chose                                  | an `<aside>` with an `aria-label` |
| `Editor.Blocks`, `Layers`, `Images`, `Themes` | That panel on its own, whatever tool the rail chose                   | an `<aside>` with an `aria-label` |
| `Editor.Canvas`                               | The page, the selection, the labels, the context menu, inline editing | a labelled region (`<section>`)   |
| `Editor.Properties`                           | The page settings, or the properties of the selected block            | an `<aside>` with an `aria-label` |

A custom layout keeps these landmarks, but what surrounds them is yours. Keep the canvas reachable by
keyboard.

### The default layout

`<Editor>` with no children is the same parts in a grid. Its root carries `data-layout="default"`, and the
grid and the narrow-screen rules of `style.css` apply only under that attribute. A custom layout is sized
by you: the root is a block with `block-size: 100%`, so give its parent a height. It has no breakpoints
of its own.

### Rules

- **One canvas.** A second `Editor.Canvas` draws nothing and logs an error. If the first one unmounts (a
  closed dialog), another can take its place. Every other part can be placed any number of times.
- **Inside a provider.** A part outside an `<EditorProvider>` throws `<Name> must be used inside <EditorProvider>`.
- **Portals.** The appearance variables and `lang` are on the editor's root, so a dialog drawn in a portal
  elsewhere in the page loses them. Draw it into `useEditorRoot()`, which is `null` until the editor has
  mounted. Keys, copy and paste work in a portal either way.
- **Size the cells.** The rail and the panels have no height of their own: they fill the cell you give
  them and scroll inside it. Put the canvas in a cell with `min-block-size: 0` and `overflow: hidden`
  (a grid or flex item), and give the root's content `block-size: 100%`, since the root is `100%` tall.
- **Style a dialog with the public variables.** A dialog drawn into `useEditorRoot()` gets the
  `--miditor-*` variables, not the editor's private `--_*` names. Set its background with `--miditor-chrome` and its
  text with `--miditor-text` (or your own colours).
- **`Editor.Provider`** is the same component as `EditorProvider`, for a host that prefers to write
  `<Editor.Provider>`.
- **Hidden tools stay hidden.** `hide: ["tool.layers"]` also removes `Editor.Layers`. The four tool panels
  ignore `panelOpen`; `Editor.StartPanel` follows it only in the default layout.
- **Without a canvas** the editor still works, with less. The keys that need a container (nudge, group,
  ungroup, duplicate) do nothing, Fit does nothing, and adding a block uses zero sizes. Tab, Esc, undo
  and redo work.
- **Hide, overrides, permissions and the control API** work in any layout. Parts keep their override
  places, and a part you leave out is simply not drawn.
- **Closing a part loses nothing.** The selection, the history and a pending edit are in the editor, not
  in the part. Only the choice of tab in the properties (Design or Advanced) starts again.

## Control what people can do

> Experimental. `permissions`, `hide` and `onDenied` may change before they are stable.

**Read this first.** The editor's permissions stop the editor and the code that drives it. The page is
plain data, and anyone can send your server a page that the editor would have refused. Your server must
check the page again before it stores it.

`permissions` says what people may do. A change that is refused is refused whatever way it was asked
for: a button, a key, the right-click menu, a drag, a typed value, a paste, or a call of the control
API such as `editor.remove()`. Each key is optional, is `true` when left out, and is a boolean or a
function of the block as you store it. The functions must be pure and cheap.

| Key            | Asks                                                                             | Value                                    |
| -------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| `canEdit`      | May the props or the looks of this block change? Also the page's own settings.   | `boolean` or `(node) => boolean`         |
| `canDelete`    | May this block be taken away, with what is inside it? (Delete, cut, ungroup.)    | `boolean` or `(node) => boolean`         |
| `canDuplicate` | May this block be copied?                                                        | `boolean` or `(node) => boolean`         |
| `canDrag`      | May this block move, resize, turn, change its anchors or its place among others? | `boolean` or `(node) => boolean`         |
| `canAdd`       | May a block of this `kind` be put inside `parent`? (Library, paste, group.)      | `boolean` or `(parent, kind) => boolean` |

```tsx
<Editor
  permissions={{
    canDelete: (node) => node.id !== "footer",
    canEdit: (node) => !node.props.locked,
    canDrag: (node) => node.id !== "footer",
    canAdd: (parent, kind) => kind !== "Video",
  }}
  onDenied={({ action, nodeId }) => toast(`Not allowed: ${action}`)}
  hide={["tool.themes", "props.anchors"]}
/>;
```

To lock a block, answer as a function of what you already store in the node: its id, a prop, a style.
The editor adds no `locked` flag to the page. `permissions`, `hide` and `onDenied` are read when a
change is made or a part is drawn, so you may change them while the editor is open.

### How a change is sorted

The editor compares the page before and after a change, finds each block by its id, and asks the
permission that matches what happened to it:

- **Added** (an id that was not there): `canAdd(parent, kind)`.
- **Removed**: `canDelete(node)`.
- **Moved** (the parent, the position, size, turn, anchors or phone placement changed, or its rank among
  the siblings that stayed): `canDrag(node)`.
- **Edited** (props, or looks other than position): `canEdit(node)`.

Only the root of an added or removed subtree is asked, not what is inside it. A change of `children` is
not an edit of the parent, and adding or deleting a sibling moves no one. A change that moves and edits
a block asks both. Group adds the group (`canAdd(parent, "Group")`) and moves its children (`canDrag`).
Ungroup removes the group (`canDelete`) and moves its children. Reordering and moving a block into
another block are moves. Cut is a removal and paste is an add. Duplicate asks `canDuplicate` of each
original and does not ask `canAdd`. The page's settings (title, height, background, theme, fonts) are
asked of `canEdit` of the page's root block.

### What a refusal does

- The **whole change is refused**: if any part is refused, nothing is done and the page stays as it was.
- The control API says so: a command such as `editor.remove()` returns `false`, and `addBlock` returns
  `null`. A command that follows a change (selecting what was added) does not happen either.
- A change typed in a panel is refused when it is stored, and the draft ends, so the field shows the
  stored value again.
- `onDenied({ action, nodeId })` is called once for the refusal. `action` is `"edit"`, `"delete"`,
  `"duplicate"`, `"drag"` or `"add"`; `nodeId` is the block, or the parent for an add. The same action on
  the same block within one second (a held arrow key) is told once.
- A screen reader hears a short "Not allowed".

The interface follows the permissions so it does not offer what would be refused: buttons and menu
lines are off, a block that cannot be dragged shows no handles, and a block that cannot be edited has
read-only fields.

**Not governed:** undo and redo (they only walk back through changes that were allowed) and Save (it is
not a change of the page; your server decides what it stores).

### Hide parts of the editor

`hide` is a list of names. A hidden part is not drawn. An unknown name is a type error, and is ignored
with one warning at run time.

| Group             | Names                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Places            | `header`, `rail`, `panelStart`, `panelEnd`, `quickActions`, `contextMenu`                           |
| Header parts      | `header.undo`, `header.redo`, `header.frame`, `header.zoom`, `header.save`, `header.status`         |
| Tools             | `tool.blocks`, `tool.layers`, `tool.images`, `tool.themes`                                          |
| Block panel parts | `props.align` (align and distribute), `props.anchors`, `props.phone` (reset to automatic placement) |

If the open tool is hidden, the first tool left opens. Hiding `panelEnd` hides the properties, but
people can still select blocks. **Hiding does not stop a command**: with `header.undo` hidden, Ctrl+Z and
`editor.undo()` still work. Only `permissions` refuse.

## Plugins

> Experimental.

A plugin is a bundle of changes you write once and give to any editor:

```tsx
import { definePlugin } from "@miditor/editor";

const analytics = definePlugin({
  name: "analytics",
  apiVersion: 1,
  overrides: { headerActions: ({ children }) => <><ReportButton />{children}</> },
  hide: ["tool.themes"],
  config: { tools: [reportsTool] },
});

<Editor plugins={[analytics, branding]} overrides={...} />;
```

A plugin can carry `overrides`, `hide`, `permissions`, `appearance`, `i18n` and `config` (`components`,
`renderers`, `tools`, `customFields`, `sources`, `actions`, `fonts`, `images`, `icons`). Plugins are applied in
array order and then your own props, which always win:

| What                                                          | Rule                                                                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overrides`                                                   | A later plugin wraps the earlier ones: your own is outermost, then the last plugin, down to the first. `contextMenu` functions run in order, each given the lines the one before gave back. |
| `hide`                                                        | The union of all.                                                                                                                                                                           |
| `permissions`                                                 | Every key is the AND of all that give it, so a plugin can only take away, never give back.                                                                                                  |
| `appearance`, `i18n`                                          | The later wins field by field; `colors` and `messages` are merged by name.                                                                                                                  |
| `components`, `renderers`, `customFields`, `sources`, `icons` | Merged by key, the later one wins, and one warning names the key.                                                                                                                           |
| `tools`, `actions`, `fonts`, `images`                         | Joined in order (a repeated tool id keeps the first).                                                                                                                                       |
- `name` tells a plugin apart in warnings and must be unique; a plugin with no name or a repeated one is left
  out with a warning.
- `apiVersion` says which shape of plugin it was written for (`PLUGIN_API_VERSION`, now 1). A plugin that needs
  a newer one than the editor has is left out with a warning; without it, 1 is assumed.
- Keep the `plugins` array stable (a constant or `useMemo`). With no plugins nothing changes.

## Saving

The editor never sends anything by itself. What leaves it is the **whole page as JSON**, and only
through `onSave` and `onChange`. Choose how your host stores it.

**Save button only.** Pass `onSave` and nothing else. Nothing is sent until the person presses Save.
The header says "Saved" or "Unsaved changes" by itself.

**Autosave.** Pass `onChange`. It is called once for each change that is final: a drag, resize or
turn that has ended, a field applied with Enter or by leaving it. It is not called while something
is being typed or dragged, and not when the editor mounts. Add `onChangeDebounce` so a run of
changes is one request, and `status` so the header tells the truth:

```tsx
const [status, setStatus] = useState<SaveStatus>("saved");

<Editor
  data={page}
  // One call 800 ms after the last change, and at least one every 4 s while editing goes on.
  onChangeDebounce={{ wait: 800, maxWait: 4000 }}
  status={status}
  onChange={async (data) => {
    setStatus("saving");
    try {
      await fetch("/api/pages/42", { method: "PUT", body: JSON.stringify(data) });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }}
/>;
```

- A change that is still waiting for its delayed `onChange` shows as "Unsaved changes", whatever
  `status` says, so the header never claims a save that has not been sent.
- A change that is waiting when the editor unmounts is sent at that moment, so none is lost.
- The Save button is off while `status` is `"saving"`.
- Pressing Save does not cancel a waiting `onChange`. A host that uses both may get the same page
  twice, so make the request safe to repeat (a `PUT` of the whole page is).

Without `status`, the header follows the Save button and shows nothing if there is none.

### Keeping the history: `getHistory`, `initialHistory`, `jumpTo`, `setHistory`

> Experimental.

The steps of Undo and Redo live in the editor, so a page that is opened again starts with none. To keep them,
store them next to the page and give them back when the page is opened:

```tsx
const editor = useCreateEditor();

<Editor
  controller={editor}
  data={page}
  initialHistory={history} // { past, future }, from an earlier session
  onChange={(page) => {
    // Every step is a whole page, so keep only the last few.
    const { past, future } = editor.getHistory();
    save({ page, history: { past: past.slice(-20), future: future.slice(0, 20) } });
  }}
/>;
```

- `getHistory()` gives `{ past, future, index }`. `past` has the oldest step first and `future` the nearest first;
  `index` is the place of the page shown in `[...past, page, ...future]` (it is `past.length`). The arrays are
  your own; the pages are the ones the editor holds.
- `initialHistory` is `{ past, future }` around `data`, which is always the page shown, so the two cannot
  disagree. It is read once, like `data`. Each page is opened like `data` is (an older version is upgraded) and
  shares the parts it has in common with `data` (the blocks of a page are matched by their `id`), as the steps of
  a session do, so a history opened again does not take many times the memory. A picture kept inside the page
  as a `data:` address is copied into every step you store. If one page cannot be opened the editor opens **without any history** and warns once in
  the console, never with half. Only the newest `historyLimit` steps are kept. Opening them is not a change:
  `onChange` and `onAction` are not called.
- **The steps are not checked against `permissions`.** Undo only walks back through changes that were allowed
  during the session, but steps you give (`initialHistory`, `setHistory`) come from you, like `data` does. Open a
  history saved with more rights under stricter `permissions`, and Undo can bring back a page with a locked block
  changed. Keep the history with the same person, and check what you store on your server.
- The pages you give are used as they are where nothing else is shared; do not change them afterwards.
- `jumpTo(index)` goes to a step in one move (nothing is drawn in between, one `onChange`, one `onAction` of
  type `history.jump`, whose `ids` are the blocks selected before the move), and undo and redo go on from there. It says `false` for a step that is not there or the
  one shown. The steps in between are not lost: they move to `past` or `future`.
- `setHistory({ past, future })` puts other steps around the page shown while the editor is open, with the same
  checks as `initialHistory`; the page itself does not change, and nothing is told to `onChange` or `onAction`.
  It says `false`, and changes nothing, if a page cannot be opened. A change that is pending in a panel is left as
  it is. Because nothing is told to `onChange`, store the steps yourself after you set them.
- **Size.** Every step is a whole page. We measured a page of 300 blocks (113 kB): 100 steps are 11.7 MB as JSON,
  and `JSON.stringify` of them takes about 25 ms. A page of 2000 blocks (784 kB) with 100 steps is 79 MB. Keep 10
  to 20 steps, and keep them when the page is saved rather than on every change if the page is large.
- **Versions to go back to** (yesterday's page, who changed what) are the host's to keep: store the page you get
  in `onChange`, or what `onAction` tells you, with the time and the person, and open the editor again with an old
  page as `data` (and a new `key`). The history of Undo is not the place for that.

### Knowing what changed: `onAction`

> Experimental.

`onChange` gives the page and nothing about how it came to be. For a log of what people did, a check on your
server, or sending only a part of the page, pass `onAction`:

```tsx
<Editor
  onAction={(action, page, prevPage) => {
    // action.type: "block.add", "block.edit", "block.delete", "block.rect", "history.undo", "sources.update"...
    // action.ids:  the blocks it was about: the one that was edited, the ones selected when it ran,
    //              or the block an add made. Empty for a change of the whole page (`page.info`, `page.theme`,
    //              `sources.update`, `phone.reset`, `phone.arrange`). The height and background of the page
    //              are edits of its root block, so `block.edit` with the id of the root.
    log(action.type, action.ids);
  }}
/>;
```

- It is called once for each command that changed the page and was kept, right after the change, with the
  page after it and the page before it (nothing is copied). A change that was still pending in a panel (a colour
  being picked) and is stored by the command that follows is told first, on its own, as a `block.edit` of its block.
- The ids are the blocks the command worked on: for `block.duplicate` and `block.group` the blocks that were
  duplicated or grouped, not the copies or the new group (look for them in `page`). For `history.undo` and
  `history.redo` they are the blocks selected before the step, not what was undone: compare the pages for that.
- Keys held down are merged by the editor into one step of history (a run of arrow keys), but each key is still a
  call, and from the second on `prevPage` is the page after the key before, not a page of the history.
- It is **not** gathered over time like `onChange`: a run of arrow keys is a run of calls. Use `onChange` (with
  `onChangeDebounce`) to store the page and `onAction` to know what happened; a host can use both.
- It is not called for something that is only being typed or dragged, for a change that was refused by
  `permissions`, or for one that changed nothing. Selecting, zooming and switching the frame are not changes of
  the page.
- The editor does not compare the two pages for you. To send only what changed, compare `page` and `prevPage`
  with the tool of your choice. The `action` names the kind of change and the blocks, so for a log that is often
  enough.
- A listener that throws is reported in the console and does not stop the editor.

## Images

Give `config.uploadImage` and the Images panel gets an **Upload image** button, and a picture can
be set as the background of the page or of a block. It is one function:

```ts
type UploadImage = (file: File) => Promise<string>; // the address of the stored picture
```

The editor keeps the address and nothing else. What the function does with the file is the host's
choice.

**Send it to a back end** (recommended) with `postImage`. The page then holds a short address, the
picture is served from storage or a CDN, and the database stores only the address:

```tsx
import { Editor, postImage } from "@miditor/editor";

<Editor
  config={{
    uploadImage: postImage("/api/images", {
      headers: { Authorization: `Bearer ${token}` }, // optional
      // field: "file",   the name of the file in the form
      // answer: "url",   where the address is in the JSON answer; "data.url" also works
      // credentials: "include",
    }),
  }}
/>;
```

It sends the file as a `multipart/form-data` POST and reads the address from the JSON the server
answers with. A server that refuses, a broken answer or no network is shown to the person as the
reason the upload failed. What the server checks, stores and cleans up is its own business.

**Keep it in the page**, for a host with no server, with `embedImage`:

```tsx
import { embedImage } from "@miditor/editor";

<Editor config={{ uploadImage: embedImage() }} />;
// embedImage({ maxWidth: 1200, quality: 0.8 })
```

A small picture is kept as it is. A wider or heavier one is made narrower and compressed (WebP, or
JPEG where the browser has no WebP) until it fits the 200,000 characters the editor accepts for a
picture inside the page, so any photo can be used. It refuses only a picture that cannot be made to
fit. The page grows by the size of every picture, so prefer a back end when you have one. An animated
GIF that has to be shrunk stops moving.

**Your own function.** Both helpers are only an `UploadImage`, so write your own for S3, Cloudinary
or anything else; it takes the file and answers with the address:

```ts
type UploadImage = (file: File) => Promise<string>;
```

**No upload function.** The button is not drawn, and a person types the address of a picture that
is already online.

An address is accepted only if it is `https://` or `http://`, a path that starts with one `/`, or a
short `data:` PNG, JPEG, GIF, WebP or AVIF. SVG, `javascript:` and addresses with spaces or quotes
are refused, whatever the host returns. If the function throws, its message is shown to the person.

### The library

Pictures the host already has (earlier uploads, a Cloudinary or S3 folder) can be shown in the
Images panel, so a person adds one with a click. Pass them in `config.images`:

```tsx
<Editor
  config={{
    uploadImage,
    images: [
      {
        url: "https://cdn.example.com/logo.png", // the only required field
        name: "Logo", // searched, and put in the block's description
        thumb: "https://cdn.example.com/logo_s.png", // a smaller copy for the list
        width: 800, // natural size: the list lays out at once
        height: 500,
        folder: "Brand", // pictures with the same folder are grouped under Folders
        tags: ["logo", "dark"],
      },
    ],
  }}
/>;
```

The panel has a search box, an Images tab and a Folders tab (only when some picture has a `folder`).
Pictures keep their own shapes in the list. Search looks in the name, folder and tags and ignores
accents (`hoa` finds `Hòa`). A picture without `width` and `height` settles into place as it loads.
The editor keeps no list: after an upload, add the new picture to your list in `uploadImage` and
pass the list again. A row with an address that cannot be drawn, or one used twice, is left out and
named in the console; other fields of a database row are ignored.

## Layers

The Layers tool on the left lists the blocks of the page as a tree, the topmost first (the last
block of a container is drawn over the others). It keeps to the look of the other panels and needs
no configuration.

- Press a line to select the block; Shift, Ctrl or Cmd adds blocks of the same level, which are the
  ones that can be grouped. A block that holds others opens and shuts with its arrow.
- Pointing at a line lights the block on the page, and pointing at a block on the page lights its line.
- Selecting a block on the page opens the tree down to it and scrolls its line into view.
- Up and Down move through the list, Right and Left open and shut a block (Left on a closed block goes to the one it is in), Enter selects.
- A line shows the name of the kind in the language of the editor and, for a kind with words in it, the first of them.

Renaming, hiding, locking and reordering by dragging a line are not there yet.

## On the canvas

- Pointing at a block outlines it and names its kind; the selected block carries a solid tag.
- Press a block that is not selected and drag: it is selected and moved in the same press.
- Select several blocks (draw a box over them, or Shift+click) and they get one frame: drag any of
  them to move the group, and turn the handle above the frame to turn the group around its middle.
  Nothing is added to the page: let go of the selection and the frame is gone. A click on one block
  of the frame picks that block alone. Resizing the group is not there yet.
- Tab on the canvas selects the blocks one after the other (Shift+Tab goes back), at the end of the
  level it goes on to the next control. Enter on a group goes into it, Esc comes back out. A screen
  reader is told what is selected, added or removed.
- Right-click a block for its menu: duplicate, delete, order in the stack, group and ungroup.
- Drag a card from the Blocks panel onto the page to add it where you let go, into the block under
  the pointer when that block can hold it. Pressing a card still adds it in the middle. Esc cancels
  a drag, and letting go off the page adds nothing.
- An empty page offers a first block.
- Nothing selected means the page is: the panel on the right shows its settings (info, size,
  background, colours and fonts). With a block selected, "‹ Page" above its name goes back.
- The page is as tall as you make it: drag the handle on its bottom edge, or type a height under
  Size in the Page settings on the right (shown when no block is selected). It is stored as `minHeight` in the page's styles (200 to 20000 px)
  and `<Render>` draws the page that tall. It cannot be made shorter than what the blocks need.
- The arrow keys move the selected blocks 1 px, 10 px with Shift; a run of presses is one undo step.
- Enter on a block with words goes into them, like a double press.
- Alt+click selects the block under the selected one, and again goes down through the layers.
- Hold Alt to see the distance in px from the selected block to its neighbours and to the edges of
  its parent, while dragging it or while pointing at another block of the same parent.

## Zoom

The toolbar has zoom controls (25% to 200%) and a Fit button. Ctrl or Cmd with `+`, `-` and `0`
zoom the canvas, not the browser, while the editor has focus. Ctrl or Cmd with the mouse wheel (or a
pinch on a trackpad) zooms around the pointer. Zoom changes only how the page is
shown: block sizes and positions stay in the page's own px.

## Align

The Advanced tab has an Align section. With several blocks selected, the six buttons line them up
with each other, and Across and Down (three or more blocks) make the gaps between them equal. With
one block selected it lines up with its parent. Blocks that are turned are lined up by the box they
would have without the turn.

## Opacity and shadow

Every block has an **Effects** section in the Design tab: an opacity slider (0 to 100, where 100 is the default and stores nothing) and a shadow with the presets None, Soft, Medium and Strong. Under a shadow you can set X, Y, Blur, Spread, Strength and the colour. Turning a block is the Rotation field in the Advanced tab, or the handle on the canvas.

In the saved page they are two optional style keys, drawn the same on a phone and on a desktop, and `<Preview>` shows them too:

```json
{
  "styles": {
    "opacity": 40,
    "shadow": { "x": 0, "y": 4, "blur": 16, "spread": 0, "color": "#000000", "opacity": 22 }
  }
}
```

`shadow.color` is a `#rrggbb` colour or a theme colour name. Changing either counts as an edit, so `canEdit: false` refuses it.

## The phone layout

A page you only edit on the desktop still gets a phone page. While **no block has a place of its own for the
phone**, the phone draws the page as a flow, not as a shrunk copy of the desktop:

- Blocks come in reading order, top to bottom and left to right. Blocks that sit side by side on the desktop
  are a row of their own, and small ones that would not fit side by side share the width of the row.
- A big block takes the width of the phone. A small one (up to 300 by 64 px: a button, a logo, an icon) keeps
  its own width and sits on the side it was on; a text sits on the side its words are aligned to.
- A text grows with what it says, and its size is `20 px` or less as it is, and half of what is over `20`
  above that. A box with blocks inside lays them out the same way.
- Blocks that overlap, and shapes or pictures within 48 px of each other (a cup made of ellipses, with beans
  around it), stay one piece with their shape.
- The page is at least 812 px tall (`styles.phoneMinHeight` sets it), and as tall as its blocks above that.

The first change you make to the phone layout (a drag, a resize, a turn, an arrow key, a typed place, Align)
**places every block where it is drawn** and then makes your change, in one step: one undo goes back to the
flow. From then on the page is placed by hand for the phone, and a change on the desktop no longer moves the
phone. A block you add to such a page goes at the bottom of the phone layout.

**Arrange for phone** (in the panel of the page, on the phone, after a question) takes back every place and
text size set for the phone, and the phone follows the desktop again. A page with only blocks in the flow, and
a render with `device="phone"` of a page that has any block placed for the phone, are drawn as they were: shrunk
by `375 / 960`, with texts that do not go under 12 px. `<Render responsive>` has both layouts in one page, so a
published page matches the editor.

The height of the page is one number for each screen: `styles.minHeight` on the desktop, `styles.phoneMinHeight`
on the phone. In the editor the Height field and the handle at the bottom of the page change the screen being
shown, and Auto takes the height back.

## Button actions

A button can do something on your page when it is pressed. The page data holds only a name and a few
values, never code: you decide what each name means.

Tell the editor what a button can do:

```tsx
<Editor
  data={page}
  config={{
    actions: [
      {
        name: "add-to-cart",
        label: "Add to cart",
        params: [
          { name: "sku", label: "Product code" },
          { name: "qty", label: "How many", type: "number" },
        ],
      },
    ],
  }}
/>;
```

A button's properties then get an Action list and a field for each value of the chosen action.
Without `actions` a button has only its link.

Handle it where you draw the published page:

```tsx
<Render
  data={page}
  onAction={(action, payload, nodeId) => {
    /* your code */
  }}
/>;
```

`payload` holds text (up to 200 characters), numbers and yes or no values, at most 8 of them. When a
button has an action and `onAction` is given, the action wins over the link; without `onAction`
the button falls back to its link. Inside the editor a button does nothing.

## Languages

The editor speaks English. Another language is a set of sentences passed in `i18n`:

```tsx
import { vi } from "@miditor/editor/locales/vi";

<Editor i18n={{ locale: "vi", messages: vi }} />;
```

- `locale` is put on the editor as `lang`, so a screen reader speaks it in the right voice.
- `messages` is a whole translation or part of one. A sentence left out is said in English. `en` is
  exported to show every key; `Messages` is the type of a whole translation, so a translation of
  your own that misses a key does not compile.
- `translate` is for a system that already has an i18n library. It is asked first for every
  sentence, with the key, the values and the `fallback` the editor would say without it:

```tsx
// i18next: a missing string shows the fallback, not the key
<Editor
  i18n={{
    translate: (key, params, fallback) => t(`editor.${key}`, { ...params, defaultValue: fallback }),
  }}
/>;
```

The order is `translate`, then `messages`, then English. A sentence has places written `{name}`; the
editor fills them in for `messages` and for the fallback, and leaves what `translate` returns as it
is.

**Your own kinds of block** need nothing: a kind or a field you register keeps the text it was
registered with. To translate one, give a key in `messages` (or answer it in `translate`):
`kind.Hero.label` for the name, `category.Marketing` for its group, `field.Hero.title` and
`field.Hero.title.help` for a field, `group.Style` for a section and `option.pill` for a choice. The
kinds the editor ships have keys in the same shape, so a translation of them is in the packs.

**What is not translated yet:** the words used to find a block (`keywords`) stay English, so in
another language a block is found by its translated name and by its English keywords. The text of
your own `actions`, fonts and themes is yours. Messages for the developer in the console stay
English. Right-to-left is not supported: the editor sets `lang` but not `dir`.

## Page info

The Page settings on the right, shown when no block is selected, have a Page info section: a title, a description and a share picture. With
`config.uploadImage` the share picture is uploaded like the background of the page; without it, a
person types a full `https://` address. A social network only reads a full `https://` address, so
for the share picture your upload should answer with one (a `data:` address from `embedImage` is
fine to try things out but is not shown in a share). They are saved in `data.meta`. `<Render>` draws no head, so you put them there:

```tsx
import { pageMeta } from "@miditor/render";

const { title, description, image } = pageMeta(page); // each may be undefined
```

Use them for `<title>`, `<meta name="description">` and `og:` tags, or in your framework's metadata
function. Anything that is not valid comes back as no value.

## Your own blocks

```tsx
const components: Registry = {
  Heart: {
    label: "Heart",
    category: "From your website",
    icon: "heart",
    size: { w: 120, h: 100 },
    canContain: false,
    defaultProps: { color: "#e11d48" },
    fields: { color: { type: "color", label: "Colour" } },
  },
};

const renderers = {
  Heart: ({ props, theme }) => <HeartIcon color={resolveColor(props.color, theme)} />,
};

<Editor config={{ components, renderers }} />;
```

`components` is put on top of the built-in kinds, so a name can also replace one. The fields you
declare become the controls in the Properties panel. Draw the kind with the same `renderers` in
`<Render>` so the published page matches the editor.

### Choose from a list you keep

> Experimental.

An `external` field stores a pick from a list that lives in your system (pages, products, articles). You
give the editor a search for it:

```tsx
fields: { page: { type: "external", label: "Page", source: "pages" } },

<Editor
  config={{
    components,
    sources: { pages: { search: (query, signal) => fetchPages(query, { signal }) } },
  }}
/>;
```

- `search(query, signal, ctx)` answers with `{ id, label }` items. It is asked with an empty text when the
  panel opens and again, a moment after the last key, as the person types; an earlier question is aborted
  through `signal`, so stop your request when it is.
- The panel shows Loading, the items, "Nothing found" or an error when `search` rejects.
- The stored value is `null` or `{ id, label }`; a Clear button stores `null`. Keep your own data by the
  `id`: the label is only what the person saw when they chose.
- An item may also carry `data`, any plain JSON that a block shows of it (a title, a price, a picture). It is
  stored in the page with the item, as `{ id, label, data, at }`, where `at` is the time it was taken. A block
  reads it as `props.<field>.data`. `data` may take at most 8000 bytes of JSON; an item with more, or with
  data that is not plain JSON, is refused when the person picks it, with a message. `hint` (a short text) and
  `image` (an address) on an item are for the list only and are not stored. A page that holds only `{ id, label }`
  stays valid.
- `metadata` on `<Editor>` is plain JSON about your side (a language, a shop, who is editing). It is not stored
  in the page; each `search`, `get` and `getMany` gets it as `ctx.metadata`, and the renderer of each of your kinds
  (`config.renderers`) gets it as `context.metadata`. Give the same `metadata` to `<Render>` (below) so a block draws
  the same in the editor and on the published page. A `search` that takes only `(query, signal)` still works.
- The stored `data` is a snapshot. To tell when it is out of date, give the source a `getMany(ids, signal, ctx)`
  (one call for the page; it answers `{ [id]: item | null }`, `null` for an item that is gone) or a
  `get(id, signal, ctx)`. When a page opens, when `metadata` changes and when you call
  `controller.checkSources()`, the editor asks for the items the page holds (each id once, `getMany` in chunks of 100,
  `get` five at a time, 15 seconds at most for a call) and compares the answer with what is stored: label and
  `data`, not the time `at`. If some blocks have newer data the header says "N blocks have newer data" with an
  **Update** button. **Nothing changes in the page, and `onChange` is not called, until Update is pressed**; Update takes the
  newer data into every such block as one step of history (Undo brings the old data back and the message with it).
  An item the source says is gone (`null`) is not touched: its field says "No longer in the source" and the block keeps
  what it had. An id the answer leaves out, a call that fails or one that is too slow is "could not check", never "gone".
  Only blocks the person may edit (`permissions.canEdit`) are asked about and updated. A source with neither `get` nor
  `getMany` is not checked. Have `get`, `getMany` and `search` answer the same `data` for an item, and an item whose `id` is
  the one asked for and whose `label` is a string: any other answer counts as "could not check". A call that rejects (even with
  an `AbortError` of your own) is "could not check", never "gone".
- **A snapshot or a reference.** A field says what the page keeps of the chosen item: `store: "snapshot"` (the
  default) the item's `data` as above, so the page draws with no call; `store: "reference"` only `{ id, label }`,
  never `data` or `at`. For a value that must be right when the page is looked at (a price, stock). In the editor
  the canvas draws a reference with the data its source gave (read through `getMany` or `get` when the page opens,
  and from the item picked in the search); that data is never written into the page, never reaches `onChange`, and
  the "newer data" message and Update leave references alone. A reference whose source has neither `get` nor
  `getMany` shows a note in its panel and the block is drawn with `data` missing. The renderer of the kind reads
  `props.<field>.data` for both, so it must cope with it being missing.
- **Filling the data where the page is drawn.** `<Render>` never calls the network. For a page whose fields keep
  references, call `resolveSources(page, registry, sources, { signal, metadata })` (from `@miditor/editor`, or
  `@miditor/core`) where you like (when you build the page, on your server, in the browser) and give `page` of the
  answer to `<Render>`. It asks each source once for all the ids (see above), fills `data` of the `external`
  values that keep a reference (pass `{ snapshots: true }` to refresh the snapshots too), and never throws for a source: it also returns `failed`, a list of
  `{ nodeId, source, id }` for items that are gone or could not be loaded, which stay as they were; a reference whose item is gone is drawn with no data, never with an old snapshot's.
  The data of a reference is drawn whole (the 8000-byte limit is only for what the page stores).
  Switching a field from snapshot to reference leaves old `data` in stored pages, ignored; the other way, the page
  shows the "newer data" message until Update.
- A `source` with no entry in `sources` shows a note and warns once. An `external` field works inside a list
  or a group too.

### Put a tool of your own on the rail

> Experimental.

```tsx
function ShopPanel({ editor, label }: HostToolPanelProps) {
  return <button onClick={() => editor.addBlock("Product")}>Add a product</button>;
}

<Editor
  config={{ tools: [{ id: "shop", label: "Shop", icon: <ShopIcon />, panel: ShopPanel }] }}
/>;
```

- The tool goes on the rail after the editor's own, and its panel is drawn beside the canvas when it is
  chosen. The panel gets the control object (`editor`) and the `label`.
- `id` is lower case letters, digits and `-`, and not `blocks`, `layers`, `images` or `themes`. A bad or
  repeated id is left out with one warning. Translate `label` yourself.
- `icon` is a name of the editor's icons or a node of yours; without it the rail shows the first two
  letters of the label.
- In a layout of your own, `<Editor.Tool id="shop" />` draws the panel of any tool on its own.
- The `rail` and `panelStart` places of `overrides` see your tools like the editor's.

### Lists and groups of values

> Experimental.

A field can be a list (`array`) or a group of named values (`object`), for things like the entries of a
menu:

```tsx
fields: {
  items: {
    type: "array",
    label: "Entries",
    minItems: 1,
    maxItems: 5,
    item: {
      type: "object",
      label: "Entry",
      fields: { label: { type: "text", label: "Label" }, link: { type: "link", label: "Link" } },
    },
  },
}
```

- The panel shows a row for each item, with Move up, Move down and Remove, and an Add button. Add stops
  at `maxItems` and Remove stops at `minItems`. A list is never longer than 100.
- Inside a list or a group a field can be any type except `image`, `action` and `payload` (they need
  the context of the whole block), nested at most three deep. A field inside has no `group`,
  `perDevice` or `help`. A `custom` field works as an item.
- A new item starts empty (an empty text, the first choice, `false`, `0` or the field's `min`).
- The whole value is one step of history. Words and numbers are stored when the input is left or Enter
  is pressed. A value the fields refuse is not stored.
- Copy, paste and duplicate need nothing: the value is plain JSON in the block's props.

### Draw the input of a field yourself

> Experimental.

The built-in field types cover text, numbers, choices, colours, pictures, links, fonts and actions. For
anything else (a product picker, a map point, a form of your own) declare a `custom` field and give the
editor the input that edits it:

```tsx
import type { CustomFieldProps } from "@miditor/editor";

const components: Registry = {
  Product: {
    label: "Product",
    canContain: false,
    defaultProps: { product: { id: "p1", name: "Blue mug" } },
    fields: { product: { type: "custom", label: "Product", kind: "product-picker" } },
  },
};

function ProductPicker({ label, value, onChange, readOnly }: CustomFieldProps) {
  return <MyPicker label={label} value={value} disabled={readOnly} onPick={onChange} />;
}

<Editor config={{ components, customFields: { "product-picker": ProductPicker } }} />;
```

- `kind` names the input; it is lower case letters, digits and `-`, and it is the key in `customFields`.
  The registry stays plain data, so the input itself is not in it.
- The value is any JSON. The editor stores it as the prop and does not look inside, so check what you
  need in your input and in your server. It is one step of history, and undo brings the old value back.
- The input gets `name`, `label`, `value` (what is stored, or the kind's default), `onChange(value)`,
  `readOnly` (true when `permissions.canEdit` refuses the block), `nodeId` and `editor` (the control
  object, see `useEditor`). It is not made again when its value changes, so it keeps its own state and
  focus.
- A kind with no input in `customFields` shows a short note in the panel and one warning in the console.
- The `field` place of `overrides` still wraps a custom field like any other.

## Theme

A page can carry a theme: named colours and a font for the whole page. A colour set to a theme
colour is stored as `@name`, so changing the theme colour changes every place that uses it. The
theme is edited in the page settings on the right (nothing selected).

## Themes

The Themes tool on the left puts a theme on the whole page: its colours and its font, in one step
(and one undo). It has two lists:

- **Your themes:** a person makes one by changing the colours and the font in the page's settings,
  then pressing "Save current theme". They can rename and delete them.
- **Suggested:** the ones marked `readonly: true`, to start from.

The page keeps no list of themes. The host keeps them (in a database, say), passes the whole list in
`config.themes` and is told when a person saves, renames or deletes one. Each theme has an `id` the
host gives it. Without `onThemeSave` there is no Save button; without `onThemeRename` or
`onThemeDelete` there is no way to rename or delete. If one of them throws or rejects, the panel says
so and keeps nothing. Putting a theme on the page copies its colours and font into the page, so a
page does not change when a theme is later deleted.

```tsx
const [mine, setMine] = useState(loadFromDatabase);

<Editor
  data={page}
  config={{
    themes: [
      ...mine,
      {
        id: "sea",
        name: "Sea",
        readonly: true,
        colors: { primary: "#0e7490", accent: "#f97316", paper: "#ecfeff" },
        font: "Lora, Georgia, serif",
      },
    ],
    onThemeSave: async (theme) => setMine([...mine, await api.createTheme(theme)]),
    onThemeRename: async (id, name) => {
      await api.renameTheme(id, name);
      setMine(mine.map((t) => (t.id === id ? { ...t, name } : t)));
    },
    onThemeDelete: async (id) => {
      await api.deleteTheme(id);
      setMine(mine.filter((t) => t.id !== id));
    },
  }}
/>;
```

Give every theme the same colour names. A block that uses a colour by name (`@primary`) changes with
the theme; a block with a colour or a font of its own is left as it is; and a block that uses a
name the new theme does not have keeps the colour it showed, so none loses its colour.

## Fonts

You decide which fonts people can use. Give the editor a list:

```tsx
<Editor
  data={page}
  config={{
    fonts: [
      { name: "Inter", stack: "Inter, system-ui, sans-serif", group: "Sans serif" },
      { name: "Lora", stack: "Lora, Georgia, serif", group: "Serif" },
    ],
  }}
/>;
```

People pick from this list, nothing is typed: for the whole page (Font in the page settings) and for
each text and button (Font in its properties, with "Page font" as the default). The font stack is
stored in the page, so a published page still shows the font if you later change the list. A stack
uses letters, digits, spaces, commas, hyphens and single quotes only (`'Playfair Display'`). You
load the fonts yourself (Google Fonts, `@font-face`); the editor only names them. Without a list the
fonts every browser has are offered. Pages that used the old `body` and `heading` roles still show as
they did.

`config.theme` is the theme of a **new** page: it is used only when the editor opens without `data`.
A page you pass in keeps the theme it has, or none.
