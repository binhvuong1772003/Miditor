import type { NodeStyles, TreeNode } from "./types";

/** The styles without this key. */
const without = (styles: NodeStyles, key: keyof NodeStyles): NodeStyles =>
  Object.fromEntries(Object.entries(styles).filter(([name]) => name !== key)) as NodeStyles;

/**
 * The same node with one style set, or removed when `value` is `undefined`. An empty value deletes
 * the key: `undefined` is never stored. When nothing changes the very same node comes back, so
 * `updateNode` keeps the identity of the whole tree. Every other part of the node is shared.
 */
export function withStyle<N extends TreeNode, K extends keyof NodeStyles>(
  node: N,
  key: K,
  value: NodeStyles[K] | undefined,
): N {
  if (node.styles[key] === value) return node;
  const rest = without(node.styles, key);
  return { ...node, styles: value === undefined ? rest : { ...rest, [key]: value } };
}
