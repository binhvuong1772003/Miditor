/** How a background picture is sized: filling the box, fitting inside it, or as big as it really is. */
export const BACKGROUND_SIZES = ["cover", "contain", "auto"] as const;
export type BackgroundSize = (typeof BACKGROUND_SIZES)[number];

/** Where a background picture sits in the box: the middle, a side or a corner. */
export const BACKGROUND_POSITIONS = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top left",
  "top right",
  "bottom left",
  "bottom right",
] as const;
export type BackgroundPosition = (typeof BACKGROUND_POSITIONS)[number];

/** Whether a background picture is laid once or tiled. */
export const BACKGROUND_REPEATS = ["no-repeat", "repeat"] as const;
export type BackgroundRepeat = (typeof BACKGROUND_REPEATS)[number];

const oneOf =
  <T extends string>(list: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && (list as readonly string[]).includes(value);

/** True only for one of the sizes of a background picture. */
export const isBackgroundSize = oneOf(BACKGROUND_SIZES);
/** True only for one of the positions of a background picture. */
export const isBackgroundPosition = oneOf(BACKGROUND_POSITIONS);
/** True only for one of the ways a background picture is repeated. */
export const isBackgroundRepeat = oneOf(BACKGROUND_REPEATS);
