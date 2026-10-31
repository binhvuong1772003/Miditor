import { isImageUrl } from "../styles/image-url";
import { isLinkUrl } from "../styles/link-url";
import { isColorValue } from "../styles/theme";
import type { JsonValue } from "../tree/types";
import type { ComponentDef, Field } from "./types";

/** What is wrong with one prop. `unknown`: no such field. `type`: the wrong kind of value. `range`: too long, too small or too big. `option`: not one of the choices. */
export interface PropIssue {
  key: string;
  code: "unknown" | "type" | "range" | "option";
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
