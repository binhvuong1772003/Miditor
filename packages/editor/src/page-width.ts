import { DEVICE_WIDTH } from "@miditor/core";
import type { CSSProperties } from "react";

/**
 * The width of the page on each screen as CSS variables for the editor's root element, so the style
 * sheet reads the numbers from `DEVICE_WIDTH` in core instead of writing them a second time.
 */
export const pageWidthVariables = {
  "--_page-desktop": `${DEVICE_WIDTH.desktop}px`,
  "--_page-phone": `${DEVICE_WIDTH.phone}px`,
} as CSSProperties;
