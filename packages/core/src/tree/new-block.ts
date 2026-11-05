import type { Container } from "../position/types";
import type { FreeNode } from "./types";

/** How a block is added: 25% of the page wide, 80 px tall. The 120 px width is kept for `start`, `end` and `center`. */
export const NEW_BLOCK_SIZE = { widthPercent: 25, w: 120, h: 80 };

/** Percentages are kept to a millionth of a percent, so the page holds no noise. */
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** A width and height in px that a block can start with: both finite and above 0. */
const isUsable = (size: { w: number; h: number }) =>
  Number.isFinite(size.w) && size.w > 0 && Number.isFinite(size.h) && size.h > 0;

/**
 * A new free block with this id: an empty `Container` in the middle of its parent, not turned.
 * `container` is the size of the parent now, used to find the middle down the page.
 * Across, it scales with the page (so it stays on screen when the page gets narrower): 25% of the
 * page without `size`, and with a `size` in px (one that is not finite and above 0 is ignored) the
 * width that size is on this page, centred. Down, it is pinned to the start at a fixed distance, so
 * its height does not change. On a container with no width a block with a `size` keeps its width in
 * px, centred, as a percentage of nothing says nothing. With `keepWidth` the width stays in px, centred,
 * whatever the page, for a block whose shape must not change (a picture, a circle).
 */
export function newBlock(
  id: string,
  container: Container,
  size?: { w: number; h: number },
  keepWidth = false,
): FreeNode {
  const fixed = size && isUsable(size) ? size : undefined;
  const height = fixed?.h ?? NEW_BLOCK_SIZE.h;
  const top = Math.max(0, Math.round((container.h - height) / 2));
  const span =
    fixed && container.w > 0 ? round6((fixed.w / container.w) * 100) : NEW_BLOCK_SIZE.widthPercent;
  const scaled = !fixed || (container.w > 0 && !keepWidth);
  return {
    id,
    type: "Container",
    props: {},
    styles: {},
    position: {
      mode: "free",
      x: scaled
        ? { anchor: "scale", start: round6((100 - span) / 2), size: span }
        : { anchor: "center", offset: 0 },
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
