/** What a block does when the pointer rests on it. */
export const HOVER_EFFECTS = ["lift", "grow", "brighten", "glow"] as const;
export type HoverEffect = (typeof HOVER_EFFECTS)[number];

/** How a block comes into view. */
export const ENTER_EFFECTS = [
  "fade",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "zoom",
] as const;
export type EnterEffect = (typeof ENTER_EFFECTS)[number];

/** When an entrance runs: as the page opens, or when the block is scrolled to. */
export const ENTER_TRIGGERS = ["load", "scroll"] as const;
export type EnterTrigger = (typeof ENTER_TRIGGERS)[number];

/** The pace of a movement. */
export const EASINGS = ["smooth", "snappy", "spring"] as const;
export type Easing = (typeof EASINGS)[number];

/** The entrance of a block. Without a number, the default below is used. */
export interface Enter {
  effect: EnterEffect;
  trigger: EnterTrigger;
  /** Milliseconds, a whole number from `MIN_DURATION` to `MAX_DURATION`. */
  duration?: number;
  /** Milliseconds before it starts, a whole number from 0 to `MAX_DELAY`. */
  delay?: number;
  easing?: Easing;
}

/**
 * The motion of a block, as a choice from a short list and never as CSS. All of it is optional and
 * a block without any has none. The choices turn into plain CSS in `render`.
 */
export interface NodeEffects {
  hover?: HoverEffect;
  /** The block shrinks a little while it is pressed. */
  press?: boolean;
  enter?: Enter;
  /**
   * The blocks inside this one come in one after the other, this many ms apart, whole numbers from
   * 0 to `MAX_STAGGER`. It only changes blocks that have an entrance of their own.
   */
  stagger?: number;
}

export const MIN_DURATION = 100;
export const MAX_DURATION = 2000;
export const DEFAULT_DURATION = 600;
export const MAX_DELAY = 3000;
export const MAX_STAGGER = 300;
export const DEFAULT_EASING: Easing = "smooth";

const oneOf =
  <T extends string>(list: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (list as readonly string[]).includes(value);

export const isHoverEffect = oneOf(HOVER_EFFECTS);
export const isEnterEffect = oneOf(ENTER_EFFECTS);
export const isEnterTrigger = oneOf(ENTER_TRIGGERS);
export const isEasing = oneOf(EASINGS);

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const hasOnly = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

const isWhole = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

const isEnter = (value: unknown): value is Enter =>
  isPlain(value) &&
  hasOnly(value, ["effect", "trigger", "duration", "delay", "easing"]) &&
  isEnterEffect(value.effect) &&
  isEnterTrigger(value.trigger) &&
  (!("duration" in value) || isWhole(value.duration, MIN_DURATION, MAX_DURATION)) &&
  (!("delay" in value) || isWhole(value.delay, 0, MAX_DELAY)) &&
  (!("easing" in value) || isEasing(value.easing));

/**
 * True only for motion stored the way the types say: known names, whole numbers in range, no other
 * key. This is the strict check, for data that comes from outside. `undefined` as a value is refused
 * so that a key that is not set is a key that is not there.
 */
export function isEffects(value: unknown): value is NodeEffects {
  return (
    isPlain(value) &&
    hasOnly(value, ["hover", "press", "enter", "stagger"]) &&
    (!("hover" in value) || isHoverEffect(value.hover)) &&
    (!("press" in value) || typeof value.press === "boolean") &&
    (!("enter" in value) || isEnter(value.enter)) &&
    (!("stagger" in value) || isWhole(value.stagger, 0, MAX_STAGGER))
  );
}
