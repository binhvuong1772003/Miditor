import type { TreeNode } from "@midito-kitchen/core";

/** One line of the layers list: a block, how deep it is, and whether it can be opened. */
export interface LayerRow {
  node: TreeNode;
  /** The id of the block it is in, which is what selecting it makes the scope. */
  parentId: string;
  /** 0 for a block on the page itself. */
  depth: number;
  /** It holds blocks, so it can be opened and shut. */
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * The lines to show, from the top of the list down: the blocks of the page with the topmost first
 * (the last child is drawn over the others), each followed by its own blocks when it is open. The
 * page itself is not a line. A block in `shut` shows no blocks under it.
 */
export function layerRows(root: TreeNode, shut: ReadonlySet<string>): LayerRow[] {
  const rows: LayerRow[] = [];
  const walk = (parent: TreeNode, depth: number) => {
    for (let at = parent.children.length - 1; at >= 0; at--) {
      const node = parent.children[at] as TreeNode;
      const hasChildren = node.children.length > 0;
      const expanded = hasChildren && !shut.has(node.id);
      rows.push({ node, parentId: parent.id, depth, hasChildren, expanded });
      if (expanded) walk(node, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

/** The ids of the blocks that a block is in, from the page's own blocks down to its parent. The page is left out. */
export function ancestorIds(root: TreeNode, id: string): string[] {
  const path: string[] = [];
  const find = (node: TreeNode): boolean => {
    if (node.id === id) return true;
    for (const child of node.children) {
      if (find(child)) {
        if (node !== root) path.unshift(node.id);
        return true;
      }
    }
    return false;
  };
  return find(root) ? path : [];
}
