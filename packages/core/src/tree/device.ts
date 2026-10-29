import { shrinkBox } from "../position/shrink-box";
import type { FreeBox } from "../position/types";
import { freeBoxOf } from "./free-box";
import type { FreeNode } from "./types";

/** The two screens a page is made for. */
export type Device = "desktop" | "phone";

/** How wide the page is on each screen, in px. A phone shows a desktop page at this ratio when nobody set it by hand. */
export const DEVICE_WIDTH = { desktop: 960, phone: 375 } as const satisfies Record<Device, number>;
export const PHONE_RATIO = DEVICE_WIDTH.phone / DEVICE_WIDTH.desktop;

/**
 * The placement a free node has on this screen. The desktop one is the node's own. The phone one is
 * what a person set by hand there (`node.phone`), or, when nobody did, the desktop one made smaller
 * by `shrinkBox`, so a page made on a desktop already works on a phone.
 */
export function boxFor(node: FreeNode, device: Device): FreeBox {
  if (device === "desktop") return freeBoxOf(node);
  return node.phone ?? shrinkBox(freeBoxOf(node), PHONE_RATIO);
}
