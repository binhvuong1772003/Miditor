import { normalizeAngle } from "../styles/angle";
import { boxFor, type Device } from "./device";
import { isFreeNode } from "./free-box";
import { pathTo } from "./nodes";
import type { TreeNode } from "./types";

/**
 * How far the block `id` is turned on this screen, in degrees: its own rotation and that of every
 * block it is inside, added up, since a turned block turns what is in it. A block that is placed by
 * flow does not turn. This is the `rotation` of the `Frame` that the block's children are measured
 * in, and 0 when the block is not in the tree.
 */
export function turnOf(root: TreeNode, id: string, device: Device): number {
  const path = pathTo(root, id) ?? [];
  return normalizeAngle(
    path.reduce((sum, node) => sum + (isFreeNode(node) ? boxFor(node, device).rotation : 0), 0),
  );
}
