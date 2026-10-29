import type { Container } from "../position/types";
import type { FreeNode } from "./types";

/** How a block is added: 25% of the page wide, 80 px tall. The 120 px width is kept for `start`, `end` and `center`. */
export const NEW_BLOCK_SIZE = { widthPercent: 25, w: 120, h: 80 };

/** A width and height in px that a block can start with: both finite and above 0. */
const isUsable = (size: { w: number; h: number }) =>
  Number.isFinite(size.w) && size.w > 0 && Number.isFinite(size.h) && size.h > 0;

/**
 * A new free block with this id: an empty `Container` in the middle of its parent, not turned.
 * `container` is the size of the parent now, used to find the middle down the page.
 * Without `size`, across it scales with the page (so it stays on screen when the page gets
 * narrower); down it is pinned to the start at a fixed distance, so its height does not change.
 * With a `size` in px (one that is not finite and above 0 is ignored) the block keeps exactly that
 * size, centred across, so its shape never changes with the page.
 */
export function newBlock(
  id: string,
  container: Container,
  size?: { w: number; h: number },
): FreeNode {
  const fixed = size && isUsable(size) ? size : undefined;
  const height = fixed?.h ?? NEW_BLOCK_SIZE.h;
  const top = Math.max(0, Math.round((container.h - height) / 2));
  return {
    id,
    type: "Container",
    props: {},
    styles: {},
    position: {
      mode: "free",
      x: fixed
        ? { anchor: "center", offset: 0 }
        : {
            anchor: "scale",
            start: (100 - NEW_BLOCK_SIZE.widthPercent) / 2,
            size: NEW_BLOCK_SIZE.widthPercent,
          },
      y: { anchor: "start", offset: top },
    },
    size: {
      w: { kind: "px", v: fixed?.w ?? NEW_BLOCK_SIZE.w },
      h: { kind: "px", v: height },
    },
    rotation: 0,
    children: [],
  };
}
