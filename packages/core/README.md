# @miditor/core

The page format of Miditor and its checks, with no React and no DOM. Use it on your server to check a page
before you store it, and in tools that read or write pages.

```ts
import { builtInRegistry, emptyPage, migratePage, validatePage } from "@miditor/core";

const opened = migratePage(body); // upgrades a page of an older version
if (!opened.ok) throw new Error(opened.reason); // "not-a-page", "too-new" or "invalid"
const issues = validatePage(builtInRegistry, opened.page);
if (issues.length > 0) throw new Error("the page is not valid");
```

What is in it:

- **The page:** `PageData` is `{ schemaVersion, root, theme?, meta? }`. `root` is a tree of nodes
  (`{ id, type, props, styles, position, children, ... }`); `emptyPage()` makes one. `migratePage` opens a
  page of any version it knows and says why when it cannot.
- **Kinds of block:** a `Registry` says which kinds exist and what a person may edit on each (`fields`).
  `builtInRegistry` is the editor's own; `validateRegistry` checks one of yours, `validatePage` and
  `validateProps` check pages and props against one. Field types: `text`, `number`, `select`, `boolean`,
  `color`, `image`, `link`, `font`, `action`, `payload`, `custom`, `array`, `object`, `external`.
- **Position and tree maths** the editor uses (`resolveRect`, `moveRect`, `groupNodes`, `reorderNode`...).
  They are plain functions of data and are tested without a browser.

The page is plain JSON; a page that comes from outside is never trusted until `migratePage` and
`validatePage` have passed it. See [Getting started](../../docs/GETTING-STARTED.md) and
[VERSIONING](../../docs/VERSIONING.md).

## Sources of items: `resolveSources`

An `external` field can keep a reference (`store: "reference"`): the page holds only `{ id, label }` of the item
the person picked from a list your system keeps. To draw such a page, fill the data in where you like (at build,
on your server, in the browser) and give the result to `<Render>`, which never calls the network:

```ts
import { resolveSources } from "@miditor/core";

const { page, failed } = await resolveSources(stored, registry, {
  products: {
    search: (query, signal) => findProducts(query, { signal }),
    getMany: (ids, signal) => loadProducts(ids, { signal }), // { [id]: item | null }, or give `get(id, signal)`
  },
});
```

Each id is asked once (`getMany` in chunks of 100, `get` five at a time, 15 seconds a call); it never throws for a
source. An item that is gone or could not be loaded is listed in `failed` (`{ nodeId, source, id }`) and is drawn
without data. Snapshots are left as the page holds them unless you pass `{ snapshots: true }`. See the editor's
README for the rest (`ExternalSource`, `metadata`, checking a page when it opens).
