import type { Container } from "../position/types";
import { shiftBlock } from "./duplicate";
import { countNodes, findNode, freeIds, updateNode } from "./nodes";
import { isPageData, SCHEMA_VERSION } from "./page";
import type { TreeNode } from "./types";

/**
 * The blocks `ids` as they are in the tree, in the order of the tree. The root, an id that is not in
 * the tree, and a block that is inside another block of the list (it comes with that one) are left
 * out, so nothing is copied twice.
 */
export function copyNodes(root: TreeNode, ids: readonly string[]): TreeNode[] {
  const wanted = new Set(ids);
  const found: TreeNode[] = [];
  const walk = (node: TreeNode, inside: boolean) => {
    const take = !inside && node !== root && wanted.has(node.id);
    if (take) found.push(node);
    for (const child of node.children) walk(child, inside || take);
  };
  walk(root, false);
  return found;
}

/** What goes on the clipboard: the blocks as JSON, marked so that only this editor takes it. */
export const clipboardText = (nodes: readonly TreeNode[]): string =>
  JSON.stringify({ midito: "nodes", version: SCHEMA_VERSION, nodes });

/**
 * The blocks in a clipboard text, or `undefined` when it is not one this version made or holds
 * anything that is not a valid block. The text comes from outside, so it gets the same check as a
 * saved page (`isPageData`): shape, unique ids, safe values. Whether the kinds exist and the props
 * suit them is for the caller to check with the registry (`validatePage`).
 */
export function parseClipboard(text: string): TreeNode[] | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const { midito, version, nodes } = value as Record<string, unknown>;
  if (midito !== "nodes" || version !== SCHEMA_VERSION) return undefined;
  if (!Array.isArray(nodes) || nodes.length === 0) return undefined;
  const page = {
    schemaVersion: SCHEMA_VERSION,
    root: {
      id: "clipboard",
      type: "Page",
      props: {},
      styles: {},
      position: { mode: "flow" },
      children: nodes,
    },
  };
  return isPageData(page) ? (nodes as TreeNode[]) : undefined;
}

/** Where `pasteNodes` puts the blocks, and how far from where they were. */
export interface PasteOptions {
  /** px, down and to the right when positive, for free blocks, so a copy does not hide its original. */
  shift: { x: number; y: number };
  /** The size of the parent they go into (its padding box), which the shift is measured in. */
  container: Container;
  /** The place among the parent's children, as in `insertNode`; last when missing. */
  index?: number;
}

/**
 * A new tree with copies of `nodes` (and of everything in them) among the children of `parentId`, in
 * their order. Every node of the copies gets a new id, so they never clash with the tree; `ids` are
 * the new ids of the blocks themselves, not of what is inside them. A free block is shifted and loses
 * its phone placement, as with `duplicateNode`. The very same tree and no ids come back when the
 * parent is not in the tree or there is nothing to paste.
 */
export function pasteNodes(
  root: TreeNode,
  parentId: string,
  nodes: readonly TreeNode[],
  { shift, container, index }: PasteOptions,
): { root: TreeNode; ids: string[] } {
  if (!findNode(root, parentId) || nodes.length === 0) return { root, ids: [] };
  const fresh = freeIds(
    root,
    nodes.reduce((total, node) => total + countNodes(node), 0),
  );
  const copyOf = (original: TreeNode): TreeNode => ({
    ...original,
    id: fresh.shift() as string,
    children: original.children.map(copyOf),
  });
  const copies = nodes.map((node) => shiftBlock(copyOf(node), shift, container));
  const next = updateNode(root, parentId, (parent) => {
    const at =
      index === undefined || !Number.isInteger(index)
        ? parent.children.length
        : Math.min(Math.max(index, 0), parent.children.length);
    return {
      ...parent,
      children: [...parent.children.slice(0, at), ...copies, ...parent.children.slice(at)],
    };
  });
  return { root: next, ids: copies.map((copy) => copy.id) };
}
