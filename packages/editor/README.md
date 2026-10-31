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

| Prop               | What it does                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `data`             | The page to open. Read once.                                                                           |
| `onSave`           | Called with the whole page when the person presses Save. The Save button shows only when it is given.  |
| `onChange`         | Called with the whole page after each change that is final (see [Saving](#saving)).                    |
| `onChangeDebounce` | A wait in ms, or `{ wait, maxWait }`, so a run of changes is one `onChange` call.                      |
| `status`           | `"saved"`, `"unsaved"`, `"saving"` or `"error"`: what the header says about the host's storing.         |
| `headerActions`    | Your own controls, drawn in the header before Save: a preview link, a Publish button.                  |
| `historyLimit`     | How many steps undo goes back. 100 by default; `Infinity` for no limit.                                |
| `className`        | An extra class on the root element.                                                                    |
| `config`           | `components`, `renderers`, `uploadImage` and `theme`; see below.                                       |

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

Give `config.uploadImage` and the Assets panel gets an **Upload image** button, and a picture can
be set as the background of the page or of a block. It is one function:

```ts
type UploadImage = (file: File) => Promise<string>; // the address of the stored picture
```

The editor keeps the address and nothing else. What the function does with the file is the host's
choice.

**Send it to a back end** (recommended). The page then holds a short address, the picture is served
from storage or a CDN, and the database stores only the address:

```ts
const uploadImage = async (file: File) => {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/images", { method: "POST", body });
  if (!response.ok) throw new Error("the server refused the picture");
  return (await response.json()).url; // "https://cdn.example.com/abc.jpg"
};
```

**Keep it in the page**, for a host with no server. Read the file as a `data:` address. The editor
accepts a `data:` address of up to 200,000 characters, which is about 150 KB of picture, so shrink
and compress the picture first; a larger one is refused with a message the person can read.

**No upload function.** The button is not drawn, and a person types the address of a picture that
is already online.

An address is accepted only if it is `https://` or `http://`, a path that starts with one `/`, or a
short `data:` PNG, JPEG, GIF, WebP or AVIF. SVG, `javascript:` and addresses with spaces or quotes
are refused, whatever the host returns. If the function throws, its message is shown to the person.

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

`config.theme` is the theme of a new page: named colours and a body and a heading font. A colour
set to a theme colour is stored as `@name`, so changing the theme colour changes every place that
uses it. A page that already has a theme keeps its own.
