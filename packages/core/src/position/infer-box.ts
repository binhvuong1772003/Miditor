import type { Axis, Container, FreeBox, Rect, Size } from "./types";

/** Rounds to `digits` decimals; the `+ 0` turns -0 into 0 so saved data stays clean. */
const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits + 0;
const roundPx = (n: number) => round(n, 2);
const roundPercent = (n: number) => round(n, 3);

/** A container thinner than the 0.01px rounding step is empty: dividing by it overflows to Infinity. */
const isEmpty = (container: number) => !(container >= 0.01);

/**
 * Keeps the anchor type and stores only the numbers that type owns, for one axis.
 * `container` is the container's size along this axis.
 */
function inferAxis(prev: Axis, start: number, size: number, container: number): Axis {
  const end = container - (start + size);
  switch (prev.anchor) {
    case "start":
      return { anchor: "start", offset: roundPx(start) };
    case "end":
      return { anchor: "end", offset: roundPx(end) };
    case "center":
      return { anchor: "center", offset: roundPx(start + size / 2 - container / 2) };
    case "stretch":
      return { anchor: "stretch", start: roundPx(start), end: roundPx(end) };
    case "scale":
      // Percentages of an empty container are meaningless: keep what was saved.
      if (isEmpty(container)) return prev;
      return {
        anchor: "scale",
        start: roundPercent((start / container) * 100),
        size: roundPercent((size / container) * 100),
      };
  }
}

/**
 * On `stretch` and `scale` the axis owns the size, so the saved size is left as it was: switching
 * back to `start` later still finds the size the user had.
 */
function inferSize(prev: Size, axis: Axis, size: number, container: number): Size {
  if (axis.anchor === "stretch" || axis.anchor === "scale") return prev;
  if (prev.kind === "px") return { kind: "px", v: roundPx(size) };
  if (isEmpty(container)) return prev;
  return { kind: "percent", v: roundPercent((size / container) * 100) };
}

/**
 * The saved data for a node dragged or resized to `rect` (unrotated, in px, measured from the
 * container's padding box). Each axis keeps its anchor type and size kind, so nothing "jumps" while
 * dragging. The rotation is copied from `prev`.
 */
export function inferBox(prev: FreeBox, rect: Rect, container: Container): FreeBox {
  return {
    x: inferAxis(prev.x, rect.x, rect.w, container.w),
    y: inferAxis(prev.y, rect.y, rect.h, container.h),
    w: inferSize(prev.w, prev.x, rect.w, container.w),
    h: inferSize(prev.h, prev.y, rect.h, container.h),
    rotation: prev.rotation,
  };
}
