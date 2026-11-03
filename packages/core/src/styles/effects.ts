import { isColorValue } from "./theme";

/** The most a shadow may reach out, in px, in any direction. */
export const MAX_SHADOW_REACH = 200;

/**
 * One shadow behind a block. `x` and `y` move it, `blur` softens its edge, `spread` makes it bigger or
 * smaller than the block (all in px). `color` is a stored `#rrggbb` or a theme colour such as `@primary`, like
 * every colour of the page, and `opacity` is how much of it shows, in percent, because those colours have no
 * alpha of their own.
 */
export interface Shadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

/** True for a finite number from 0 to 100: the opacity of a block, or of its shadow, in percent. */
export function isOpacity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

const within = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const KEYS = ["x", "y", "blur", "spread", "color", "opacity"];

/** True only for a shadow that is safe to write into CSS: every member present and in range, and no other. */
export function isShadow(value: unknown): value is Shadow {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== KEYS.length || !keys.every((key) => KEYS.includes(key))) return false;
  const shadow = value as Record<string, unknown>;
  return (
    within(shadow.x, -MAX_SHADOW_REACH, MAX_SHADOW_REACH) &&
    within(shadow.y, -MAX_SHADOW_REACH, MAX_SHADOW_REACH) &&
    within(shadow.blur, 0, MAX_SHADOW_REACH) &&
    within(shadow.spread, -MAX_SHADOW_REACH, MAX_SHADOW_REACH) &&
    isColorValue(shadow.color) &&
    isOpacity(shadow.opacity)
  );
}
