import type { Rect } from "./types";

/**
 * The rect of a node after a drag. react-moveable reports the drag distance in the node's OWN axes,
 * which are turned by its rotation, so the distance is rotated back before it is added. Without
 * that, a node turned 30 degrees ends up about 10px off after a 20px drag.
 * `dist` is in px on the canvas (divide by the zoom first when there is one).
 */
export function moveRect(rect: Rect, dist: { x: number; y: number }, rotation: number): Rect {
  const a = (rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return {
    x: rect.x + dist.x * cos - dist.y * sin,
    y: rect.y + dist.x * sin + dist.y * cos,
    w: rect.w,
    h: rect.h,
  };
}
