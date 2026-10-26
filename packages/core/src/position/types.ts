/** A rectangle in the coordinate space of its container's padding box. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where a free node sits along one axis, relative to its container.
 * `stretch` and `scale` also decide the size on this axis, so `FreeBox.w` or `FreeBox.h` is ignored
 * for that axis. `scale` holds percentages of the container.
 */
export type Axis =
  | { anchor: "start"; offset: number }
  | { anchor: "end"; offset: number }
  | { anchor: "center"; offset: number }
  | { anchor: "stretch"; start: number; end: number }
  | { anchor: "scale"; start: number; size: number };

export type Size = { kind: "px"; v: number } | { kind: "percent"; v: number };

/** A node placed freely inside its container. */
export interface FreeBox {
  x: Axis;
  y: Axis;
  w: Size;
  h: Size;
  /** Degrees, around the centre of the unrotated rect. Position maths ignore it. */
  rotation: number;
}

/**
 * Size of the container's PADDING box: absolute children are measured from the padding edge,
 * not from the content edge. Read it as `clientWidth` and `clientHeight` in the DOM.
 */
export interface Container {
  w: number;
  h: number;
}
