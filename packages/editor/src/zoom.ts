/** The zoom steps of the canvas, as a fraction of the real size. */
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1] as number;

/** The next step up or down from `zoom`, or `zoom` itself at the end of the list. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > zoom + 1e-9) ?? zoom;
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 1e-9) ?? zoom;
}

/**
 * The zoom that makes the whole page, `page` px wide and `height` px tall, fit the `room` and
 * `roomHeight` px the workspace has: the tighter of the two, kept inside the range and rounded to 1%.
 */
export function fitZoom(room: number, page: number, roomHeight: number, height: number): number {
  if (![room, page, roomHeight, height].every((n) => n > 0 && Number.isFinite(n))) return 1;
  const fit = Math.min(room / page, roomHeight / height);
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)) * 100) / 100;
}

/**
 * The zoom that makes a page `page` px wide fit across the `room` px the workspace has: 1 when it fits,
 * otherwise the room over the page, rounded down to 1% so it is never wider than the room, and not
 * under the smallest zoom. A size that is not usable gives 1.
 */
export function widthZoom(room: number, page: number): number {
  if (![room, page].every((n) => n > 0 && Number.isFinite(n))) return 1;
  if (room >= page) return 1;
  return Math.max(MIN_ZOOM, Math.floor((room / page) * 100) / 100);
}

/**
 * The width, in the page's own px, of the box the page sits in when the canvas is zoomed: wide
 * enough to fill the `room` the workspace has once it is scaled, and never narrower than the page,
 * so the page keeps the width it has at 100% and only its size on the screen changes.
 */
export function stageWidth(room: number, page: number, zoom: number): number {
  return Math.max(room / zoom, page);
}

/** The text of a zoom, such as `75%`. */
export const zoomText = (zoom: number) => `${Math.round(zoom * 100)}%`;

/**
 * The zoom after a turn of the wheel with Ctrl or Cmd held, or a pinch on a trackpad (which arrives
 * the same way). The change is by a factor of the distance turned, so a small pinch is a small change
 * and a notch of a mouse wheel is about a quarter. It is kept inside the range and rounded to 1%.
 */
export function zoomBy(zoom: number, deltaY: number): number {
  if (!Number.isFinite(deltaY)) return zoom;
  const next = zoom * Math.exp(-deltaY * 0.0025);
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)) * 100) / 100;
}
