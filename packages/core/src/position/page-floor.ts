import { MAX_PAGE_HEIGHT, MIN_PAGE_HEIGHT } from "../styles/page-height";
import { resolveRect } from "./resolve-rect";
import type { FreeBox } from "./types";

/** Whether every box lies wholly inside a page of this width and height. */
const allFit = (boxes: readonly FreeBox[], width: number, height: number) =>
  boxes.every((box) => {
    const rect = resolveRect(box, { w: width, h: height });
    return rect.y >= 0 && rect.y + rect.h <= height + 1e-6;
  });

/**
 * The shortest page, in whole px, that still holds every box: the one a page may be made no shorter
 * than. It is worked out the way the boxes are placed, so a box that hangs from the bottom edge, one
 * that is centred or one that is sized in percent each count for what they need, not for where they
 * are now. It is never under the shortest page, and it is the tallest page when no page holds them.
 */
export function lowestPageHeight(boxes: readonly FreeBox[], width: number): number {
  if (allFit(boxes, width, MIN_PAGE_HEIGHT)) return MIN_PAGE_HEIGHT;
  if (!allFit(boxes, width, MAX_PAGE_HEIGHT)) return MAX_PAGE_HEIGHT;
  // Whether a taller page holds them follows from whether a shorter one does, so halve the range.
  let low = MIN_PAGE_HEIGHT;
  let high = MAX_PAGE_HEIGHT;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (allFit(boxes, width, middle)) high = middle;
    else low = middle;
  }
  return high;
}
