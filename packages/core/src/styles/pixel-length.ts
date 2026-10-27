/** The largest length, in px, that a style may hold. One bound for the strict and the lenient check. */
export const MAX_PIXEL_LENGTH = 1000;

const WRITTEN = /^(\d+(?:\.\d+)?|\.\d+)\s*(?:px)?$/;

/**
 * True only for a length that is safe to write into CSS as px: a finite number from 0 to
 * `MAX_PIXEL_LENGTH`. Data that went through JSON turns `NaN` and `Infinity` into `null`, which
 * fails this check too. This is the strict check `render` makes.
 */
export function isPixelLength(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_PIXEL_LENGTH
  );
}

/**
 * Reads what a person typed and returns the length in px, rounded to 0.01, or `undefined` when it
 * is not a length. It accepts `4`, `4px`, `4.5`, `.5` and spaces around them. A sign, an exponent,
 * a percentage, any other unit and a number above `MAX_PIXEL_LENGTH` are refused.
 */
export function parsePixelLength(input: string): number | undefined {
  const match = WRITTEN.exec(input.trim().toLowerCase());
  if (!match) return undefined;
  const length = Math.round(Number(match[1]) * 100) / 100;
  return isPixelLength(length) ? length : undefined;
}
