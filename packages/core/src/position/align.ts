import type { Rect } from "./types";

/** Which edge or centre blocks are lined up on. `left`, `center`, `right` go across; `top`, `middle`, `bottom` go down. */
export type AlignTo = "left" | "center" | "right" | "top" | "middle" | "bottom";

const union = (rects: readonly Rect[]): Rect => {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  return {
    x: left,
    y: top,
    w: Math.max(...rects.map((r) => r.x + r.w)) - left,
    h: Math.max(...rects.map((r) => r.y + r.h)) - top,
  };
};

/**
 * The same rects lined up on `to` against `bounds`, in the same order. Without `bounds` the box
 * around all of them is used, which is how several blocks are lined up with each other; pass the
 * parent's rect to line one block up with its parent. Only the position changes, never the size.
 * Rects are taken as upright rectangles. A `to` that is not one of the six leaves them as they are.
 */
export function alignRects(rects: readonly Rect[], to: AlignTo, bounds?: Rect): Rect[] {
  if (rects.length === 0) return [];
  const box = bounds ?? union(rects);
  return rects.map((r) => {
    switch (to) {
      case "left":
        return { ...r, x: box.x };
      case "center":
        return { ...r, x: box.x + (box.w - r.w) / 2 };
      case "right":
        return { ...r, x: box.x + box.w - r.w };
      case "top":
        return { ...r, y: box.y };
      case "middle":
        return { ...r, y: box.y + (box.h - r.h) / 2 };
      case "bottom":
        return { ...r, y: box.y + box.h - r.h };
      default:
        return { ...r };
    }
  });
}

/**
 * The same rects spread so the gaps between neighbours along `axis` are equal, in the same order.
 * The two at the ends keep their place and the ones between move; a gap is negative when the
 * blocks overlap, and then the overlaps are equal. Needs at least three rects: with fewer they come
 * back as they are. Only the position along the axis changes.
 */
export function distributeRects(rects: readonly Rect[], axis: "x" | "y"): Rect[] {
  if (rects.length < 3) return rects.map((r) => ({ ...r }));
  const size = axis === "x" ? "w" : "h";
  const order = rects
    .map((_, i) => i)
    .sort((a, b) => (rects[a] as Rect)[axis] - (rects[b] as Rect)[axis]);
  const first = rects[order[0] as number] as Rect;
  const last = rects[order[order.length - 1] as number] as Rect;
  const taken = order.reduce((sum, i) => sum + (rects[i] as Rect)[size], 0);
  const gap = (last[axis] + last[size] - first[axis] - taken) / (order.length - 1);
  const out = rects.map((r) => ({ ...r }));
  let at = first[axis];
  for (const i of order) {
    (out[i] as Rect)[axis] = at;
    at += (rects[i] as Rect)[size] + gap;
  }
  // The last keeps exactly its own place: the sum above may be off in the last digits.
  (out[order[order.length - 1] as number] as Rect)[axis] = last[axis];
  return out;
}
