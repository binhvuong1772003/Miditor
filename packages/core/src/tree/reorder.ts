import { moveNode, parentOf } from "./nodes";
import type { TreeNode } from "./types";

/** Where a block goes among its siblings: `"front"` is last (drawn on top), `"back"` is first. */
export type Reorder = "front" | "back" | "forward" | "backward";

/**
 * A new tree where the node sits higher or lower among its siblings. Blocks later in `children` are
 * drawn over earlier ones, so `"forward"` moves one place later and `"front"` to the last place;
 * `"backward"` and `"back"` are the other way. The parent stays, so nothing else about the node
 * changes. The very same tree comes back when the node is not in the tree, is the root, is already
 * at that end, or `to` is not one of the four.
 */
export function reorderNode(root: TreeNode, id: string, to: Reorder): TreeNode {
  const parent = parentOf(root, id);
  if (!parent) return root;
  const from = parent.children.findIndex((child) => child.id === id);
  const last = parent.children.length - 1;
  const target =
    to === "front"
      ? last
      : to === "back"
        ? 0
        : to === "forward"
          ? from + 1
          : to === "backward"
            ? from - 1
            : from;
  return moveNode(root, id, parent.id, target);
}
