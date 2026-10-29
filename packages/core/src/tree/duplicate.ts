import { inferBox } from "../position/infer-box";
import { resolveRect } from "../position/resolve-rect";
import type { Container } from "../position/types";
import { boxFor } from "./device";
import { isFreeNode, withFreeBox, withPhoneBox } from "./free-box";
import { findNode, idsOf, parentOf, updateNode } from "./nodes";
import type { TreeNode } from "./types";

/** How many nodes there are in this one and under it. */
const sizeOf = (node: TreeNode): number =>
  1 + node.children.reduce((total, child) => total + sizeOf(child), 0);

/** The ids `n1`, `n2`... that no node of the tree has, in order. */
function freeIds(root: TreeNode, count: number): string[] {
  const taken = idsOf(root);
  const found: string[] = [];
  for (let n = 1; found.length < count; n++) {
    if (!taken.has(`n${n}`)) found.push(`n${n}`);
  }
  return found;
}

/**
 * A new tree with a copy of the block `id`, and of everything in it, placed right after it among
 * its siblings, so it is painted above the original. Every node of the copy has a new id; the
 * copy itself has the id `nextId(root)`. With `shift` and the `container` (the size of the parent,
 * its padding box) a free copy is moved by that many px, down and to the right when positive, so it
 * does not hide the original; the phone placement of such a copy is dropped, so it follows the
 * shifted desktop one. Without a shift the copy is exact, phone placement included. The blocks
 * inside keep their places in it. The very same tree comes back when the block is not in the tree
 * or is the root.
 */
export function duplicateNode(
  root: TreeNode,
  id: string,
  options?: { shift: { x: number; y: number }; container: Container },
): TreeNode {
  const node = findNode(root, id);
  const parent = parentOf(root, id);
  if (!node || !parent) return root;
  const ids = freeIds(root, sizeOf(node));
  const copyOf = (original: TreeNode): TreeNode => ({
    ...original,
    id: ids.shift() as string,
    children: original.children.map(copyOf),
  });
  let copy = copyOf(node);
  if (options && isFreeNode(copy)) {
    const box = boxFor(copy, "desktop");
    const rect = resolveRect(box, options.container);
    const moved = inferBox(
      box,
      { ...rect, x: rect.x + options.shift.x, y: rect.y + options.shift.y },
      options.container,
    );
    copy = withPhoneBox(withFreeBox(copy, moved), undefined);
  }
  return updateNode(root, parent.id, (p) => {
    const at = p.children.indexOf(node) + 1;
    return { ...p, children: [...p.children.slice(0, at), copy, ...p.children.slice(at)] };
  });
}
