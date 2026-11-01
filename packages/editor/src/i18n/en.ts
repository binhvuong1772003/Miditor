/**
 * Every word the editor says to a person, in English: the source of truth for the keys. `{name}` is
 * a place for a value the editor gives. A translation (`locales/`) has the same keys and the same
 * places, which the compiler and a test check.
 */
export const en = {
  "header.undo": "Undo",
  "header.undoTitle": "Undo (Ctrl+Z)",
  "header.redo": "Redo",
  "header.redoTitle": "Redo (Shift+Ctrl+Z)",
  "header.frame": "Frame",
  "header.desktop": "Desktop",
  "header.phone": "Phone",
  "header.zoom": "Zoom",
  "header.zoomOut": "Zoom out",
  "header.zoomOutTitle": "Zoom out (Ctrl or Cmd and -)",
  "header.zoomIn": "Zoom in",
  "header.zoomInTitle": "Zoom in (Ctrl or Cmd and +)",
  "header.zoomResetTitle": "Back to 100% (Ctrl or Cmd and 0)",
  "header.fit": "Fit",
  "header.fitTitle": "Make the whole page fit the canvas",
  "header.save": "Save",
  "status.saved": "Saved",
  "status.unsaved": "Unsaved changes",
  "status.saving": "Saving…",
  "status.error": "Couldn't save",
  "rail.label": "Tools",
  "rail.blocks": "Blocks",
  "rail.images": "Images",
  "rail.themes": "Themes",
  "rail.hide": "Hide {name}",
  "panel.canvas": "Canvas",
  "panel.properties": "Properties",
} as const;

/** The name of one thing the editor says. */
export type MessageKey = keyof typeof en;

/** A whole translation: every key, none missing and none extra. */
export type Messages = Record<MessageKey, string>;
