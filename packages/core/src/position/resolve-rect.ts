import type { Axis, Container, FreeBox, Rect, Size } from "./types";

function sizeOf(axis: Axis, size: Size, container: number): number {
  // Like CSS, an over-constrained stretch collapses to zero instead of going negative.
  if (axis.anchor === "stretch") return Math.max(0, container - axis.start - axis.end);
  if (axis.anchor === "scale") return (axis.size / 100) * container;
  return size.kind === "px" ? size.v : (size.v / 100) * container;
}

function positionOf(axis: Axis, size: number, container: number): number {
  switch (axis.anchor) {
    case "start":
      return axis.offset;
    case "end":
      return container - axis.offset - size;
    case "center":
      return (container - size) / 2 + axis.offset;
    case "stretch":
      return axis.start;
    case "scale":
      return (axis.start / 100) * container;
  }
}

/**
 * Where a free node sits and how big it is inside its container, from its anchors.
 * The rect is the unrotated one, in px, measured from the container's padding box.
 */
export function resolveRect(box: FreeBox, container: Container): Rect {
  const w = sizeOf(box.x, box.w, container.w);
  const h = sizeOf(box.y, box.h, container.h);
  return {
    x: positionOf(box.x, w, container.w),
    y: positionOf(box.y, h, container.h),
    w,
    h,
  };
}
