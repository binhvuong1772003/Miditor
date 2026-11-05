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

## `responsive={{ scale: true }}`

Between the phone layout (up to `breakpoint`, 640 px by default) and the width of the desktop page (960 px),
the blocks of a desktop page can crowd each other: the text is the same size in a narrower box, so it wraps and
runs into what is under it. `scale: true` draws the desktop page smaller as a whole in that range, as one
picture, with its text, heights, distances and borders:

```tsx
<Render data={page} responsive={{ scale: true }} />;
```

- It is CSS only, with no script: a server render is right on the first paint. The page is zoomed (CSS `zoom`)
  in steps of 16 px of width, to the lowest width of the step, so it never comes out wider than its box.
- `scale: { from: 1200 }` takes another width for the desktop page. At and above it, and at and below the
  breakpoint, nothing is scaled.
- The cost: at 641 px the page is drawn at two thirds of its size, so 16 px text is about 10.7 px. A higher
  `breakpoint` keeps text larger by giving the phone layout earlier.
- The page is put in a box of its own (`data-miditor-scale`) that the zoom is on. `zoom` is in every current
  browser (Firefox from 126); the editor draws its canvas unscaled.

## `metadata`

`<Render metadata={...}>` takes plain JSON about the host's side (a language, a currency, who is looking). Every
renderer of your kinds gets it as `context.metadata` (`undefined` when there is none), at any depth. It is not part
of the page, and the blocks the library draws ignore it. Give the editor the same value (`<Editor metadata>`) and a
block draws the same in both.
