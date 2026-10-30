import { isHexColor } from "./hex-color";

/**
 * The colours and fonts shared by a whole page. A block can name a colour of the theme instead of
 * carrying one (`@primary`, see `isColorRef`), so changing the theme changes every block that uses it.
 */
export interface Theme {
  /** Colours by name, each stored as `#rrggbb`. */
  colors?: Record<string, string>;
  /** `font-family` stacks: `body` for the page and `heading` for text set in that font. */
  fonts?: { body?: string; heading?: string };
}

/** The most colours a theme may have. */
export const MAX_THEME_COLORS = 32;

const TOKEN_NAME = /^[a-z][a-z0-9-]{0,31}$/;
const COLOR_REF = /^@([a-z][a-z0-9-]{0,31})$/;
const FONT_STACK = /^[A-Za-z0-9 ,'-]{1,200}$/;

/** A name a theme colour can have: a lowercase letter, then up to 31 lowercase letters, digits or `-`. */
export const isTokenName = (value: unknown): value is string =>
  typeof value === "string" && TOKEN_NAME.test(value);

/** The stored form of a reference to a theme colour: `@` and its name. */
export const colorRef = (name: string): string => `@${name}`;

/** The name inside a reference to a theme colour, or `undefined` when `value` is not one. */
export const nameOfColorRef = (value: unknown): string | undefined =>
  typeof value === "string" ? COLOR_REF.exec(value)?.[1] : undefined;

/** True for a stored colour: `#rrggbb` (see `isHexColor`) or a reference to a theme colour. */
export const isColorValue = (value: unknown): value is string =>
  isHexColor(value) || nameOfColorRef(value) !== undefined;

/**
 * A `font-family` stack that is safe to write into CSS: letters, digits, spaces, commas, `'` and `-`,
 * and at most 200 characters. A stack with a quote of another kind, a semicolon, a bracket or a
 * backslash is refused, since the text goes into a style.
 */
export const isFontStack = (value: unknown): value is string =>
  typeof value === "string" && FONT_STACK.test(value);

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** True only for a theme with good names, colours and font stacks and nothing else. Data comes from outside. */
export function isTheme(value: unknown): value is Theme {
  if (!isPlain(value)) return false;
  const { colors, fonts } = value;
  if (Object.keys(value).some((key) => key !== "colors" && key !== "fonts")) return false;
  if ("colors" in value) {
    if (!isPlain(colors)) return false;
    const entries = Object.entries(colors);
    if (entries.length > MAX_THEME_COLORS) return false;
    if (!entries.every(([name, color]) => isTokenName(name) && isHexColor(color))) return false;
  }
  if ("fonts" in value) {
    if (!isPlain(fonts)) return false;
    const entries = Object.entries(fonts);
    if (
      !entries.every(
        ([name, stack]) => (name === "body" || name === "heading") && isFontStack(stack),
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * The `#rrggbb` that a stored colour stands for: the colour itself, or the one a reference names in
 * the theme. `undefined` for anything else, a reference the theme does not have included, so the
 * caller falls back to a colour of its own. Only the theme's own colours are read: a name like
 * `constructor` is not found.
 */
export function resolveColor(value: unknown, theme?: Theme): string | undefined {
  if (isHexColor(value)) return value;
  const name = nameOfColorRef(value);
  if (name === undefined || !theme?.colors || !Object.hasOwn(theme.colors, name)) return undefined;
  const color = theme.colors[name];
  return isHexColor(color) ? color : undefined;
}
