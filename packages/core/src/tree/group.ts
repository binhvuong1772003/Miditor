import { inferBox } from "../position/infer-box";
import { reparentBox } from "../position/reparent-box";
import { resolveRect } from "../position/resolve-rect";
import { blankAxis } from "../position/set-anchor";
import type { Container, FreeBox } from "../position/types";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import { findNode, parentOf, updateNode } from "./nodes";
import type { FreeNode, TreeNode } from "./types";

const round = (n: number) => Math.round(n * 100) / 100 + 0;

/**
 * A new tree where the blocks `ids` are gathered in one new `Group` block, whose id is `groupId`.
 * The group is exactly as big as the blocks together (their rects, as if not turned), each block
 * stays where it is on the page, and the blocks keep their order. The group sits where the topmost
 * of them was, so the order of painting among the other blocks does not change much. Its anchors
 * follow that topmost block, so grouping does not change how the page behaves when it is resized.
 * `container` is the size of the parent of the blocks (its padding box).
 * The very same tree comes back when fewer than two different blocks are given, when one is not in
 * the tree, is the root, or is not a free block, when they do not all have the same parent, when
 * `groupId` is taken, or when the container is empty.
 */
export function groupNodes(
  root: TreeNode,
  ids: readonly string[],
  groupId: string,
  container: Container,
): TreeNode {
  const unique = [...new Set(ids)];
  if (unique.length < 2 || findNode(root, groupId)) return root;
  if (!(container.w >= 0.01 && container.h >= 0.01)) return root;
  const parent = parentOf(root, unique[0] as string);
  if (!parent) return root;
  const chosen = new Set(unique);
  // In the order of the parent, which is the order they keep and the order of painting.
  const nodes = parent.children.filter((child) => chosen.has(child.id));
  const freeNodes = nodes.filter(isFreeNode);
  if (nodes.length !== unique.length || freeNodes.length !== nodes.length) return root;

  const rects = freeNodes.map((node) => resolveRect(freeBoxOf(node), container));
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const union = {
    x: left,
    y: top,
    w: Math.max(...rects.map((r) => r.x + r.w)) - left,
    h: Math.max(...rects.map((r) => r.y + r.h)) - top,
  };
  const topmost = freeNodes[freeNodes.length - 1] as FreeNode;
  const template: FreeBox = {
    x: blankAxis(topmost.position.x.anchor),
    y: blankAxis(topmost.position.y.anchor),
    w: { kind: "px", v: 0 },
    h: { kind: "px", v: 0 },
    rotation: 0,
  };
  const inferred = inferBox(template, union, container);
  const groupBox: FreeBox = {
    ...inferred,
    w: { kind: "px", v: round(union.w) },
    h: { kind: "px", v: round(union.h) },
  };
  // The rect the stored numbers really give, which is what the blocks inside are measured from.
  const placed = resolveRect(groupBox, container);
  const inside = { w: placed.w, h: placed.h };
  const members = freeNodes.map((node) =>
    withFreeBox(node, reparentBox(freeBoxOf(node), container, inside, placed)),
  );
  const group = withFreeBox(
    {
      id: groupId,
      type: "Group",
      props: {},
      styles: {},
      position: { mode: "free", x: groupBox.x, y: groupBox.y },
      size: { w: groupBox.w, h: groupBox.h },
      rotation: 0,
      children: members,
    },
    groupBox,
  );
  const lastAt = parent.children.indexOf(topmost);
  const before = parent.children.slice(0, lastAt).filter((child) => !chosen.has(child.id));
  const after = parent.children.slice(lastAt + 1);
  return updateNode(root, parent.id, (p) => ({ ...p, children: [...before, group, ...after] }));
}

/**
 * A new tree where the `Group` block `groupId` is gone and the blocks that were in it stand in its
 * place, in their order, each exactly where it was on the page: the reverse of `groupNodes`.
 * `container` is the size of the parent of the group (its padding box). A group with nothing in it
 * is simply removed. The very same tree comes back when the block is not in the tree, is the root,
 * is not a `Group`, is not a free block, is turned (the blocks inside could not keep their place),
 * has a block inside that is not free, or when the container is empty.
 */
export function ungroupNode(root: TreeNode, groupId: string, container: Container): TreeNode {
  const group = findNode(root, groupId);
  const parent = parentOf(root, groupId);
  if (!group || !parent || group.type !== "Group" || !isFreeNode(group)) return root;
  if (group.rotation !== 0 || !group.children.every(isFreeNode)) return root;
  if (!(container.w >= 0.01 && container.h >= 0.01)) return root;
  const placed = resolveRect(freeBoxOf(group), container);
  const inside = { w: placed.w, h: placed.h };
  // The parent's corner is where the group's corner is, taken backwards.
  const shift = { x: -placed.x, y: -placed.y };
  const members = group.children
    .filter(isFreeNode)
    .map((node) => withFreeBox(node, reparentBox(freeBoxOf(node), inside, container, shift)));
  return updateNode(root, parent.id, (p) => ({
    ...p,
    children: p.children.flatMap((child) => (child.id === groupId ? members : [child])),
  }));
}
