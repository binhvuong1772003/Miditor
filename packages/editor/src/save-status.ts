/** How the page is stored, as the host tells the editor, or as the editor tells from its Save button. */
export type SaveStatus = "saved" | "unsaved" | "saving" | "error";

/** What the header says for each state. */
export const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save",
};

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
