import { isPageMeta, type PageData, type PageMeta, tidyMeta } from "@miditor/core";

/**
 * The title, description and share picture of a page, for the host to put in its `<head>` (a
 * `<title>`, a description and `og:` tags, or a framework's metadata function). `<Render>` draws no
 * head, since a page inside another page has none to draw. Meta that is not valid, or empty, is
 * `{}`, so the host can read each field without checking.
 */
export function pageMeta(data: PageData): PageMeta {
  return isPageMeta(data.meta) ? (tidyMeta(data.meta) ?? {}) : {};
}
