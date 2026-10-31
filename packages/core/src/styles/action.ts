import { isTokenName } from "./theme";

/** The most keys a payload can have. */
export const MAX_PAYLOAD_KEYS = 8;
/** The longest text a payload can hold in one value. */
export const MAX_PAYLOAD_TEXT = 200;

/** One value of a payload: plain text, a number or a yes or no. */
export type PayloadValue = string | number | boolean;
/** What a button hands to the host with its action: a few named values, never code. */
export type Payload = Record<string, PayloadValue>;

/** True only for a name the host can give an action: the same shape as a theme colour's name. */
export const isActionName = isTokenName;

/**
 * True only for a payload: a plain object of at most `MAX_PAYLOAD_KEYS` entries, each named like an
 * action and holding text of at most `MAX_PAYLOAD_TEXT` characters, a finite number or a boolean.
 * Data comes from outside, so nothing deeper than that is accepted.
 */
export function isPayload(value: unknown): value is Payload {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const entries = Object.entries(value);
  return (
    entries.length <= MAX_PAYLOAD_KEYS &&
    entries.every(
      ([key, item]) =>
        isTokenName(key) &&
        ((typeof item === "string" && item.length <= MAX_PAYLOAD_TEXT) ||
          (typeof item === "number" && Number.isFinite(item)) ||
          typeof item === "boolean"),
    )
  );
}
