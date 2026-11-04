import { isActionName, isPayload } from "../styles/action";
import { isImageUrl } from "../styles/image-url";
import { isLinkUrl } from "../styles/link-url";
import { isColorValue, isFontStack } from "../styles/theme";
import type { JsonValue } from "../tree/types";
import {
  type ComponentDef,
  type Field,
  type ItemField,
  MAX_EXTERNAL_DATA,
  MAX_EXTERNAL_DATA_DEPTH,
  MAX_ITEMS,
} from "./types";

/** What is wrong with one prop. `unknown`: no such field. `type`: the wrong kind of value. `range`: too long, too small or too big. `option`: not one of the choices. */
export interface PropIssue {
  key: string;
  code: "unknown" | "type" | "range" | "option";
}

/** Whether `value` nests more than `limit` levels of arrays and objects; it stops looking at `limit`. */
const nestsDeeper = (value: unknown, limit: number): boolean =>
  typeof value === "object" &&
  value !== null &&
  (limit <= 0 || Object.values(value).some((inner) => nestsDeeper(inner, limit - 1)));

const EXTERNAL_KEYS = new Set(["id", "label", "data", "at"]);

const isPlainObject = (value: unknown): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The code for a value that a field refuses, or `undefined` when it accepts it. For an array or an
 * object it is the first problem found inside.
 */
export function validateValue(
  field: Field | ItemField,
  value: JsonValue,
): PropIssue["code"] | undefined {
  return problemWith(field as Field, value);
}

/** The code for a value that a field refuses, or `undefined` when it accepts it. */
function problemWith(field: Field, value: JsonValue): PropIssue["code"] | undefined {
  switch (field.type) {
    case "text":
      if (typeof value !== "string") return "type";
      return field.maxLength !== undefined && value.length > field.maxLength ? "range" : undefined;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return "type";
      if (field.min !== undefined && value < field.min) return "range";
      return field.max !== undefined && value > field.max ? "range" : undefined;
    case "select":
      if (typeof value !== "string") return "type";
      return field.options.includes(value) ? undefined : "option";
    case "boolean":
      return typeof value === "boolean" ? undefined : "type";
    case "color":
      return isColorValue(value) ? undefined : "type";
    case "image":
      return value === "" || isImageUrl(value) ? undefined : "type";
    case "link":
      return value === "" || isLinkUrl(value) ? undefined : "type";
    case "font":
      return value === "" || isFontStack(value) ? undefined : "type";
    case "action":
      return value === "" || isActionName(value) ? undefined : "type";
    case "payload":
      return isPayload(value) ? undefined : "type";
    case "custom":
      // Whatever the host's input makes; that it is JSON is checked with the rest of the page.
      return undefined;
    case "external": {
      if (value === null) return undefined;
      if (
        !isPlainObject(value) ||
        typeof value.id !== "string" ||
        typeof value.label !== "string"
      ) {
        return "type";
      }
      if (Object.keys(value).some((key) => !EXTERNAL_KEYS.has(key))) return "type";
      if (value.at !== undefined && typeof value.at !== "string") return "type";
      if (value.data !== undefined) {
        if (nestsDeeper(value.data, MAX_EXTERNAL_DATA_DEPTH)) return "range";
        if (new TextEncoder().encode(JSON.stringify(value.data)).length > MAX_EXTERNAL_DATA) {
          return "range";
        }
      }
      return undefined;
    }
    case "array": {
      if (!Array.isArray(value)) return "type";
      const most = Math.min(field.maxItems ?? MAX_ITEMS, MAX_ITEMS);
      if (value.length > most || value.length < (field.minItems ?? 0)) return "range";
      for (const item of value) {
        const code = problemWith(field.item as Field, item);
        if (code) return code;
      }
      return undefined;
    }
    case "object": {
      if (!isPlainObject(value)) return "type";
      for (const [key, inner] of Object.entries(value)) {
        const nested = Object.hasOwn(field.fields, key) ? field.fields[key] : undefined;
        if (!nested) return "unknown";
        const code = problemWith(nested as Field, inner);
        if (code) return code;
      }
      return undefined;
    }
  }
}

/**
 * What is wrong with the props of a block of this kind, one entry per prop, in the order of the
 * props. An empty list means they are fine. A prop that is missing is fine: it takes its default.
 * A prop with no field is refused, which catches a misspelt name early.
 */
export function validateProps(def: ComponentDef, props: Record<string, JsonValue>): PropIssue[] {
  const issues: PropIssue[] = [];
  for (const [key, value] of Object.entries(props)) {
    // Own keys only: `constructor` or `__proto__` in saved data must not find a field on the prototype.
    const field = Object.hasOwn(def.fields, key) ? def.fields[key] : undefined;
    if (!field) {
      issues.push({ key, code: "unknown" });
      continue;
    }
    const code = problemWith(field, value);
    if (code) issues.push({ key, code });
  }
  return issues;
}
