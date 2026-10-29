import type { Container } from "../position/types";
import { newBlock } from "../tree/new-block";
import type { FreeNode } from "../tree/types";
import { propsWithDefaults } from "./props-with-defaults";
import type { Registry } from "./types";

/**
 * A new free block of this kind: placed like `newBlock` (in the middle of its parent, not turned)
 * and with the default props of its kind. Each call makes its own `props` object, whose values are
 * shared with the registry like the rest of the tree. Returns `undefined` for a kind the registry
 * does not have, since there is nothing to make it from.
 */
export function newNode(
  registry: Registry,
  type: string,
  id: string,
  container: Container,
): FreeNode | undefined {
  // Own keys only: a kind named `constructor` is not on the registry.
  const def = Object.hasOwn(registry, type) ? registry[type] : undefined;
  if (!def) return undefined;
  return { ...newBlock(id, container), type, props: propsWithDefaults(def, {}) };
}
