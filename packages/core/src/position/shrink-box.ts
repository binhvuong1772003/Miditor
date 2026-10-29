import type { Axis, FreeBox, Size } from "./types";

/** Rounds to 0.01, like `inferBox` does; the `+ 0` turns -0 into 0 so saved data stays clean. */
const roundPx = (n: number) => Math.round(n * 100) / 100 + 0;

/** Distances in px follow the ratio; a `scale` axis holds percentages of the container, which already shrink with it. */
function shrinkAxis(axis: Axis, ratio: number): Axis {
  switch (axis.anchor) {
    case "start":
    case "end":
    case "center":
      return { anchor: axis.anchor, offset: roundPx(axis.offset * ratio) };
    case "stretch":
      return {
        anchor: "stretch",
        start: roundPx(axis.start * ratio),
        end: roundPx(axis.end * ratio),
      };
    case "scale":
      return axis;
  }
}

/** A size in px follows the ratio; a size in percent is of the container, which already shrinks. */
const shrinkSize = (size: Size, ratio: number): Size =>
  size.kind === "px" ? { kind: "px", v: roundPx(size.v * ratio) } : size;

/**
 * The placement a page gets on a smaller screen when nobody set it by hand: a copy of the larger
 * one at `ratio` of its size, for example 375 / 960 from a desktop page to a phone. Every distance
 * and size in px is multiplied by the ratio and rounded to 0.01 px; percentages stay as they are,
 * since they already follow the container. The anchor types, the size kinds and the rotation do
 * not change. So a container that is `ratio` times as big shows each block at `ratio` times its
 * size, in the same relative place. A ratio that is not above 0 and finite, or is exactly 1,
 * gives back the very same box.
 */
export function shrinkBox(box: FreeBox, ratio: number): FreeBox {
  if (!(ratio > 0) || !Number.isFinite(ratio) || ratio === 1) return box;
  return {
    x: shrinkAxis(box.x, ratio),
    y: shrinkAxis(box.y, ratio),
    w: shrinkSize(box.w, ratio),
    h: shrinkSize(box.h, ratio),
    rotation: box.rotation,
  };
}
