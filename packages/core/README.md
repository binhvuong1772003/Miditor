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
