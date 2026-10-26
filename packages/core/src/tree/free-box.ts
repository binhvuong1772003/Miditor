import type { FreeBox } from "../position/types";
import type { FreeNode, TreeNode } from "./types";

/** True for a node placed by constraints; narrows the type so `freeBoxOf` accepts it. */
export function isFreeNode(node: TreeNode): node is FreeNode {
  return node.position.mode === "free";
}

/**
 * The placement of a free node in the shape `resolveRect`, `cssFor`, `inferBox` and `moveRect` read.
 * The anchors and sizes are shared with the node, not copied.
 */
export function freeBoxOf(node: FreeNode): FreeBox {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.size.w,
    h: node.size.h,
    rotation: node.rotation,
  };
}

/**
 * The same node with a new placement, for example after `inferBox`. Returns a new node; the id, type,
 * props and children are the very same objects, so unchanged parts keep their identity.
 */
export function withFreeBox(node: FreeNode, box: FreeBox): FreeNode {
  return {
    ...node,
    position: { mode: "free", x: box.x, y: box.y },
    size: { w: box.w, h: box.h },
    rotation: box.rotation,
  };
}
