const WRITTEN = /^([+-]?)(\d+(?:\.\d+)?|\.\d+)\s*(?:°|deg)?$/;

/**
 * An angle in degrees as it is stored: from -180, not included, to 180, included, and rounded to
 * 0.01. -180 and 180 are the same angle and 180 is the one kept, so one angle has one number.
 * Something that is not a finite number is 0, since a node must always have a rotation.
 */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  // Whole hundredths, so the wrap-around is exact and never leaves 179.99999999999997.
  const hundredths = Math.round(degrees * 100);
  const wrapped = ((((hundredths + 18000) % 36000) + 36000) % 36000) - 18000;
  return (wrapped === -18000 ? 18000 : wrapped) / 100;
}

/**
 * True only for an angle that is stored the way `normalizeAngle` writes it: a number above -180 and
 * up to 180. The range is what makes it finite: `NaN` and the infinities fail both comparisons. This is
 * the strict check, for data that comes from outside.
 */
export function isAngle(value: unknown): value is number {
  return typeof value === "number" && value > -180 && value <= 180;
}

/**
 * Reads what a person typed and returns the angle, normalised, or `undefined` when it is not one.
 * It accepts `30`, `-45`, `+10`, `30°`, `30deg`, `.5` and spaces around them. An exponent, any other
 * unit and an empty text are refused. A turn of more than 180 is accepted and wrapped: `190` is -170.
 */
export function parseAngle(input: string): number | undefined {
  const match = WRITTEN.exec(input.trim().toLowerCase());
  if (!match) return undefined;
  const value = Number(match[2]);
  if (!Number.isFinite(value)) return undefined;
  return normalizeAngle(match[1] === "-" ? -value : value);
}
