import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { withPhoneBox } from "./free-box";
import { findNode, parentOf } from "./nodes";
import { type Reorder, reorderNode } from "./reorder";
import type { FlowNode, TreeNode } from "./types";

const leaf = (id: string): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children: [],
});
const row = (...names: string[]): FlowNode => ({
  ...leaf("root"),
  children: names.map(leaf),
});
const order = (n: TreeNode | undefined) => n?.children.map((c) => c.id);
const MOVES: Reorder[] = ["front", "back", "forward", "backward"];

describe("reorderNode", () => {
  const root = row("a", "b", "c", "d");

  it.each([
    ["front", "b", ["a", "c", "d", "b"]],
    ["back", "c", ["c", "a", "b", "d"]],
    ["forward", "b", ["a", "c", "b", "d"]],
    ["backward", "c", ["a", "c", "b", "d"]],
    ["forward", "a", ["b", "a", "c", "d"]],
    ["backward", "d", ["a", "b", "d", "c"]],
  ] as const)("%s moves %s to %j", (to, id, expected) => {
    expect(order(reorderNode(root, id, to))).toEqual(expected);
  });

  it("returns the same tree at an end, for the root, for a missing id and for a bad move", () => {
    expect(reorderNode(root, "d", "front")).toBe(root);
    expect(reorderNode(root, "d", "forward")).toBe(root);
    expect(reorderNode(root, "a", "back")).toBe(root);
    expect(reorderNode(root, "a", "backward")).toBe(root);
    expect(reorderNode(root, "root", "front")).toBe(root);
    expect(reorderNode(root, "zz", "front")).toBe(root);
    expect(reorderNode(root, "b", "sideways" as Reorder)).toBe(root);
  });

  it("changes only the order within the parent that holds the block", () => {
    const nested: FlowNode = { ...leaf("root"), children: [leaf("x"), row2("p", "q", "r")] };
    const out = reorderNode(nested, "q", "front");
    expect(order(findNode(out, "p-parent"))).toEqual(["p", "r", "q"]);
    expect(out.children[0]).toBe(nested.children[0]);
  });

  it("keeps the phone placement of a free block", () => {
    const box = {
      x: { anchor: "start", offset: 1 },
      y: { anchor: "start", offset: 2 },
      w: { kind: "px", v: 3 },
      h: { kind: "px", v: 4 },
      rotation: 0,
    } as const;
    const free = withPhoneBox(
      {
        ...leaf("f"),
        position: { mode: "free", x: box.x, y: box.y },
        size: { w: box.w, h: box.h },
        rotation: 0,
      },
      box,
    );
    const out = reorderNode({ ...leaf("root"), children: [free, leaf("g")] }, "f", "front");
    expect(order(out)).toEqual(["g", "f"]);
    expect(out.children[1]).toBe(free);
  });

  it("only reorders: the same blocks, the same parents, the block ends at the asked place", () => {
    fc.assert(
      fc.property(tree, fc.nat(30), fc.constantFrom(...MOVES), (raw, pick, to) => {
        const t = relabel(raw);
        const all = nodesOf(t);
        const node = all[pick % all.length] as TreeNode;
        const out = reorderNode(t, node.id, to);
        expect(
          nodesOf(out)
            .map((n) => n.id)
            .sort(),
        ).toEqual(all.map((n) => n.id).sort());
        const before = parentOf(t, node.id);
        if (!before) {
          expect(out).toBe(t);
          return;
        }
        const after = parentOf(out, node.id) as TreeNode;
        const kids = (n: TreeNode) => n.children.map((c) => c.id);
        expect(after.id).toBe(before.id);
        expect([...kids(after)].sort()).toEqual([...kids(before)].sort());
        if (to === "front") expect(kids(after).at(-1)).toBe(node.id);
        if (to === "back") expect(kids(after)[0]).toBe(node.id);
      }),
    );
  });
});

function row2(...names: string[]): FlowNode {
  return { ...leaf("p-parent"), children: names.map(leaf) };
}
