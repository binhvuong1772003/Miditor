import { inferBox } from "../position/infer-box";
import { resolveRect } from "../position/resolve-rect";
import type { Container } from "../position/types";
import { boxFor } from "./device";
import { isFreeNode, withFreeBox, withPhoneBox } from "./free-box";
import { countNodes, findNode, freeIds, parentOf, updateNode } from "./nodes";
import type { TreeNode } from "./types";

/**
 * A free block moved by `shift` px, down and to the right when positive, in a parent of the size
 * `container`; its phone placement is dropped, so it follows the shifted desktop one. Any other
 * block comes back as it is.
 */
export function shiftBlock(
  node: TreeNode,
  shift: { x: number; y: number },
  container: Container,
): TreeNode {
  if (!isFreeNode(node)) return node;
  const box = boxFor(node, "desktop");
  const rect = resolveRect(box, container);
  const moved = inferBox(box, { ...rect, x: rect.x + shift.x, y: rect.y + shift.y }, container);
  return withPhoneBox(withFreeBox(node, moved), undefined);
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
  const ids = freeIds(root, countNodes(node));
  const copyOf = (original: TreeNode): TreeNode => ({
    ...original,
    id: ids.shift() as string,
    children: original.children.map(copyOf),
  });
  let copy = copyOf(node);
  if (options) copy = shiftBlock(copy, options.shift, options.container);
  return updateNode(root, parent.id, (p) => {
    const at = p.children.indexOf(node) + 1;
    return { ...p, children: [...p.children.slice(0, at), copy, ...p.children.slice(at)] };
  });
}
