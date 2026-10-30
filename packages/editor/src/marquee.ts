/** A rectangle by its four edges, in any one coordinate space (the screen, for the editor). */
export interface Edges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The rectangle between two corners, whichever way the pointer was dragged. */
export function boxBetween(a: { x: number; y: number }, b: { x: number; y: number }): Edges {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    right: Math.max(a.x, b.x),
    bottom: Math.max(a.y, b.y),
  };
}

/**
 * The ids of the items the box touches, in the order the items are given. Touching means the two
 * rectangles share some area; meeting only at an edge or a corner does not count, and an item with
 * no width or height, or a box with none, touches nothing.
 */
export function touched(box: Edges, items: readonly { id: string; rect: Edges }[]): string[] {
  const solid = (r: Edges) => r.right > r.left && r.bottom > r.top;
  if (!solid(box)) return [];
  return items
    .filter(
      ({ rect }) =>
        solid(rect) &&
        rect.left < box.right &&
        rect.right > box.left &&
        rect.top < box.bottom &&
        rect.bottom > box.top,
    )
    .map(({ id }) => id);
}
