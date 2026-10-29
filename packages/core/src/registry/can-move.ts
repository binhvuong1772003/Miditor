import { findNode } from "../tree/nodes";
import type { TreeNode } from "../tree/types";
import { holdsBlocks } from "./can-insert";
import type { Registry } from "./types";

/**
 * Whether the block `id` may be moved inside the block `newParentId`: both are in the tree, the
 * block is not the root, the new parent is neither the block nor anything inside it, and the kind
 * of the new parent allows blocks inside (the root always does). This is about the rules, not about
 * change: a block that is already in that parent may be moved there, and `moveNode` then leaves the
 * tree as it was or reorders it. Use it to decide where a block can be dropped.
 */
export function canMove(
  registry: Registry,
  root: TreeNode,
  id: string,
  newParentId: string,
): boolean {
  const node = findNode(root, id);
  const parent = findNode(root, newParentId);
  if (!node || !parent || node === root) return false;
  // The new parent is the node or one of its descendants: the node would end up inside itself.
  if (findNode(node, newParentId)) return false;
  return holdsBlocks(registry, root, parent);
}
