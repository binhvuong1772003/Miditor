import type { FreeNode } from "./types";

/** The size of a block when it is added, in px. */
export const NEW_BLOCK_SIZE = { w: 120, h: 80 };

/** A new free block with this id: an empty `Container`, centred in its parent, not turned. */
export function newBlock(id: string): FreeNode {
  return {
    id,
    type: "Container",
    props: {},
    styles: {},
    position: {
      mode: "free",
      x: { anchor: "center", offset: 0 },
      y: { anchor: "center", offset: 0 },
    },
    size: {
      w: { kind: "px", v: NEW_BLOCK_SIZE.w },
      h: { kind: "px", v: NEW_BLOCK_SIZE.h },
    },
    rotation: 0,
    children: [],
  };
}
