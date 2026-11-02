import { isFontStack } from "@miditor/core";

/** One font the host lets people choose: the name they read and the font stack that is stored. */
export interface FontDef {
  /** What the person sees in the list, such as `Inter`. */
  name: string;
  /**
   * The CSS font stack that is set on the text and stored in the page, such as
   * `Inter, system-ui, sans-serif`. Letters, digits, spaces, commas, hyphens and single quotes
   * only (a family with spaces is written `'Playfair Display'`, not in double quotes).
   */
  stack: string;
  /** A heading to group the font under in the list, such as `Serif`. Without it, no group. */
  group?: string;
}

/**
 * The fonts every browser has, offered when the host gives none, so the list always works. The host
 * has to load any other font itself (Google Fonts, `@font-face`): the editor only names it.
 */
export const DEFAULT_FONTS: readonly FontDef[] = [
  { name: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { name: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  { name: "Monospace", stack: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace" },
];

/** The host's fonts that can be stored, or the defaults when it gives none that can. Data from outside. */
export function usableFonts(fonts: readonly FontDef[] | undefined): readonly FontDef[] {
  const good = (fonts ?? []).filter(
    (font) =>
      typeof font?.name === "string" &&
      font.name.trim() !== "" &&
      font.name.length <= 60 &&
      isFontStack(font.stack),
  );
  return good.length > 0 ? good : DEFAULT_FONTS;
}

/**
 * The name to show for a stored font stack: the name of the font in the list that has it, or the
 * first family of the stack when the host's list no longer has it.
 */
export function fontName(stack: string, fonts: readonly FontDef[]): string {
  const known = fonts.find((font) => font.stack === stack);
  if (known) return known.name;
  const first = stack
    .split(",")[0]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  return first || stack;
}

/** A stored font as the list sees it: `body` and `heading`, roles of older pages, are the page's font. */
export const listedFont = (value: unknown): string =>
  typeof value === "string" && value !== "body" && value !== "heading" ? value : "";
