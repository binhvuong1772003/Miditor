import type { NodeStyles } from "../tree/types";
import { isPixelLength } from "./pixel-length";

/**
 * The smallest width or height a node can be resized to, in px. A box cannot be smaller than its two
 * borders, so below that the drawn size would no longer be the stored size. The border is rounded
 * the way `render` rounds it, so the two agree. Data comes from outside: anything that is not a
 * valid width counts as no border.
 */
export function minSize(styles: NodeStyles | undefined): number {
  const width = styles?.borderWidth;
  const border = isPixelLength(width) ? Math.round(width * 100) / 100 : 0;
  return Math.max(1, 2 * border);
}
