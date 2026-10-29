import { pathTo } from "./nodes";
import type { TreeNode } from "./types";

/** The block that a press selects and the block whose children a press selects next. */
export interface Pick {
  id: string;
  scopeId: string;
}

/**
 * Which block a press on `targetId` selects, when the person is working inside `scopeId`: the
 * outermost block that holds the target and is a child of the scope, so a press on a block inside a
 * group selects the group. The scope is the page at the start; going into a block makes it the
 * scope. A press on the scope itself selects it and moves the scope one level up. A press outside
 * the scope (or with a scope that is not in the tree) starts again from the page. The returned
 * `scopeId` is always the parent of the returned `id`. `undefined` for the page itself or an id not
 * in the tree.
 */
export function pickBlock(root: TreeNode, scopeId: string, targetId: string): Pick | undefined {
  const path = pathTo(root, targetId);
  if (!path || path.length < 2) return undefined;
  const at = path.findIndex((node) => node.id === scopeId);
  if (at < 0) return { id: (path[1] as TreeNode).id, scopeId: root.id };
  const next = path[at + 1];
  if (next) return { id: next.id, scopeId };
  // The target is the scope itself: select it and go up, so the scope is again its parent.
  return { id: scopeId, scopeId: (path[at - 1] as TreeNode).id };
}
