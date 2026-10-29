import type { Container } from "../position/types";
import type { FreeNode } from "./types";

/** How a block is added: 25% of the page wide, 80 px tall. The 120 px width is kept for `start`, `end` and `center`. */
export const NEW_BLOCK_SIZE = { widthPercent: 25, w: 120, h: 80 };

/**
 * A new free block with this id: an empty `Container` in the middle of its parent, not turned.
 * Across it scales with the page (so it stays on screen when the page gets narrower); down it is
 * pinned to the start at a fixed distance, so its height does not change. `container` is the size
 * of the parent now, used only to find the middle down the page.
 */
export function newBlock(id: string, container: Container): FreeNode {
  const top = Math.max(0, Math.round((container.h - NEW_BLOCK_SIZE.h) / 2));
  return {
    id,
    type: "Container",
    props: {},
    styles: {},
    position: {
      mode: "free",
      x: {
        anchor: "scale",
        start: (100 - NEW_BLOCK_SIZE.widthPercent) / 2,
        size: NEW_BLOCK_SIZE.widthPercent,
      },
      y: { anchor: "start", offset: top },
    },
    size: {
      w: { kind: "px", v: NEW_BLOCK_SIZE.w },
      h: { kind: "px", v: NEW_BLOCK_SIZE.h },
    },
    rotation: 0,
    children: [],
  };
}
