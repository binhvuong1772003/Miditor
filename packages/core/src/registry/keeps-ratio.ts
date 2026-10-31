import { isFreeNode } from "../tree/free-box";
import type { TreeNode } from "../tree/types";
import type { ComponentDef } from "./types";

/**
 * Whether resizing this block keeps its width to height ratio: what the block says for itself
 * (`lockRatio`), or else what its kind says, or else no. Only a free block is resized, so a block
 * placed by flow never keeps one.
 */
export function keepsRatio(node: TreeNode, def: ComponentDef | undefined): boolean {
  if (!isFreeNode(node)) return false;
  return node.lockRatio ?? def?.lockRatio === true;
}
