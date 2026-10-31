/** The zoom steps of the canvas, as a fraction of the real size. */
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const MIN_ZOOM = ZOOM_STEPS[0];
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1] as number;

/** The next step up or down from `zoom`, or `zoom` itself at the end of the list. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  if (direction === 1) return ZOOM_STEPS.find((step) => step > zoom + 1e-9) ?? zoom;
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - 1e-9) ?? zoom;
}

/** The zoom that makes a page of `page` px wide fill `room` px, kept inside the range and rounded to 1%. */
export function fitZoom(room: number, page: number): number {
  if (!(room > 0) || !(page > 0)) return 1;
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, room / page)) * 100) / 100;
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
