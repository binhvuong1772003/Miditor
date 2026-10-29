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

/**
 * A new tree without the node with this id and everything under it. Only the nodes on the way down
 * to its parent are copied. The root cannot be removed, and when the id is not in the tree: in both
 * cases the very same tree comes back.
 */
export function removeNode(root: TreeNode, id: string): TreeNode {
  if (root.id === id) return root;
  let changed = false;
  const children: TreeNode[] = [];
  for (const child of root.children) {
    if (child.id === id) {
      changed = true;
      continue;
    }
    const next = removeNode(child, id);
    if (next !== child) changed = true;
    children.push(next);
  }
  return changed ? { ...root, children } : root;
}

/** Every id in the tree. */
function idsOf(root: TreeNode, into: Set<string> = new Set()): Set<string> {
  into.add(root.id);
  for (const child of root.children) idsOf(child, into);
  return into;
}

/** An id for a new node: `n1`, `n2`... the first one that no node of the tree has. */
export function nextId(root: TreeNode): string {
  const taken = idsOf(root);
  let n = 1;
  while (taken.has(`n${n}`)) n++;
  return `n${n}`;
}

/**
 * A new tree with `node` among the children of `parentId`, at `index` (counted from 0, kept inside
 * the list) or last. When the parent is not in the tree, or an id of `node` or of anything under it
 * is already taken, the very same tree comes back: ids stay unique.
 */
export function insertNode(
  root: TreeNode,
  parentId: string,
  node: TreeNode,
  index?: number,
): TreeNode {
  if (!findNode(root, parentId)) return root;
  const taken = idsOf(root);
  for (const id of idsOf(node)) if (taken.has(id)) return root;
  return updateNode(root, parentId, (parent) => {
    const at =
      index === undefined || !Number.isInteger(index)
        ? parent.children.length
        : Math.min(Math.max(index, 0), parent.children.length);
    return {
      ...parent,
      children: [...parent.children.slice(0, at), node, ...parent.children.slice(at)],
    };
  });
}
