import { type Frame, moveBetweenFrames } from "../position/frames";
import { reparentBox } from "../position/reparent-box";
import type { Container, FreeBox } from "../position/types";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import { findNode, moveNode, parentOf, updateNode } from "./nodes";
import type { TreeNode } from "./types";

/**
 * What `reparentNode` measures in, and where the block goes among the new parent's children. With
 * `from`, `to` and `shift` the parents are upright; with a `Frame` for each (see `moveBetweenFrames`)
 * either may be turned, and `shift` is not given.
 */
export type ReparentOptions = (
  | {
      /** The size of the old parent (its padding box). */
      from: Container;
      /** The size of the new parent (its padding box). */
      to: Container;
      /** Where the new parent's top left corner is, measured from the old parent's, in px. */
      shift: { x: number; y: number };
    }
  | {
      /** The old parent as a frame: its size, and where its middle is and how far it is turned. */
      from: Frame;
      /** The new parent as a frame, in the same space. */
      to: Frame;
      shift?: never;
    }
) & {
  /** The place among the new parent's children, as in `moveNode`; last when missing. */
  index?: number;
};

const usable = (size: Container) => size.w >= 0.01 && size.h >= 0.01;
const isFrame = (value: Container | Frame): value is Frame => "size" in value;

/**
 * A new tree where the free block `id` is inside `newParentId` and still stands where it was on the
 * page: its placement is written again for the new parent (see `reparentBox`). What `moveNode`
 * says about the index, and about the phone placement being dropped, holds here too. This is about
 * change, not about the rules: ask `canMove` first whether the new parent may hold blocks. The
 * very same tree comes back when the block is not free, is the root, or is not in the tree, when
 * the new parent is missing, is the old parent, or is the block or inside it, and when either size
 * is empty. With frames a parent may be turned; with sizes and a shift both are taken as upright.
 */
export function reparentNode(
  root: TreeNode,
  id: string,
  newParentId: string,
  options: ReparentOptions,
): TreeNode {
  const { index } = options;
  const node = findNode(root, id);
  const oldParent = parentOf(root, id);
  if (!node || !oldParent || !isFreeNode(node) || oldParent.id === newParentId) return root;
  const { from, to } = options;
  if (!usable(isFrame(from) ? from.size : from) || !usable(isFrame(to) ? to.size : to)) return root;
  const rewrite = (box: FreeBox) =>
    isFrame(from) && isFrame(to)
      ? moveBetweenFrames(box, from, to)
      : reparentBox(
          box,
          from as Container,
          to as Container,
          options.shift as { x: number; y: number },
        );
  const placed = updateNode(root, id, (n) =>
    isFreeNode(n) ? withFreeBox(n, rewrite(freeBoxOf(n))) : n,
  );
  const moved = moveNode(placed, id, newParentId, index);
  // `moveNode` refused (no such parent, or a parent inside the block): nothing changes.
  return moved === placed ? root : moved;
}
