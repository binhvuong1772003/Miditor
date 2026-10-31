import type { Rect } from "@midito-kitchen/core";

/** A measured gap: the line from the moving block to what is next to it, and how long it is, in px. */
export interface Gap {
  direction: "left" | "right" | "up" | "down";
  /** The two ends of the line, in the same px as the rects. */
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** The length of the line, rounded to a whole px. */
  distance: number;
}

/** The part of two intervals that they share, or `undefined` when they only touch or are apart. */
const shared = (a0: number, a1: number, b0: number, b1: number) => {
  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  return hi > lo ? { lo, hi, mid: (lo + hi) / 2 } : undefined;
};

/**
 * The gaps between `moving` and what is nearest to it on each side: another block that it overlaps
 * across (for the left and right, one that shares some height with it; for up and down, some width)
 * and that lies wholly on that side, or else the edge of `bounds` (the parent). Only gaps of 1 px or
 * more are given, so a block that touches its neighbour has no line to it. Rects are upright boxes.
 */
export function gapsAround(moving: Rect, others: readonly Rect[], bounds: Rect): Gap[] {
  const out: Gap[] = [];
  const m = { right: moving.x + moving.w, bottom: moving.y + moving.h };
  const add = (gap: Gap) => {
    if (gap.distance >= 1) out.push(gap);
  };

  // Left: the nearest right edge at or before the left edge of the moving block.
  let left: { edge: number; y: number } | undefined;
  for (const o of others) {
    const across = shared(moving.y, m.bottom, o.y, o.y + o.h);
    if (!across || o.x + o.w > moving.x) continue;
    if (!left || o.x + o.w > left.edge) left = { edge: o.x + o.w, y: across.mid };
  }
  const leftEdge = left ?? { edge: bounds.x, y: moving.y + moving.h / 2 };
  add({
    direction: "left",
    from: { x: leftEdge.edge, y: leftEdge.y },
    to: { x: moving.x, y: leftEdge.y },
    distance: Math.round(moving.x - leftEdge.edge),
  });

  // Right: the nearest left edge at or after the right edge of the moving block.
  let right: { edge: number; y: number } | undefined;
  for (const o of others) {
    const across = shared(moving.y, m.bottom, o.y, o.y + o.h);
    if (!across || o.x < m.right) continue;
    if (!right || o.x < right.edge) right = { edge: o.x, y: across.mid };
  }
  const rightEdge = right ?? { edge: bounds.x + bounds.w, y: moving.y + moving.h / 2 };
  add({
    direction: "right",
    from: { x: m.right, y: rightEdge.y },
    to: { x: rightEdge.edge, y: rightEdge.y },
    distance: Math.round(rightEdge.edge - m.right),
  });

  // Up: the nearest bottom edge at or above the top edge of the moving block.
  let up: { edge: number; x: number } | undefined;
  for (const o of others) {
    const across = shared(moving.x, m.right, o.x, o.x + o.w);
    if (!across || o.y + o.h > moving.y) continue;
    if (!up || o.y + o.h > up.edge) up = { edge: o.y + o.h, x: across.mid };
  }
  const upEdge = up ?? { edge: bounds.y, x: moving.x + moving.w / 2 };
  add({
    direction: "up",
    from: { x: upEdge.x, y: upEdge.edge },
    to: { x: upEdge.x, y: moving.y },
    distance: Math.round(moving.y - upEdge.edge),
  });

  // Down: the nearest top edge at or below the bottom edge of the moving block.
  let down: { edge: number; x: number } | undefined;
  for (const o of others) {
    const across = shared(moving.x, m.right, o.x, o.x + o.w);
    if (!across || o.y < m.bottom) continue;
    if (!down || o.y < down.edge) down = { edge: o.y, x: across.mid };
  }
  const downEdge = down ?? { edge: bounds.y + bounds.h, x: moving.x + moving.w / 2 };
  add({
    direction: "down",
    from: { x: downEdge.x, y: m.bottom },
    to: { x: downEdge.x, y: downEdge.edge },
    distance: Math.round(downEdge.edge - m.bottom),
  });

  return out;
}
