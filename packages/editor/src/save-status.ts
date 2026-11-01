import type { MessageKey } from "./i18n/en";

/** How the page is stored, as the host tells the editor, or as the editor tells from its Save button. */
export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

/** The sentence (see `i18n/en.ts`) the header says for each state. */
export const STATUS_KEY = {
  saved: "status.saved",
  unsaved: "status.unsaved",
  saving: "status.saving",
  error: "status.error",
} as const satisfies Record<SaveStatus, MessageKey>;

/**
 * The state the header shows, or `undefined` for none. The host's own word wins, except that a change
 * still waiting for its delayed `onChange` is not saved yet, whatever the host last said. Without a
 * word from the host the header follows the Save button, and only when there is one.
 */
export function resolveStatus(
  host: SaveStatus | undefined,
  own: { hasSave: boolean; clean: boolean; waiting: boolean },
): SaveStatus | undefined {
  if (host !== undefined) return own.waiting && host === "saved" ? "unsaved" : host;
  if (!own.hasSave) return undefined;
  return own.clean ? "saved" : "unsaved";
}
