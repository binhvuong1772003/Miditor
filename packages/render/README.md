# @miditor/render

Draws a saved Miditor page for visitors. It needs React and `@miditor/core`, not the editor, so a public site
does not carry the editing code.

```tsx
import { Render } from "@miditor/render";

<Render data={page} responsive={{}} />;
```

- `data` is the saved page (`PageData`).
- `responsive={{}}` draws the desktop and the phone layouts at once and switches with CSS, with no script, so a
  server render is right on the first paint. Without it, give `device="desktop"` or `"phone"`.
- `renderers` draws the kinds of block you added yourself, by name, the same ones you gave the editor in
  `config.renderers`, so the public page matches the editor.
- `links="live"` (the default) makes buttons and links work; `links="inert"` is what the editor uses.
- `onAction(name, payload, nodeId)` is called when a visitor presses a button that has an action. The page
  holds no code: it stores the action's name and values, and your handler decides what they do.
- `pageMeta(page)` gives the title, description and share picture, for your `<head>`.

See [Getting started](../../docs/GETTING-STARTED.md).

## `metadata`

`<Render metadata={...}>` takes plain JSON about the host's side (a language, a currency, who is looking). Every
renderer of your kinds gets it as `context.metadata` (`undefined` when there is none), at any depth. It is not part
of the page, and the blocks the library draws ignore it. Give the editor the same value (`<Editor metadata>`) and a
block draws the same in both.
