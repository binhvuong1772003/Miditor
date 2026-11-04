import type { JsonValue } from "../tree/types";
import type { ExternalItem } from "./external-source";
import { MAX_EXTERNAL_DATA, MAX_EXTERNAL_DATA_DEPTH } from "./types";

const isPlain = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value);
  return Array.isArray(value) || proto === Object.prototype || proto === null;
};

export const sameJson = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (!isPlain(a) || !isPlain(b) || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => sameJson((a as never)[key], (b as never)[key]))
  );
};

const nestsDeeper = (value: unknown, limit: number): boolean =>
  typeof value === "object" &&
  value !== null &&
  (limit <= 0 || Object.values(value).some((inner) => nestsDeeper(inner, limit - 1)));

/**
 * A copy of `data` when it is plain JSON (what survives a round trip), with no limit on its size: for data
 * that is drawn and never stored. `undefined` for anything else.
 */
export function plainJsonCopy(data: unknown): JsonValue | undefined {
  try {
    const text = JSON.stringify(data);
    if (text === undefined) return undefined;
    const copy = JSON.parse(text) as JsonValue;
    return sameJson(copy, data) ? copy : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A copy of `data` when it is plain JSON that fits the page (what survives a round trip, in at most 8000
 * bytes and 16 levels), else `undefined`: the page keeps the copy, never the host's own object.
 */
function copyThatFits(data: unknown): JsonValue | undefined {
  try {
    if (nestsDeeper(data, MAX_EXTERNAL_DATA_DEPTH)) return undefined;
    const text = JSON.stringify(data);
    if (text === undefined || new TextEncoder().encode(text).length > MAX_EXTERNAL_DATA) {
      return undefined;
    }
    const copy = JSON.parse(text) as JsonValue;
    return sameJson(copy, data) ? copy : undefined;
  } catch {
    return undefined;
  }
}

/**
 * What is stored for a picked item: `{ id, label }`, and with the item's data `{ id, label, data, at }`.
 * `null` when the data is not plain JSON or is too large or too deep to keep in the page.
 */
export function pickValue(
  item: ExternalItem,
  now: Date,
  store: "snapshot" | "reference" = "snapshot",
): JsonValue | null {
  if (store === "reference" || item.data === undefined) return { id: item.id, label: item.label };
  const data = copyThatFits(item.data);
  if (data === undefined) return null;
  return { id: item.id, label: item.label, data, at: now.toISOString() };
}
