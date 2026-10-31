import type { NodeEffects } from "../styles/effects";
import type { TreeNode } from "./types";

/**
 * The same node with this motion. An empty `effects`, or `undefined`, removes the key so that a
 * block without motion is stored as it was before there was any. When nothing changes the very same
 * node comes back, so `updateNode` keeps the identity of the whole tree.
 */
export function withEffects<N extends TreeNode>(node: N, effects: NodeEffects | undefined): N {
  const empty = effects === undefined || Object.keys(effects).length === 0;
  if (empty) {
    if (node.effects === undefined) return node;
    const { effects: _removed, ...rest } = node;
    return rest as N;
  }
  if (JSON.stringify(node.effects) === JSON.stringify(effects)) return node;
  return { ...node, effects };
}
