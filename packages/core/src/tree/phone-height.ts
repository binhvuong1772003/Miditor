import { lowestPageHeight } from "../position/page-floor";
import { isPageHeight } from "../styles/page-height";
import type { Device } from "./device";
import { boxFor, DEVICE_WIDTH } from "./device";
import { isFreeNode } from "./free-box";
import { isPhoneAuto } from "./phone-flow";
import type { TreeNode } from "./types";

/** The gap, in px, between the lowest block and the bottom of a page that fits its blocks. */
export const PHONE_PAGE_PADDING = 16;

/** The shortest a phone page is when nobody has set it: a common phone screen (375 by 812). */
export const PHONE_PAGE_MIN_HEIGHT = 812;

/**
 * How tall the page is on a phone when nobody has set it: as tall as every block needs, as it is placed
 * on the phone, with a little more so that none touches the edge, and no shorter than a phone screen.
 */
export function phonePageHeight(root: TreeNode): number {
  const boxes = root.children.flatMap((child) =>
    isFreeNode(child) ? [boxFor(child, "phone")] : [],
  );
  const needed =
    boxes.length === 0 ? 0 : lowestPageHeight(boxes, DEVICE_WIDTH.phone) + PHONE_PAGE_PADDING;
  return Math.max(PHONE_PAGE_MIN_HEIGHT, needed);
}

/**
 * The height, in px, the page has on a screen when it is not left to fill its box: the one set for the
 * screen, or on a phone with free blocks the one they need. `undefined` when the page fills its box.
 */
export function pageHeightOn(root: TreeNode, device: Device): number | undefined {
  const own = (height: unknown) => (isPageHeight(height) ? height : undefined);
  if (device === "desktop") return own(root.styles?.minHeight);
  if (isPageHeight(root.styles?.phoneMinHeight)) return root.styles.phoneMinHeight;
  // A page of blocks in the flow is as tall as they are, on any screen: there is nothing to fit.
  if (!root.children.some(isFreeNode)) return own(root.styles?.minHeight);
  // Drawn as a flow, the page is as tall as what is in it, and no shorter than a phone screen.
  if (isPhoneAuto(root)) return PHONE_PAGE_MIN_HEIGHT;
  return phonePageHeight(root);
}
