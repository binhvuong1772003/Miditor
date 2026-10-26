import type { TreeNode } from "./types";

/** The node with this id, searching the tree in depth-first order, or `undefined`. Ids are unique. */
export function findNode(root: TreeNode, id: string): TreeNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * A new tree where the node with this id is replaced by `update(node)`. Only the nodes on the way down
 * to it are copied; every other node keeps its identity, which suits structural sharing. When the id
 * is not in the tree, or `update` returns the node it was given, the very same tree comes back.
 */
export function updateNode(
  root: TreeNode,
  id: string,
  update: (node: TreeNode) => TreeNode,
): TreeNode {
  if (root.id === id) return update(root);
  let changed = false;
  const children = root.children.map((child) => {
    const next = updateNode(child, id, update);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}
