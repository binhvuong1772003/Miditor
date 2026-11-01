import type { HostTheme, SavedTheme } from "@midito-kitchen/editor";
import type { PageStorage } from "./storage";

/**
 * Where the playground keeps the themes a person saved. It stands in for the host's database: the
 * editor never reads this, it only calls `onThemeSave`, `onThemeRename` and `onThemeDelete`.
 */
export const THEMES_KEY = "midito-playground-themes";

/** The saved themes, or none when nothing is stored or the stored text is not a list. */
export function loadThemes(storage: PageStorage): HostTheme[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(THEMES_KEY) ?? "[]");
    return Array.isArray(value) ? (value as HostTheme[]) : [];
  } catch {
    return [];
  }
}

export function storeThemes(storage: PageStorage, themes: readonly HostTheme[]): void {
  try {
    storage.setItem(THEMES_KEY, JSON.stringify(themes));
  } catch {
    // The browser refuses to store: the themes last until the page is closed.
  }
}

/** The theme with an id of its own, which a real host would take from its database. */
export function withId(theme: Omit<SavedTheme, "id">, taken: readonly HostTheme[]): HostTheme {
  let id = `t${Date.now().toString(36)}`;
  while (taken.some((other) => other.id === id)) id += "x";
  return { id, ...theme };
}
