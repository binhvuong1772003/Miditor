import { MAX_COORDINATE } from "../position/limits";

const WRITTEN = /^([+-]?)(\d+(?:\.\d+)?|\.\d+)\s*(?:px)?$/;

/**
 * Reads what a person typed for a position or a size and returns it in px, rounded to 0.01, or
 * `undefined` when it is not one. It accepts `12`, `-12`, `+12`, `12.5`, `.5`, `12px` and spaces
 * around them. Unlike `parsePixelLength` it takes a sign, since a block may sit partly outside its
 * parent. An exponent, a percentage, any other unit, an empty text and a number beyond
 * `MAX_COORDINATE` are refused.
 */
export function parseCoordinate(input: string): number | undefined {
  const match = WRITTEN.exec(input.trim().toLowerCase());
  if (!match) return undefined;
  const value = Math.round(Number(match[2]) * 100) / 100;
  if (value > MAX_COORDINATE) return undefined;
  // `+ 0` turns -0 into 0, so a stored number is never negative zero.
  return (match[1] === "-" ? -value : value) + 0;
}
