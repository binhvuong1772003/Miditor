import type { Device } from "@midito-kitchen/core";

/** The panel the tool rail shows beside the canvas. */
export type Tool = "blocks" | "layers" | "images" | "themes";

/**
 * How the editor is looked at, none of it in the page data or its history: the width the page is shown
 * at, the zoom of the canvas, the tool of the rail and whether its panel is open, and what a screen
 * reader is told.
 */
export type ViewState = {
  frame: Device;
  zoom: number;
  tool: Tool;
  panelOpen: boolean;
  announcement: string;
};

/** What the editor keeps in its store; the pieces of state move here a few at a time. */
export type EditorState = ViewState;
