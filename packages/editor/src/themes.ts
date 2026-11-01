import { isSavedTheme, type SavedTheme } from "@midito-kitchen/core";
import type { HostTheme } from "./ThemesPanel";

/** The longest id a host theme may have. The id is only a key the host knows the theme by. */
const MAX_ID = 100;

/**
 * The host's themes that can be used. A row may come straight from a database, so only `id`, `name`,
 * `colors`, `font` and `readonly` are taken from it and any other field is left behind. A row with a
 * bad name, colour or font, with an empty or too long id, or with an id already seen is left out, and
 * said so once in the console, so the host can find out why a theme is missing.
 */
export function usableThemes(themes: readonly unknown[] | undefined): HostTheme[] {
  const seen = new Set<string>();
  const out: HostTheme[] = [];
  for (const row of themes ?? []) {
    const reason = refuse(row, seen);
    if (reason) {
      console.warn(`[midito] a theme in \`config.themes\` is left out: ${reason}`);
      continue;
    }
    const { id, name, colors, font, readonly } = row as HostTheme;
    seen.add(id);
    out.push({ id, name, colors, ...(font ? { font } : {}), ...(readonly ? { readonly } : {}) });
  }
  return out;
}

function refuse(row: unknown, seen: ReadonlySet<string>): string | undefined {
  if (typeof row !== "object" || row === null) return "it is not an object";
  const { id, name, colors, font } = row as Partial<HostTheme>;
  if (typeof id !== "string" || id === "" || id.length > MAX_ID)
    return "its id is not a text of 1 to 100 characters";
  if (seen.has(id)) return `the id "${id}" is used twice`;
  const checked: unknown = { id: "x", name, colors, ...(font === undefined ? {} : { font }) };
  if (!isSavedTheme(checked as SavedTheme))
    return `"${String(name)}" has a bad name, colour or font`;
  return undefined;
}
