import type { JsonValue, PageData, TreeNode } from "../tree/types";
import type { Field, ItemField, Registry } from "./types";

/** One item an `external` field of the page holds: where it is, which source it came from, what is stored. */
export interface ExternalRef {
  nodeId: string;
  /** From the prop name inward: the array index or the object key of each level. */
  path: readonly (string | number)[];
  source: string;
  value: { id: string; label: string; data?: JsonValue; at?: string };
}

const isObject = (value: unknown): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function collect(
  field: Field | ItemField,
  value: JsonValue | undefined,
  path: readonly (string | number)[],
  out: (path: readonly (string | number)[], source: string, value: ExternalRef["value"]) => void,
): void {
  if (value === undefined || value === null) return;
  if (field.type === "external") {
    if (isObject(value) && typeof value.id === "string" && typeof value.label === "string") {
      out(path, field.source, value as ExternalRef["value"]);
    }
  } else if (field.type === "array" && Array.isArray(value)) {
    value.forEach((item, at) => {
      collect(field.item, item, [...path, at], out);
    });
  } else if (field.type === "object" && isObject(value)) {
    for (const [key, inner] of Object.entries(field.fields)) {
      collect(inner, value[key], [...path, key], out);
    }
  }
}

/** Every item the `external` fields of the page hold (not the empty ones), nested fields included. */
export function externalRefs(registry: Registry, page: PageData): ExternalRef[] {
  const refs: ExternalRef[] = [];
  const walk = (node: TreeNode) => {
    const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
    if (def) {
      for (const [name, field] of Object.entries(def.fields)) {
        collect(field, node.props[name], [name], (path, source, value) => {
          refs.push({ nodeId: node.id, path, source, value });
        });
      }
    }
    for (const child of node.children) walk(child);
  };
  walk(page.root);
  return refs;
}

const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => same((a as never)[key], (b as never)[key]))
  );
};

function setAt(target: JsonValue, path: readonly (string | number)[], value: JsonValue): JsonValue {
  const [head, ...rest] = path;
  if (head === undefined) return value;
  if (Array.isArray(target) && typeof head === "number") {
    const next = target.slice();
    next[head] = setAt(target[head] as JsonValue, rest, value);
    return next;
  }
  if (isObject(target) && typeof head === "string") {
    return { ...target, [head]: setAt(target[head] as JsonValue, rest, value) };
  }
  return target;
}

/** The page with these values written at their paths. The very page when nothing differs. */
export function withExternalValues(
  page: PageData,
  changes: readonly { nodeId: string; path: readonly (string | number)[]; value: JsonValue }[],
): PageData {
  if (changes.length === 0) return page;
  let touched = false;
  const walk = (node: TreeNode): TreeNode => {
    let props = node.props as Record<string, JsonValue>;
    let changed = false;
    for (const change of changes) {
      if (change.nodeId !== node.id) continue;
      const [name, ...rest] = change.path;
      if (typeof name !== "string") continue;
      const before = props[name] as JsonValue;
      const after = setAt(before, rest, change.value);
      if (same(before, after)) continue;
      props = { ...props, [name]: after };
      changed = true;
    }
    const children = node.children.map(walk);
    const kidsChanged = children.some((child, at) => child !== node.children[at]);
    if (!changed && !kidsChanged) return node;
    touched = true;
    return { ...node, props, children } as TreeNode;
  };
  const root = walk(page.root);
  return touched ? { ...page, root } : page;
}
