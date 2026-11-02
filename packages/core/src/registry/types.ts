import type { JsonValue } from "../tree/types";

/**
 * A prop a person can edit, and the rules its value must follow. The registry stays plain data, so
 * it can be tested, and the editor can build its fields from it.
 */
export type Field = FieldKind & {
  /**
   * True when a person may give the prop another value for the phone, which is then kept in the
   * `phoneProps` of the block. Only for a prop that makes sense per screen, like the size of a text.
   */
  perDevice?: boolean;
  /**
   * The name of the section of the panel this field is shown under, such as "Typography". Fields with
   * the same name are shown together, in the order of the registry; a field with none is shown first.
   */
  group?: string;
  /** One short sentence about the field, which the panel shows when it is pointed at. */
  help?: string;
};

type FieldKind =
  | {
      type: "text";
      label: string;
      maxLength?: number;
      /** The words can run over several lines, so the panel gives them a box instead of one line. */
      multiline?: boolean;
    }
  | {
      type: "number";
      label: string;
      min?: number;
      max?: number;
      /** What the number counts, shown after it: "px", "%", "°". */
      unit?: string;
    }
  | { type: "select"; label: string; options: readonly string[] }
  | { type: "boolean"; label: string }
  /** A stored `#rrggbb` or a theme colour such as `@primary`, see `isColorValue`. */
  | { type: "color"; label: string }
  /** A stored picture address, see `isImageUrl`; an empty string means no picture yet. */
  | { type: "image"; label: string }
  /** A stored link address, see `isLinkUrl`; an empty string means no link yet. */
  | { type: "link"; label: string }
  /**
   * A font chosen from the list the host gives the editor: stored as its font stack (see
   * `isFontStack`), or an empty string for the font of the page. `body` and `heading`, the roles
   * older pages used, are still read.
   */
  | { type: "font"; label: string }
  /** The name of an action the host handles, see `isActionName`; an empty string means none. */
  | { type: "action"; label: string }
  /** The values handed to the action, see `isPayload`. */
  | { type: "payload"; label: string }
  /**
   * A value of any JSON shape that the host's own input edits. `kind` names the input the host gave the
   * editor (`config.customFields`); the registry stays plain data, so the input itself is not here.
   */
  | { type: "custom"; label: string; kind: string }
  /**
   * A list of values that all follow `item`: the menu entries of a navigation, the cards of a row. At
   * most `MAX_ITEMS` long (100), and `maxItems` can only lower that.
   */
  | { type: "array"; label: string; item: ItemField; minItems?: number; maxItems?: number }
  /**
   * A choice from a list that the host keeps (products, articles, pages): stored as `null` or
   * `{ id, label }`. `source` names the search the host gave the editor (`config.sources`).
   */
  | { type: "external"; label: string; source: string }
  /** A group of named values that each follow their own field: `{ label, link }` of a menu entry. */
  | { type: "object"; label: string; fields: Record<string, ItemField> };

/**
 * A field inside an array or an object: any type except the ones that need the page's host context
 * (`image`, `action`, `payload`). It has no `group`, `perDevice` or `help` of its own.
 */
export type ItemField = Exclude<FieldKind, { type: "image" | "action" | "payload" }>;

/** The longest an array can be, whatever its `maxItems`. */
export const MAX_ITEMS = 100;

/** How deep arrays and objects may nest. */
export const MAX_FIELD_DEPTH = 3;

/** One kind of block: what it is called, what it starts with and what a person may change on it. */
export interface ComponentDef {
  /** The name a person sees. */
  label: string;
  /** The props of a new block of this kind. Each one must pass `validateProps`. */
  defaultProps: Record<string, JsonValue>;
  /** The props a person can edit. A prop that is not here is refused by `validateProps`. */
  fields: Record<string, Field>;
  /**
   * The width and height in px a new block of this kind starts with. Without it a block is a quarter
   * of the page wide and 80 px tall. With it the block keeps exactly this size, centred across.
   */
  size?: { w: number; h: number };
  /**
   * True for a kind that is not offered when a person adds a block, because it is made another way
   * (a `Group` comes from grouping blocks). It is a kind like any other in every other respect.
   */
  hidden?: boolean;
  /** Whether other blocks can be placed inside this one. Not the same as the `children` of a node. */
  canContain: boolean;
  /** The group of the library this kind is listed under, such as "Basic". Without it, "Custom". */
  category?: string;
  /**
   * The name of an icon in the editor's own set (`text`, `img`, `shape`...), not a drawing: an editor
   * that does not know the name shows a plain one. Lowercase letters, digits and `-`.
   */
  icon?: string;
  /** Other words that find this kind when someone searches the library. */
  keywords?: readonly string[];
  /** One line about the kind, which the library may show and searches. */
  description?: string;
  /**
   * The prop that a person types on the block itself, by double-pressing it, instead of in a panel:
   * the name of a `text` field of this kind. `multiline` lets Enter start a new line; without it Enter
   * ends the edit. A kind without this has no editing on the block.
   */
  inlineText?: { prop: string; multiline?: boolean };
  /** Whether resizing keeps the width to height ratio, for a picture that must not be squashed. */
  lockRatio?: boolean;
}

/** The kinds of block that exist, by the `type` a node stores. */
export type Registry = Record<string, ComponentDef>;
