import type { JsonValue } from "../tree/types";
import type { ComponentDef } from "./types";

/**
 * The props with the default of every prop that is missing. A prop that is there is kept as it is,
 * also `0`, `false` and `""`. The inputs are not changed; the defaults are shared, not copied, like
 * the rest of the tree. When nothing is missing the very same object comes back.
 */
export function propsWithDefaults(
  def: ComponentDef,
  props: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const missing = Object.entries(def.defaultProps).filter(([key]) => !Object.hasOwn(props, key));
  if (missing.length === 0) return props;
  // `fromEntries` and the spread define own properties, so a key like `__proto__` stays data.
  return { ...props, ...Object.fromEntries(missing) };
}
