import type { Device } from "./device";
import type { JsonValue, TreeNode } from "./types";

/**
 * The props a node has on this screen: its own, and on the phone those the person set for the
 * phone (`phoneProps`) put over them. The very same `props` object comes back when there is nothing
 * to put over it, so a caller can compare it.
 */
export function propsFor(node: TreeNode, device: Device): Record<string, JsonValue> {
  if (device !== "phone" || !node.phoneProps) return node.props;
  return { ...node.props, ...node.phoneProps };
}

/**
 * The node with one prop set for the phone, or taken back to the desktop value when `value` is
 * `undefined`. `phoneProps` is dropped from the node when it ends up empty. The very same node comes
 * back when nothing changes.
 */
export function withPhoneProp<N extends TreeNode>(
  node: N,
  name: string,
  value: JsonValue | undefined,
): N {
  const current = node.phoneProps ?? {};
  const has = Object.hasOwn(current, name);
  if (value === undefined ? !has : has && current[name] === value) return node;
  const next = { ...current };
  if (value === undefined) delete next[name];
  else next[name] = value;
  const { phoneProps: _old, ...rest } = node;
  return (Object.keys(next).length === 0 ? rest : { ...rest, phoneProps: next }) as N;
}
