import {
  boxFor,
  type FreeNode,
  inferBox,
  type Rect,
  resolveRect,
  withFreeBox,
} from "@midito-kitchen/core";

/**
 * A new block moved so that its middle is at `point`, in px from the padding box of the block it goes
 * into (`container`). A block that fits is kept wholly inside; one that is bigger than the container
 * starts at its top left. The size and the kind of each anchor are the ones the block was made with.
 */
export function placeAt(
  node: FreeNode,
  container: { w: number; h: number },
  point: { x: number; y: number },
): FreeNode {
  const box = boxFor(node, "desktop");
  const rect = resolveRect(box, container);
  const clamp = (value: number, size: number, room: number) =>
    Math.round(Math.max(0, Math.min(value, room - size)));
  const next: Rect = {
    x: clamp(point.x - rect.w / 2, rect.w, container.w),
    y: clamp(point.y - rect.h / 2, rect.h, container.h),
    w: rect.w,
    h: rect.h,
  };
  return withFreeBox(node, inferBox(box, next, container));
}

/**
 * Where a pointer on the screen is inside an element, in the element's own px: the screen is `zoom`
 * times bigger than the element, and the element's border is not part of the padding box.
 */
export function localPoint(
  screen: { x: number; y: number },
  box: { left: number; top: number; clientLeft: number; clientTop: number },
  zoom: number,
): { x: number; y: number } {
  return {
    x: (screen.x - box.left) / zoom - box.clientLeft,
    y: (screen.y - box.top) / zoom - box.clientTop,
  };
}
