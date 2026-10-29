import { isFreeNode, withPhoneBox } from "./free-box";
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

/** The node that has this id among its children, or `undefined` for the root and for an id not in the tree. */
export function parentOf(root: TreeNode, id: string): TreeNode | undefined {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = parentOf(child, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * A new tree where the node with this id, and everything under it, sits among the children of
 * `newParentId` at `index`. The index counts the children of the new parent without the moved node
 * (so within one parent it is the place the node ends up at), is kept inside the list, and is the
 * last place when it is missing or not a whole number. Only the nodes on the way to the old and the
 * new parent are copied. The very same tree comes back when the node or the new parent is not in
 * the tree, when the node is the root, when the new parent is the node itself or inside it, and
 * when the node would stay where it is. A free node that gets another parent loses its phone
 * placement (see `FreeNode.phone`); one that only changes place among its siblings keeps it.
 */
export function moveNode(
  root: TreeNode,
  id: string,
  newParentId: string,
  index?: number,
): TreeNode {
  const node = findNode(root, id);
  const oldParent = parentOf(root, id);
  if (!node || !oldParent || !findNode(root, newParentId)) return root;
  // The new parent is the node or one of its descendants: the node would end up inside itself.
  if (findNode(node, newParentId)) return root;
  if (oldParent.id === newParentId) {
    const siblings = oldParent.children.filter((child) => child.id !== id);
    const at = clampIndex(index, siblings.length);
    if (at === oldParent.children.indexOf(node)) return root;
  }
  // A new parent is a new frame, so a placement set by hand for the phone no longer fits. What is
  // inside the node is measured from the node, and keeps its own.
  const moved =
    oldParent.id !== newParentId && isFreeNode(node) ? withPhoneBox(node, undefined) : node;
  return insertNode(removeNode(root, id), newParentId, moved, index);
}

/** Where `index` falls in a list of `length` items: inside it, or the end when it is not a whole number. */
const clampIndex = (index: number | undefined, length: number) =>
  index === undefined || !Number.isInteger(index) ? length : Math.min(Math.max(index, 0), length);

/** The nodes from the root down to this one, both included, or `undefined` when the id is not in the tree. */
export function pathTo(root: TreeNode, id: string): TreeNode[] | undefined {
  if (root.id === id) return [root];
  for (const child of root.children) {
    const below = pathTo(child, id);
    if (below) return [root, ...below];
  }
  return undefined;
}
