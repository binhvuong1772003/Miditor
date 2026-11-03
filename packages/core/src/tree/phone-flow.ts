import { resolveRect } from "../position/resolve-rect";
import type { Container } from "../position/types";
import { DEVICE_WIDTH } from "./device";
import { freeBoxOf, isFreeNode } from "./free-box";
import type { TreeNode } from "./types";

/** A block no wider than this and no taller than `COMPACT_HEIGHT`, in desktop px, keeps its own width on a phone. */
export const COMPACT_WIDTH = 230;
export const COMPACT_HEIGHT = 64;

/** The side of its parent a block sits on, on the desktop: where its auto margins push it on a phone. */
export type FlowSide = "start" | "center" | "end";

/** What a free block gets on a phone that is drawn as a flow (see `isPhoneAuto`). */
export interface FlowItem {
  /** Where it comes among its siblings: reading order, in bands of blocks that overlap vertically. */
  order: number;
  /** A button, a logo, an icon: it keeps its own width, and shares a row when it fits. Else full width. */
  compact: boolean;
  side: FlowSide;
  /** Width over height on the desktop, for a block that keeps its ratio. */
  ratio: number;
  /** Its own width and height on the desktop, in px. */
  width: number;
  height: number;
}

/**
 * Whether the page is drawn as a flow on a phone: no node in it has a placement of its own for the
 * phone. One block placed by hand there and the page keeps every other block where the shrunk desktop
 * puts it, since a block taken out of the flow would leave a hole in it.
 */
export function isPhoneAuto(root: TreeNode): boolean {
  if (isFreeNode(root) && root.phone) return false;
  return root.children.every(isPhoneAuto);
}

/** Whether any block in the tree is placed freely: a page of the flow alone has nothing to lay out for a phone. */
const hasFreeNode = (node: TreeNode): boolean =>
  node.children.some((child) => isFreeNode(child) || hasFreeNode(child));

/** Whether a phone draws this page as a flow: it has free blocks, and none is placed by hand for the phone. */
export const drawsPhoneFlow = (root: TreeNode): boolean => isPhoneAuto(root) && hasFreeNode(root);

/** The size a text gets on a phone when the page is a flow: as it is up to 20 px, half the rest above. */
export function phoneTextSize(size: number): number {
  return size <= 20 ? size : Math.round(20 + (size - 20) / 2);
}

/**
 * The flow of the free children of a parent, worked out from their desktop boxes in a parent of this
 * size: bands from the top down (a block that starts above the bottom of the band before is in it),
 * and by x inside a band.
 */
export function phoneFlowOf(parent: TreeNode, size: Container): Map<string, FlowItem> {
  const items = parent.children.flatMap((child) => {
    if (!isFreeNode(child)) return [];
    return [{ id: child.id, rect: resolveRect(freeBoxOf(child), size) }];
  });
  items.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const bands: (typeof items)[] = [];
  let bottom = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    if (bands.length > 0 && item.rect.y < bottom) {
      bands[bands.length - 1]?.push(item);
      bottom = Math.max(bottom, item.rect.y + item.rect.h);
    } else {
      bands.push([item]);
      bottom = item.rect.y + item.rect.h;
    }
  }
  const flow = new Map<string, FlowItem>();
  let order = 0;
  for (const band of bands) {
    band.sort((a, b) => a.rect.x - b.rect.x);
    for (const { id, rect } of band) {
      const middle = (rect.x + rect.w / 2) / (size.w || DEVICE_WIDTH.desktop);
      flow.set(id, {
        order: order++,
        compact: rect.w <= COMPACT_WIDTH && rect.h <= COMPACT_HEIGHT,
        side: middle < 0.4 ? "start" : middle > 0.6 ? "end" : "center",
        ratio: rect.h > 0 ? rect.w / rect.h : 1,
        width: rect.w,
        height: rect.h,
      });
    }
  }
  return flow;
}
