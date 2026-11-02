import type { JsonValue } from "../tree/types";
import type { Field, ItemField } from "./types";

/** The value of a new item of a field: empty, zero or the first choice. */
export function defaultValueOf(field: Field | ItemField): JsonValue {
  switch (field.type) {
    case "text":
    case "link":
    case "font":
    case "image":
    case "action":
      return "";
    case "number": {
      const base = field.min ?? 0;
      return field.max !== undefined ? Math.min(base, field.max) : base;
    }
    case "select":
      return field.options[0] ?? "";
    case "boolean":
      return false;
    case "color":
      return "#000000";
    case "payload":
      return {};
    case "custom":
      return null;
    case "array":
      return Array.from({ length: field.minItems ?? 0 }, () => defaultValueOf(field.item));
    case "object":
      return Object.fromEntries(
        Object.entries(field.fields).map(([key, inner]) => [key, defaultValueOf(inner)]),
      );
  }
}
