const CANONICAL = /^#[0-9a-f]{6}$/;
const SIX = /^[0-9a-f]{6}$/;
const THREE = /^[0-9a-f]{3}$/;

/**
 * True only for the stored form of a colour: `#` and six lowercase hex digits. This is the strict
 * check `render` makes before it writes a colour into CSS.
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && CANONICAL.test(value);
}

/**
 * Reads what a person typed and returns the stored form, or `undefined` when it is not a colour.
 * It accepts `#abc`, a missing `#`, capitals and spaces around it. A colour with transparency
 * (`#rrggbbaa`) is not accepted.
 */
export function parseHexColor(input: string): string | undefined {
  const text = input.trim().toLowerCase();
  const digits = text.startsWith("#") ? text.slice(1) : text;
  if (SIX.test(digits)) return `#${digits}`;
  if (THREE.test(digits)) {
    const [r, g, b] = digits;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return undefined;
}
