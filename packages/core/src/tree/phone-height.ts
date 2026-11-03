import { lowestPageHeight } from "../position/page-floor";
import { boxFor, DEVICE_WIDTH } from "./device";
import { isFreeNode } from "./free-box";
import type { TreeNode } from "./types";

/** The gap, in px, between the lowest block and the bottom of a page that fits its blocks. */
export const PHONE_PAGE_PADDING = 16;

/**
 * How tall the page is on a phone when nobody has set it: just tall enough for every block as it is
 * placed on the phone, and a little more so that none touches the edge. Never under the shortest page.
 */
export function phonePageHeight(root: TreeNode): number {
  const boxes = root.children.flatMap((child) =>
    isFreeNode(child) ? [boxFor(child, "phone")] : [],
  );
  if (boxes.length === 0) return lowestPageHeight([], DEVICE_WIDTH.phone);
  return lowestPageHeight(boxes, DEVICE_WIDTH.phone) + PHONE_PAGE_PADDING;
}
