import { findNode } from "../tree/nodes";
import type { TreeNode } from "../tree/types";
import type { Registry } from "./types";

/** True when no id of `node`, or of anything under it, is already in the tree. */
const hasFreshIds = (root: TreeNode, node: TreeNode): boolean =>
  !findNode(root, node.id) && node.children.every((child) => hasFreshIds(root, child));

/**
 * Whether `node` can be placed inside the block `parentId`: the parent is in the tree, its kind
 * allows blocks inside, and no id of `node` is taken. These are the cases where `insertNode` would
 * change the tree, so a `true` means it will. The root is the page, it always holds blocks. A parent
 * of a kind the registry does not know is refused, since nothing says it may hold anything.
 * The kind and the props of `node` are not looked at here: that is `validatePage`.
 */
export function canInsert(
  registry: Registry,
  root: TreeNode,
  parentId: string,
  node: TreeNode,
): boolean {
  const parent = findNode(root, parentId);
  if (!parent) return false;
  if (parent !== root) {
    // Own keys only: a kind named `constructor` is not on the registry.
    const def = Object.hasOwn(registry, parent.type) ? registry[parent.type] : undefined;
    if (!def?.canContain) return false;
  }
  return hasFreshIds(root, node);
}
