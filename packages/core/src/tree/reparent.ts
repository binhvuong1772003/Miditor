import { reparentBox } from "../position/reparent-box";
import type { Container } from "../position/types";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import { findNode, moveNode, parentOf, updateNode } from "./nodes";
import type { TreeNode } from "./types";

/** The sizes `reparentNode` measures in, and where the block goes among the new parent's children. */
export interface ReparentOptions {
  /** The size of the old parent (its padding box). */
  from: Container;
  /** The size of the new parent (its padding box). */
  to: Container;
  /** Where the new parent's top left corner is, measured from the old parent's, in px. */
  shift: { x: number; y: number };
  /** The place among the new parent's children, as in `moveNode`; the last place when missing. */
  index?: number;
}

const usable = (size: Container) => size.w >= 0.01 && size.h >= 0.01;

/**
 * A new tree where the free block `id` is inside `newParentId` and still stands where it was on the
 * page: its placement is written again for the new parent (see `reparentBox`). What `moveNode`
 * says about the index, and about the phone placement being dropped, holds here too. This is about
 * change, not about the rules: ask `canMove` first whether the new parent may hold blocks. The
 * very same tree comes back when the block is not free, is the root, or is not in the tree, when
 * the new parent is missing, is the old parent, or is the block or inside it, and when either size
 * is empty. Both parents are taken as upright rectangles.
 */
export function reparentNode(
  root: TreeNode,
  id: string,
  newParentId: string,
  { from, to, shift, index }: ReparentOptions,
): TreeNode {
  const node = findNode(root, id);
  const oldParent = parentOf(root, id);
  if (!node || !oldParent || !isFreeNode(node) || oldParent.id === newParentId) return root;
  if (!usable(from) || !usable(to)) return root;
  const placed = updateNode(root, id, (n) =>
    isFreeNode(n) ? withFreeBox(n, reparentBox(freeBoxOf(n), from, to, shift)) : n,
  );
  const moved = moveNode(placed, id, newParentId, index);
  // `moveNode` refused (no such parent, or a parent inside the block): nothing changes.
  return moved === placed ? root : moved;
}
