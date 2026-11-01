import type { Rect } from "@midito-kitchen/core";

/** A block as it sits in its parent: the upright box and how far it is turned, in degrees. */
export interface Placed {
  rect: Rect;
  rotation: number;
}

export interface Point {
  x: number;
  y: number;
}

const RAD = Math.PI / 180;

/** The point turned by `degrees` around `pivot`, clockwise on the screen like CSS `rotate`. */
export function turnAround(point: Point, pivot: Point, degrees: number): Point {
  const cos = Math.cos(degrees * RAD);
  const sin = Math.sin(degrees * RAD);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

/** The middle of a rect. */
export const centreOf = (rect: Rect): Point => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

/** The four corners of a block as it is drawn, turned around its own middle. */
export function cornersOf({ rect, rotation }: Placed): Point[] {
  const middle = centreOf(rect);
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x + rect.w, y: rect.y + rect.h },
    { x: rect.x, y: rect.y + rect.h },
  ].map((corner) => turnAround(corner, middle, rotation));
}

/** The upright box around all of the blocks as they are drawn. `undefined` for none. */
export function boundsOf(blocks: readonly Placed[]): Rect | undefined {
  const points = blocks.flatMap(cornersOf);
  if (points.length === 0) return undefined;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** What a block becomes when the group is turned: its middle moves around the pivot and it turns too. */
export interface Turned {
  /** The new middle of the block. */
  centre: Point;
  /** The new rotation, kept in the range of `normalizeAngle` by the caller. */
  rotation: number;
}

/**
 * Every block of a group turned by `degrees` around `pivot`, as if the group were one flat piece:
 * each middle goes around the pivot, and each block turns by the same angle. Sizes do not change.
 */
export function turnGroup(blocks: readonly Placed[], pivot: Point, degrees: number): Turned[] {
  return blocks.map((block) => ({
    centre: turnAround(centreOf(block.rect), pivot, degrees),
    rotation: block.rotation + degrees,
  }));
}

/** The upright rect of a block that is centred on `centre`, with the size of `rect`. */
export const rectAt = (rect: Rect, centre: Point): Rect => ({
  x: centre.x - rect.w / 2,
  y: centre.y - rect.h / 2,
  w: rect.w,
  h: rect.h,
});
