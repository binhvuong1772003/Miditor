import type { Container } from "../position/types";
import { newBlock } from "../tree/new-block";
import type { FreeNode, JsonValue } from "../tree/types";
import { propsWithDefaults } from "./props-with-defaults";
import type { Registry } from "./types";

/** What a caller can set on the new block instead of the defaults of its kind. */
export interface NewNodeOverrides {
  /** The width and height in px to start with. One that is not finite and above 0 is ignored. */
  size?: { w: number; h: number };
  /** Props to start with. They are not checked here (see `validateProps`); the rest take their defaults. */
  props?: Record<string, JsonValue>;
}

const isUsable = (size: { w: number; h: number }) =>
  Number.isFinite(size.w) && size.w > 0 && Number.isFinite(size.h) && size.h > 0;

/**
 * A new free block of this kind: placed like `newBlock` (in the middle of its parent, not turned,
 * with the `size` of its kind when it has one) and with the default props of its kind. Each call makes its own `props` object, whose values are
 * shared with the registry like the rest of the tree. `overrides` set the size or some props at the
 * start, for a picture that arrives with its address and its own proportions. Returns `undefined`
 * for a kind the registry does not have, since there is nothing to make it from.
 */
export function newNode(
  registry: Registry,
  type: string,
  id: string,
  container: Container,
  overrides: NewNodeOverrides = {},
): FreeNode | undefined {
  // Own keys only: a kind named `constructor` is not on the registry.
  const def = Object.hasOwn(registry, type) ? registry[type] : undefined;
  if (!def) return undefined;
  const size = overrides.size && isUsable(overrides.size) ? overrides.size : def.size;
  return {
    ...newBlock(id, container, size),
    type,
    props: { ...propsWithDefaults(def, overrides.props ?? {}) },
  };
}
