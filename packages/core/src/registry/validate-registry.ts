import type { JsonValue } from "../tree/types";
import type { Registry } from "./types";
import { validateProps } from "./validate-props";

/**
 * What is wrong with one kind of a registry. `type` is the kind, `key` the field, prop or flag it is
 * about when there is one. `name`: the kind has an empty name or is `Page`. `label`: no label to show.
 * `canContain`, `flag`: a value that is not a boolean. `size`: not a positive width and height.
 * `default`: a default prop that `validateProps` refuses. `field`: a field that can never accept a value.
 * `meta`: a `category`, `icon`, `keywords`, `description` or `inlineText` (the `key`) that is not what the library can use.
 */
export interface RegistryIssue {
  type: string;
  key?: string;
  code: "name" | "label" | "canContain" | "flag" | "size" | "default" | "field" | "meta";
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isPositive = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const isCount = (value: unknown) => Number.isInteger(value) && (value as number) >= 0;
const isLabel = (value: unknown) => typeof value === "string" && value.trim() !== "";

/** A name of a section of the panel: not empty, not padded, at most 40 characters. */
const isGroupName = (value: unknown) =>
  typeof value === "string" && value !== "" && value.trim() === value && value.length <= 40;

/** Why a field could never be filled in, or `undefined` when it is a usable field. */
function fieldIsBroken(field: unknown): boolean {
  if (!isObject(field) || !isLabel(field.label)) return true;
  if (field.perDevice !== undefined && typeof field.perDevice !== "boolean") return true;
  if (field.group !== undefined && !isGroupName(field.group)) return true;
  if (field.help !== undefined && !(typeof field.help === "string" && field.help.length <= 200)) {
    return true;
  }
  switch (field.type) {
    case "text":
      if (field.multiline !== undefined && typeof field.multiline !== "boolean") return true;
      return field.maxLength !== undefined && !isCount(field.maxLength);
    case "number": {
      const { min, max, unit } = field;
      if (unit !== undefined && !(typeof unit === "string" && unit !== "" && unit.length <= 8)) {
        return true;
      }
      if (min !== undefined && (typeof min !== "number" || Number.isNaN(min))) return true;
      if (max !== undefined && (typeof max !== "number" || Number.isNaN(max))) return true;
      return typeof min === "number" && typeof max === "number" && min > max;
    }
    case "select":
      return (
        !Array.isArray(field.options) ||
        field.options.length === 0 ||
        field.options.some((option) => typeof option !== "string")
      );
    case "boolean":
    case "color":
    case "image":
    case "link":
    case "action":
    case "payload":
      return false;
    default:
      return true;
  }
}

/**
 * What is wrong with a registry, in the order of its kinds. An empty list means it is fine. It looks
 * only at what is certain to break something later: a kind that cannot be added, a field that
 * cannot be edited, defaults that `validateProps` would refuse. It reports and never throws, so a
 * host can decide what to do with a mistake.
 */
export function validateRegistry(registry: Registry): RegistryIssue[] {
  const issues: RegistryIssue[] = [];
  for (const [type, def] of Object.entries(registry)) {
    const add = (code: RegistryIssue["code"], key?: string) =>
      issues.push(key === undefined ? { type, code } : { type, key, code });
    if (type.trim() === "" || type === "Page") add("name");
    if (!isObject(def)) {
      add("label");
      continue;
    }
    if (!isLabel(def.label)) add("label");
    if (typeof def.canContain !== "boolean") add("canContain");
    for (const flag of ["hidden", "lockRatio"] as const) {
      if (def[flag] !== undefined && typeof def[flag] !== "boolean") add("flag", flag);
    }
    if (
      def.size !== undefined &&
      !(isObject(def.size) && isPositive(def.size.w) && isPositive(def.size.h))
    ) {
      add("size");
    }
    if (
      def.category !== undefined &&
      !(
        typeof def.category === "string" &&
        def.category !== "" &&
        def.category.trim() === def.category &&
        def.category.length <= 40
      )
    ) {
      add("meta", "category");
    }
    if (
      def.icon !== undefined &&
      !(typeof def.icon === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(def.icon))
    ) {
      add("meta", "icon");
    }
    if (
      def.keywords !== undefined &&
      !(
        Array.isArray(def.keywords) &&
        def.keywords.length <= 20 &&
        def.keywords.every(
          (word) => typeof word === "string" && word.trim() !== "" && word.length <= 40,
        )
      )
    ) {
      add("meta", "keywords");
    }
    if (
      def.description !== undefined &&
      !(typeof def.description === "string" && def.description.length <= 200)
    ) {
      add("meta", "description");
    }
    if (def.inlineText !== undefined) {
      const { inlineText: edit, fields: declared } = def;
      const field =
        isObject(edit) &&
        typeof edit.prop === "string" &&
        isObject(declared) &&
        Object.hasOwn(declared, edit.prop)
          ? declared[edit.prop]
          : undefined;
      const ok =
        isObject(field) &&
        field.type === "text" &&
        isObject(edit) &&
        (edit.multiline === undefined || typeof edit.multiline === "boolean");
      if (!ok) add("meta", "inlineText");
    }
    const fields = isObject(def.fields) ? def.fields : {};
    if (!isObject(def.fields)) add("field");
    for (const [name, field] of Object.entries(fields)) {
      if (fieldIsBroken(field)) add("field", name);
    }
    if (!isObject(def.defaultProps)) {
      add("default");
    } else if (isObject(def.fields)) {
      for (const issue of validateProps(def, def.defaultProps as Record<string, JsonValue>)) {
        add("default", issue.key);
      }
    }
  }
  return issues;
}
