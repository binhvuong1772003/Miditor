import { MAX_COORDINATE } from "../position/limits";
import type { Axis, Size } from "../position/types";
import { isPixelLength } from "../styles/pixel-length";
import { isColorValue, isTheme } from "../styles/theme";
import type { PageData, TreeNode } from "./types";

/** The version of the saved shape. A page with another number is not read as this one. */
export const SCHEMA_VERSION = 1;

/** A page with a root and nothing in it, for an editor that is opened without data. */
export function emptyPage(): PageData {
  return {
    schemaVersion: SCHEMA_VERSION,
    root: {
      id: "root",
      type: "Page",
      props: {},
      styles: {},
      position: { mode: "flow" },
      children: [],
    },
  };
}

/** How deep a tree may be, how many nodes it may have and how deep a prop may nest. */
const MAX_DEPTH = 100;
const MAX_NODES = 20000;
const MAX_PROP_DEPTH = 32;

/** True for an object made by `JSON.parse` or by a literal, not an array, a Date, a Map or a class instance. */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** True when the object has no key outside `allowed`. */
const hasOnly = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));

/** `NaN` and the infinities fail the comparison, so the bound is also the finite check. */
const isCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Math.abs(value) <= MAX_COORDINATE;

/** What survives `JSON.stringify` and `JSON.parse` unchanged. */
function isJsonValue(value: unknown, depth: number): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (depth >= MAX_PROP_DEPTH) return false;
  if (Array.isArray(value)) return value.every((item) => isJsonValue(item, depth + 1));
  if (isPlainObject(value))
    return Object.values(value).every((item) => isJsonValue(item, depth + 1));
  return false;
}

/** A stored rotation is a finite number of degrees from -180 to 180, both ends included. */
const isRotation = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 180;

function isAxis(value: unknown): value is Axis {
  if (!isPlainObject(value)) return false;
  switch (value.anchor) {
    case "start":
    case "end":
    case "center":
      return hasOnly(value, ["anchor", "offset"]) && isCoordinate(value.offset);
    case "stretch":
      return (
        hasOnly(value, ["anchor", "start", "end"]) &&
        isCoordinate(value.start) &&
        isCoordinate(value.end)
      );
    case "scale":
      return (
        hasOnly(value, ["anchor", "start", "size"]) &&
        isCoordinate(value.start) &&
        isCoordinate(value.size)
      );
    default:
      return false;
  }
}

function isSize(value: unknown): value is Size {
  return (
    isPlainObject(value) &&
    hasOnly(value, ["kind", "v"]) &&
    (value.kind === "px" || value.kind === "percent") &&
    isCoordinate(value.v) &&
    value.v >= 0
  );
}

const STYLE_CHECKS: Record<string, (value: unknown) => boolean> = {
  background: isColorValue,
  borderWidth: isPixelLength,
  borderColor: isColorValue,
  borderRadius: isPixelLength,
};

function isStyles(value: unknown): boolean {
  return (
    isPlainObject(value) &&
    Object.entries(value).every(
      ([key, item]) => Object.hasOwn(STYLE_CHECKS, key) && STYLE_CHECKS[key]?.(item),
    )
  );
}

const NODE_KEYS = [
  "id",
  "type",
  "props",
  "styles",
  "children",
  "position",
  "size",
  "rotation",
  "phone",
  "phoneProps",
  "lockRatio",
];

/** The placement set by hand on a phone: every number of `FreeBox`, and nothing else. */
const isPhonePlacement = (value: unknown): boolean =>
  isPlainObject(value) &&
  hasOnly(value, ["x", "y", "w", "h", "rotation"]) &&
  isAxis(value.x) &&
  isAxis(value.y) &&
  isSize(value.w) &&
  isSize(value.h) &&
  isRotation(value.rotation);

/** Checks the placement fields, which depend on the mode: a flow node has none, a free node all. */
function hasValidPlacement(node: Record<string, unknown>): boolean {
  const position = node.position;
  if (!isPlainObject(position)) return false;
  if (position.mode === "flow") {
    return (
      hasOnly(position, ["mode"]) &&
      !("size" in node) &&
      !("rotation" in node) &&
      !("phone" in node) &&
      !("lockRatio" in node)
    );
  }
  if (position.mode !== "free") return false;
  const size = node.size;
  return (
    hasOnly(position, ["mode", "x", "y"]) &&
    isAxis(position.x) &&
    isAxis(position.y) &&
    isPlainObject(size) &&
    hasOnly(size, ["w", "h"]) &&
    isSize(size.w) &&
    isSize(size.h) &&
    isRotation(node.rotation) &&
    (!("phone" in node) || isPhonePlacement(node.phone)) &&
    (!("lockRatio" in node) || typeof node.lockRatio === "boolean")
  );
}

/** Checks one node and everything under it. `seen` collects ids so that a repeat is refused. */
function isNode(value: unknown, depth: number, seen: Set<string>): value is TreeNode {
  if (depth > MAX_DEPTH || !isPlainObject(value) || !hasOnly(value, NODE_KEYS)) return false;
  const { id, type, props, styles, children } = value;
  if (typeof id !== "string" || id === "" || seen.has(id)) return false;
  seen.add(id);
  if (seen.size > MAX_NODES) return false;
  return (
    typeof type === "string" &&
    type !== "" &&
    isPlainObject(props) &&
    isJsonValue(props, 0) &&
    (!("phoneProps" in value) ||
      (isPlainObject(value.phoneProps) && isJsonValue(value.phoneProps, 0))) &&
    isStyles(styles) &&
    hasValidPlacement(value) &&
    Array.isArray(children) &&
    children.every((child) => isNode(child, depth + 1, seen))
  );
}

/**
 * True only for a page that this version of the editor can open: the right `schemaVersion`, a root
 * that is placed by flow, and a tree in which every node has the shape the types promise, with
 * unique ids and values that are safe to draw. Data comes from outside (a saved file, a browser
 * store, a server), so nothing is assumed and nothing throws: anything else is simply `false`.
 */
export function isPageData(value: unknown): value is PageData {
  if (!isPlainObject(value) || !hasOnly(value, ["schemaVersion", "root", "theme"])) return false;
  if ("theme" in value && !isTheme(value.theme)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION) return false;
  const root = value.root;
  if (!isPlainObject(root) || !isPlainObject(root.position) || root.position.mode !== "flow") {
    return false;
  }
  return isNode(root, 0, new Set());
}
