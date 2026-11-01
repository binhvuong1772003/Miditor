# @midito-kitchen/editor

`<Editor>` is an embeddable visual page editor for React. The host app mounts it on its own route,
gives it a page, and stores what comes back. The editor keeps no files, no keys and no back end of
its own: data goes in through props and comes out through callbacks.

## Use it

```tsx
import { Editor, type PageData } from "@midito-kitchen/editor";
import "@midito-kitchen/editor/style.css";

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

Show a stored page to visitors with `<Render>` from `@midito-kitchen/render`. Pass `responsive` to
draw the desktop and the phone layouts at once, switched by CSS with no script:

```tsx
import { Render } from "@midito-kitchen/render";

<Render data={page} responsive={{}} />;
```

## Props

| Prop               | What it does                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `data`             | The page to open. Read once.                                                                          |
| `onSave`           | Called with the whole page when the person presses Save. The Save button shows only when it is given. |
| `onChange`         | Called with the whole page after each change that is final (see [Saving](#saving)).                   |
| `onChangeDebounce` | A wait in ms, or `{ wait, maxWait }`, so a run of changes is one `onChange` call.                     |
| `status`           | `"saved"`, `"unsaved"`, `"saving"` or `"error"`: what the header says about the host's storing.       |
| `headerActions`    | Your own controls, drawn in the header before Save: a preview link, a Publish button.                 |
| `historyLimit`     | How many steps undo goes back. 100 by default; `Infinity` for no limit.                               |
| `className`        | An extra class on the root element.                                                                   |
| `config`           | `components`, `renderers`, `uploadImage` and `theme`; see below.                                      |


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
import { ICON_NAMES, type IconName } from "@midito-kitchen/editor";

<Editor config={{ icons: { undo: Undo2, redo: Redo2, img: Image } }} />;
// ICON_NAMES lists every name that can be replaced
```

A name you leave out keeps the editor's icon, and so does a name the editor does not have or a value
that is not a component. Icons are decoration (the editor hides them from a screen reader and the
button keeps its own name), so yours need no label. The stroke of the editor's own icons can be set
with `--midito-icon-stroke` (1.4 by default); your icons draw their own. The kinds of block you add
name an icon from the same list.

The same can be done in CSS, on an ancestor of the editor or on its root class `className`, with the
variables below. Set only the ones you want to change:

| Variable                | Default               | What it is                                       |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `--midito-chrome`       | `#ffffff`             | The header, rail and side panels                 |
| `--midito-workspace`    | `#e4e4e7`             | The ground around the page                       |
| `--midito-canvas`       | `#ffffff`             | Fields and cards                                 |
| `--midito-soft`         | `#ececef`             | Hover and quiet fills                            |
| `--midito-border`       | `#a9a9b2`             | Dividers                                         |
| `--midito-border-input` | `#71717a`             | The edge of a field                              |
| `--midito-text`         | `#09090b`             | Text                                             |
| `--midito-muted`        | `#3f3f46`             | Quiet text                                       |
| `--midito-focus`        | `#1d4ed8`             | Focus rings and selection                        |
| `--midito-danger`       | `#b91c1c`             | Errors                                           |
| `--midito-scrollbar`    | `#71717a`             | Scrollbars                                       |
| `--midito-radius`       | `6px`                 | Fields and buttons                               |
| `--midito-radius-card`  | `8px`                 | Cards                                            |
| `--midito-control`      | `2.25rem`             | The height of a field or button                  |
| `--midito-font`         | Inter, system-ui, ... | The font of the editor                           |
| `--midito-icon-stroke`  | `1.4`                 | The line width of the editor's own icons         |
| `--midito-paper`        | `#ffffff`             | The page itself (not changed by the dark scheme) |
| `--midito-accent`       | the text colour       | The main button (Save)                           |
| `--midito-on-accent`    | the canvas colour     | The text on the main button                      |

The playground shows it: open `?host` to see the editor in a stand-in product with its own sidebar
and navbar.

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
import { Editor, postImage } from "@midito-kitchen/editor";

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
import { embedImage } from "@midito-kitchen/editor";

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
import { vi } from "@midito-kitchen/editor/locales/vi";

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
import { pageMeta } from "@midito-kitchen/render";

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
