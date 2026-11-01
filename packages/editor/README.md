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

## Page info

The Page settings on the right, shown when no block is selected, have a Page info section: a title, a description and a share picture (a full
`https://` address). They are saved in `data.meta`. `<Render>` draws no head, so you put them there:

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
