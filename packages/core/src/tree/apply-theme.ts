import type { Registry } from "../registry/types";
import { type SavedTheme, themeOf } from "../styles/saved-theme";
import { replaceColor } from "./replace-color";
import type { PageData } from "./types";

/**
 * The page with this theme in place of its own: the colours and the font of the whole page. A block
 * that uses a colour of the old theme which the new one does not have keeps the colour it showed,
 * baked in as `#rrggbb`, so no block loses its colour. A block with a colour or a font of its own is
 * not touched, and neither is anything else on the page. The very same page comes back when the
 * theme is the one it has.
 */
export function applyTheme(
  data: PageData,
  registry: Registry,
  saved: Pick<SavedTheme, "colors" | "font">,
): PageData {
  const next = themeOf(saved);
  const root = Object.entries(data.theme?.colors ?? {})
    .filter(([name]) => !Object.hasOwn(saved.colors, name))
    .reduce((tree, [name, colour]) => replaceColor(tree, registry, name, colour), data.root);
  const { theme: _old, ...rest } = data;
  const withTheme = Object.keys(next).length > 0 ? { ...rest, theme: next } : rest;
  const done = { ...withTheme, root };
  return JSON.stringify(done) === JSON.stringify(data) ? data : done;
}
