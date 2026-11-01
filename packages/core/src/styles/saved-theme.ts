import { isHexColor } from "./hex-color";
import { isFontStack, isTokenName, MAX_THEME_COLORS, type Theme } from "./theme";

/** How many themes a page may keep, and the longest name one may have. */
export const MAX_SAVED_THEMES = 12;
export const MAX_THEME_NAME = 40;

/**
 * A theme a person made and kept, so it can be put back on the page later: a name, the named
 * colours, and the font of the page. It is a copy; changing the theme of the page afterwards does
 * not change it.
 */
export interface SavedTheme {
  /** Unique among the page's themes: lowercase letters, digits and `-`. */
  id: string;
  /** What the person sees, such as `Hoa Sen`. */
  name: string;
  /** Colours by name, each stored as `#rrggbb`: the same shape as `Theme.colors`. */
  colors: Record<string, string>;
  /** The font stack of the whole page (`Theme.fonts.body`). Without it, the default font. */
  font?: string;
}

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

/** True for a name a theme may have: 1 to `MAX_THEME_NAME` characters, trimmed, no control characters. */
export const isThemeName = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= 1 &&
  value.length <= MAX_THEME_NAME &&
  value.trim() === value &&
  [...value].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127);

/** True only for a theme as it is stored. Data comes from outside, so every part is checked. */
export function isSavedTheme(value: unknown): value is SavedTheme {
  if (!isPlain(value)) return false;
  if (Object.keys(value).some((key) => !["id", "name", "colors", "font"].includes(key))) {
    return false;
  }
  if (typeof value.id !== "string" || !ID.test(value.id) || !isThemeName(value.name)) return false;
  if ("font" in value && !isFontStack(value.font)) return false;
  if (!isPlain(value.colors)) return false;
  const entries = Object.entries(value.colors);
  return (
    entries.length <= MAX_THEME_COLORS &&
    entries.every(([name, colour]) => isTokenName(name) && isHexColor(colour))
  );
}

/** True only for a list of at most `MAX_SAVED_THEMES` good themes with different ids. */
export const isSavedThemes = (value: unknown): value is SavedTheme[] =>
  Array.isArray(value) &&
  value.length <= MAX_SAVED_THEMES &&
  value.every(isSavedTheme) &&
  new Set(value.map((theme) => theme.id)).size === value.length;

/** The theme of a page that a saved theme stands for. */
export function themeOf(saved: Pick<SavedTheme, "colors" | "font">): Theme {
  return {
    ...(Object.keys(saved.colors).length > 0 ? { colors: { ...saved.colors } } : {}),
    ...(saved.font ? { fonts: { body: saved.font } } : {}),
  };
}

/** A theme to keep, made from the theme of a page. */
export function savedFrom(theme: Theme | undefined, id: string, name: string): SavedTheme {
  return {
    id,
    name,
    colors: { ...theme?.colors },
    ...(theme?.fonts?.body ? { font: theme.fonts.body } : {}),
  };
}

/** Whether the theme of the page is this saved theme: the same colours and the same page font. */
export function isSameTheme(
  theme: Theme | undefined,
  saved: Pick<SavedTheme, "colors" | "font">,
): boolean {
  const a = Object.entries(theme?.colors ?? {});
  const b = Object.entries(saved.colors);
  return (
    a.length === b.length &&
    a.every(([name, colour]) => saved.colors[name] === colour) &&
    (theme?.fonts?.body ?? "") === (saved.font ?? "")
  );
}
