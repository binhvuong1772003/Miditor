/** The shortest and the tallest a page may be, in px. */
export const MIN_PAGE_HEIGHT = 200;
export const MAX_PAGE_HEIGHT = 20000;

/** How tall a page is when nobody has set it: what the editor draws and a host is told to expect. */
export const DEFAULT_PAGE_HEIGHT = 640;

/** True only for a page height as it is stored: a whole number of px from the shortest to the tallest. */
export const isPageHeight = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= MIN_PAGE_HEIGHT &&
  value <= MAX_PAGE_HEIGHT;

/**
 * The page height for what a person typed or dragged to: rounded to a whole px, and kept between the
 * shortest page and the tallest, and no shorter than `floor`, the bottom of the lowest block, so that
 * a page is never made shorter than what is on it. Not a number gives `undefined`.
 */
export function clampPageHeight(value: number, floor = 0): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const lowest = Math.min(MAX_PAGE_HEIGHT, Math.max(MIN_PAGE_HEIGHT, Math.ceil(floor)));
  return Math.min(MAX_PAGE_HEIGHT, Math.max(lowest, Math.round(value)));
}
