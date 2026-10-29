import type { JsonValue } from "../tree/types";

/**
 * A prop a person can edit, and the rules its value must follow. The registry stays plain data, so
 * it can be tested, and the editor can build its fields from it.
 */
export type Field =
  | { type: "text"; label: string; maxLength?: number }
  | { type: "number"; label: string; min?: number; max?: number }
  | { type: "select"; label: string; options: readonly string[] }
  | { type: "boolean"; label: string }
  /** A stored `#rrggbb`, see `isHexColor`. */
  | { type: "color"; label: string };

/** One kind of block: what it is called, what it starts with and what a person may change on it. */
export interface ComponentDef {
  /** The name a person sees. */
  label: string;
  /** The props of a new block of this kind. Each one must pass `validateProps`. */
  defaultProps: Record<string, JsonValue>;
  /** The props a person can edit. A prop that is not here is refused by `validateProps`. */
  fields: Record<string, Field>;
  /** Whether other blocks can be placed inside this one. Not the same as the `children` of a node. */
  canContain: boolean;
  /** Whether resizing keeps the width to height ratio, for a picture that must not be squashed. */
  lockRatio?: boolean;
}

/** The kinds of block that exist, by the `type` a node stores. */
export type Registry = Record<string, ComponentDef>;
