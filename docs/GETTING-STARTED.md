# Getting started

This takes you from nothing to a page edited in your app, stored on your server and shown to visitors. It
was followed step by step in a clean Vite app, installed from packed files, so the commands and the code
here work as written.

Miditor is three packages:

| Package           | What it is                                | You use it                            |
| ----------------- | ----------------------------------------- | ------------------------------------- |
| `@miditor/editor` | The editor, `<Editor>`                    | In your admin, where people edit      |
| `@miditor/render` | `<Render>`, which draws a saved page      | In your public site, for visitors     |
| `@miditor/core`   | The page format and its checks (no React) | On your server, to check a page again |

The editor keeps no files, no keys and no back end. A page goes in through props and comes out through
callbacks; storing it is your job.

## 1. Install

The packages are not on npm yet (they are `0.0.0`). Until they are, install them from packed files.

In the Miditor repository:

```bash
pnpm install
pnpm build
PACKS=$HOME/miditor-packs && mkdir -p "$PACKS"
for p in core render editor; do (cd packages/$p && pnpm pack --pack-destination "$PACKS"); done
```

Each `pnpm pack` writes a file such as `~/miditor-packs/miditor-editor-0.0.0.tgz` (pnpm turns the
`workspace:` links between the packages into plain versions). In your app, point the three packages at those
files. The editor needs the two small packages too, so name them again under `overrides` (pnpm) so it uses the
packed ones, not a registry:

```json
{
  "dependencies": {
    "@miditor/core": "file:/Users/you/miditor-packs/miditor-core-0.0.0.tgz",
    "@miditor/render": "file:/Users/you/miditor-packs/miditor-render-0.0.0.tgz",
    "@miditor/editor": "file:/Users/you/miditor-packs/miditor-editor-0.0.0.tgz",
    "react": "^19",
    "react-dom": "^19"
  },
  "pnpm": {
    "overrides": {
      "@miditor/core": "file:/Users/you/miditor-packs/miditor-core-0.0.0.tgz",
      "@miditor/render": "file:/Users/you/miditor-packs/miditor-render-0.0.0.tgz"
    }
  }
}
```

Then `pnpm install`. React 18 and 19 both work. If your app lives in the same monorepo, use
`"@miditor/editor": "workspace:*"` instead and skip the packing.

## 2. Edit a page

```tsx
import { Editor, type PageData } from "@miditor/editor";
import "@miditor/editor/style.css";

export function EditPage({ page }: { page?: PageData }) {
  return (
    // The editor fills its parent, so the parent needs a height.
    <div style={{ height: "100vh" }}>
      <Editor data={page} onSave={(data) => saveToYourServer(data)} />
    </div>
  );
}
```

- Import `style.css` once. The editor's classes are scoped (CSS Modules), so they do not collide with yours.
- `data` is read once, when the editor mounts. It keeps its own working copy from then on. To open another
  page, give the editor a new `key`. Without `data` it opens an empty page.
- `onSave` is called when the person presses Save, with the whole page as plain JSON. The Save button shows
  only when you give `onSave`.
- For autosave use `onChange` (called after each change that is final) with `onChangeDebounce`, and tell the
  header how it is going with `status` (`"saved"`, `"saving"`, `"unsaved"`, `"error"`).

## 3. Store it

A saved page is JSON. Keep it as it comes, in a JSON column or a file, with whatever id your system uses:

```ts
async function saveToYourServer(page: PageData) {
  await fetch(`/api/pages/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(page),
  });
}
```

Anyone can send your server anything, so check a page again before you store it. `@miditor/core` does this
without React:

```ts
import { builtInRegistry, migratePage, validatePage } from "@miditor/core";

const opened = migratePage(body); // upgrades an older page; says why when it cannot read one
if (!opened.ok) return reject(opened.reason);
const issues = validatePage(builtInRegistry, opened.page); // pass your own kinds merged in, if you have any
if (issues.length > 0) return reject(issues);
```

Permissions you give the editor (`permissions`, `hide`) stop the editor, not a request made by hand. The check
on your server is the one that counts.

## 4. Show it to visitors

```tsx
import { Render } from "@miditor/render";

export function PublicPage({ page }: { page: PageData }) {
  return <Render data={page} responsive={{}} />;
}
```

`responsive={{}}` draws the desktop and the phone layouts at once and switches between them with CSS, with no
script, so the first paint is right on a server render. Without it, give `device="desktop"` or `"phone"`. Draw
the blocks you added yourself with the same `renderers` you gave the editor.

## 5. Try it all together

This is the whole loop in one file, as it ran in a clean Vite app (React, TypeScript, `vite build` and a click
through it in a browser): edit, press Save, see the page as a visitor would.

```tsx
import { Editor, type PageData } from "@miditor/editor";
import "@miditor/editor/style.css";
import { Render } from "@miditor/render";
import { useState } from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [page, setPage] = useState<PageData | undefined>();
  const [editing, setEditing] = useState(true);
  if (!editing && page) {
    return (
      <>
        <button type="button" onClick={() => setEditing(true)}>
          Edit
        </button>
        <Render data={page} responsive={{}} />
      </>
    );
  }
  return (
    <div style={{ height: "100vh" }}>
      <Editor
        data={page}
        onChange={setPage}
        onSave={(data) => {
          setPage(data);
          setEditing(false);
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
```

Run your dev server, add a Text block from the left panel, press Save, and the page appears drawn by `<Render>`.

## If something looks wrong

- **The editor is a thin strip or has no height.** Give its parent a height (`100vh`, or a flex or grid cell).
- **It looks unstyled.** `import "@miditor/editor/style.css"` is missing, or your bundler drops CSS from
  `node_modules`.
- **A framework that renders on the server (Next.js).** The editor draws on the server without errors, but it is a
  tool for the browser: put it in a client component (`"use client"`) on an admin route. This was not
  tried in a Next.js app here; the Vite steps above were.
- **A warning in the console starting with `[miditor]`** names the setting it did not like (a repeated tool id, a
  plugin that needs a newer version, a field with no input). Each is told once.

## Where to go next

| I want to...                               | Read                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Add my own kinds of block and fields       | `packages/editor/README.md`, "Your own blocks" and the sections on fields |
| Drive the editor from my own buttons       | "Control the editor from your code"                                       |
| Change or hide parts, or lay it out myself | "Change the editor with overrides", "Lay the editor out yourself"         |
| Let some people do less                    | "Control what people can do"                                              |
| Bundle my settings for reuse               | "Plugins"                                                                 |
| See every name I can use                   | [`docs/reference.md`](./reference.md)                                     |
| Know what may change                       | [`docs/VERSIONING.md`](./VERSIONING.md)                                   |
| Understand how it is built                 | [`ARCHITECTURE.md`](../ARCHITECTURE.md)                                   |
