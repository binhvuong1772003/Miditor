import { canMove, findNode, parentOf, type Registry, type TreeNode } from "@miditor/core";

/** Where on a row a dragged layer is let go: over its top, on it, or under its bottom. */
export type DropZone = "above" | "inside" | "below";

/** Where a drop would put a block; see `placeFor`. */
export interface LayerPlace {
  parentId: string;
  /** As in `moveNode`: it counts the children of the new parent without the moved block; the last place is the topmost. */
  index: number;
  zone: DropZone;
  overId: string;
}

/**
 * The zone of a row at `offset` px down its `height`. A row that can hold blocks has its middle half "inside"
 * and a quarter each for above and below; one that cannot has two halves.
 */
export function zoneAt(offset: number, height: number, canHold: boolean): DropZone {
  const at = height > 0 ? offset / height : 0.5;
  if (!canHold) return at < 0.5 ? "above" : "below";
  if (at < 0.25) return "above";
  if (at > 0.75) return "below";
  return "inside";
}

/**
 * Where dragging `draggedId` over the row `overId` in `zone` would put it, or `undefined` when it may not go
 * there (the block itself, the page, what is inside the block, a block that cannot hold blocks) or would stay
 * where it is. The list shows the topmost block first and the last child is drawn on top, so above a row is a
 * larger index.
 */
export function placeFor(args: {
  root: TreeNode;
  registry: Registry;
  draggedId: string;
  overId: string;
  zone: DropZone;
}): LayerPlace | undefined {
  const { root, registry, draggedId, overId, zone } = args;
  const over = findNode(root, overId);
  if (draggedId === overId || !over || over.id === root.id) return undefined;
  let parent: TreeNode | undefined;
  let index: number;
  if (zone === "inside") {
    parent = over;
    index = over.children.filter((child) => child.id !== draggedId).length;
  } else {
    parent = parentOf(root, overId);
    if (!parent) return undefined;
    const siblings = parent.children.filter((child) => child.id !== draggedId);
    const at = siblings.findIndex((child) => child.id === overId);
    if (at < 0) return undefined;
    index = zone === "above" ? at + 1 : at;
  }
  if (!canMove(registry, root, draggedId, parent.id)) return undefined;
  const current = parentOf(root, draggedId);
  const now = current?.children.findIndex((child) => child.id === draggedId);
  if (current?.id === parent.id && now === index) return undefined;
  return { parentId: parent.id, index, zone, overId };
}
