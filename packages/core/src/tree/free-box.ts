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

/**
 * The same node with the placement a person set by hand for the phone, or, with `undefined`, with
 * none, so the phone gets one made from the desktop placement again. Returns a new node; the id,
 * type, props and children are the very same objects. A node that already has that placement (or
 * none, when none is asked for) comes back as it is.
 */
export function withPhoneBox(node: FreeNode, box: FreeBox | undefined): FreeNode {
  if (node.phone === box) return node;
  if (box) return { ...node, phone: box };
  const { phone: _removed, ...rest } = node;
  return rest;
}

/**
 * The same node with `lockRatio` set, or, with `undefined`, taken off, so the block follows its kind
 * again. A node that already has that value (or none, when none is asked for) comes back as it is.
 */
export function withLockRatio(node: FreeNode, value: boolean | undefined): FreeNode {
  if (node.lockRatio === value) return node;
  if (value !== undefined) return { ...node, lockRatio: value };
  const { lockRatio: _removed, ...rest } = node;
  return rest;
}
