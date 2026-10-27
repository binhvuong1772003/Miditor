import type { Handle, Rect } from "./types";

const turn = (x: number, y: number, rotation: number) => {
  const a = (rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
};

/**
 * The rect of a node after it is resized from one handle to `w` by `h`. The corner or edge opposite
 * the handle stays where it is on the screen, so the centre moves, and when the node is rotated it
 * moves along the node's own axes. Returns the UNROTATED rect, which is what gets stored; the
 * rotation does not change.
 *
 * Callers pass moveable's `e.width` and `e.height`, not the rect it reports: the reported rect
 * drifted by up to 1.3px at the opposite corner in TN4.
 */
export function resizeRotated(
  rect: Rect,
  rotation: number,
  [sx, sy]: Handle,
  w: number,
  h: number,
): Rect {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  // The fixed point sits on the side opposite the handle: half the old size from the centre.
  const fixed = turn(-sx * (rect.w / 2), -sy * (rect.h / 2), rotation);
  // From the fixed point back to the new centre: half the new size, towards the handle.
  const back = turn(sx * (w / 2), sy * (h / 2), rotation);
  const x = cx + fixed.x + back.x;
  const y = cy + fixed.y + back.y;
  return { x: x - w / 2, y: y - h / 2, w, h };
}
