import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, solidContainer } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import type { FreeBox, Rect } from "../position/types";
import { freeBoxOf, isFreeNode, withFreeBox, withPhoneBox } from "./free-box";
import { groupNodes, ungroupNode } from "./group";
import { findNode } from "./nodes";
import { emptyPage, isPageData } from "./page";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const container = { w: 400, h: 300 };

const placed = (id: string, b: FreeBox, children: TreeNode[] = []): FreeNode =>
  withFreeBox(
    {
      id,
      type: "Shape",
      props: {},
      styles: {},
      position: { mode: "free", x: b.x, y: b.y },
      size: { w: b.w, h: b.h },
      rotation: 0,
      children,
    },
    b,
  );
const at = (x: number, y: number, w = 100, h = 50): FreeBox => ({
  x: { anchor: "start", offset: x },
  y: { anchor: "start", offset: y },
  w: { kind: "px", v: w },
  h: { kind: "px", v: h },
  rotation: 0,
});
const flowNode = (id: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});
const pageWith = (...children: TreeNode[]) => flowNode("root", children);
const ids = (n: TreeNode | undefined) => n?.children.map((c) => c.id);

describe("groupNodes", () => {
  const a = placed("a", at(10, 10));
  const b = placed("b", at(200, 100));
  const c = placed("c", at(50, 200));
  const d = placed("d", at(300, 5));
  const root = pageWith(a, c, b, d);

  it("gathers the blocks in a Group as big as they are together", () => {
    const out = groupNodes(root, ["a", "b"], "g", container);
    const group = findNode(out, "g") as FreeNode;
    expect(group.type).toBe("Group");
    expect(isFreeNode(group)).toBe(true);
    // From x 10 to 300 and from y 10 to 150.
    expect(group.position.x).toEqual({ anchor: "start", offset: 10 });
    expect(group.position.y).toEqual({ anchor: "start", offset: 10 });
    expect(group.size).toEqual({ w: { kind: "px", v: 290 }, h: { kind: "px", v: 140 } });
    expect(ids(group)).toEqual(["a", "b"]);
  });

  it("keeps each block where it is, now measured from the group", () => {
    const out = groupNodes(root, ["a", "b"], "g", container);
    expect((findNode(out, "a") as FreeNode).position.x).toEqual({ anchor: "start", offset: 0 });
    expect((findNode(out, "a") as FreeNode).position.y).toEqual({ anchor: "start", offset: 0 });
    expect((findNode(out, "b") as FreeNode).position.x).toEqual({ anchor: "start", offset: 190 });
    expect((findNode(out, "b") as FreeNode).position.y).toEqual({ anchor: "start", offset: 90 });
  });

  it("puts the group where the topmost block was, and leaves the others alone", () => {
    const out = groupNodes(root, ["a", "b"], "g", container);
    // a, c, b, d  ->  c, g, d : the group takes the place of b, the topmost.
    expect(ids(out)).toEqual(["c", "g", "d"]);
    expect(out.children[0]).toBe(c);
    expect(out.children[2]).toBe(d);
    expect(ids(root)).toEqual(["a", "c", "b", "d"]);
  });

  it("does not care in which order the ids are given, or for repeats", () => {
    const one = groupNodes(root, ["b", "a"], "g", container);
    const two = groupNodes(root, ["a", "b", "a"], "g", container);
    expect(one).toEqual(groupNodes(root, ["a", "b"], "g", container));
    expect(two).toEqual(one);
  });

  it("follows the anchors of the topmost block, so a resize behaves as before", () => {
    const scaled = placed("s", {
      ...at(0, 0),
      x: { anchor: "scale", start: 10, size: 20 },
    });
    const out = groupNodes(pageWith(a, scaled), ["a", "s"], "g", container);
    expect((findNode(out, "g") as FreeNode).position.x.anchor).toBe("scale");
    expect((findNode(out, "g") as FreeNode).position.y.anchor).toBe("start");
  });

  it("makes a page that is still valid", () => {
    const page = emptyPage();
    const grown = { ...page, root: { ...page.root, children: [a, b] } };
    const grouped = { ...grown, root: groupNodes(grown.root, ["a", "b"], "g", container) };
    expect(isPageData(grouped)).toBe(true);
  });

  it("returns the very same tree when it cannot group", () => {
    const withFlow = pageWith(a, flowNode("f"));
    const other = pageWith(placed("p", at(0, 0), [placed("p1", at(0, 0))]), b);
    for (const [tree, list, id, size] of [
      [root, ["a"], "g", container],
      [root, [], "g", container],
      [root, ["a", "a"], "g", container],
      [root, ["a", "nope"], "g", container],
      [root, ["root", "a"], "g", container],
      [root, ["a", "b"], "c", container],
      [root, ["a", "b"], "g", { w: 0, h: 300 }],
      [root, ["a", "b"], "g", { w: 400, h: 0 }],
      [withFlow, ["a", "f"], "g", container],
      [other, ["p1", "b"], "g", container],
    ] as const) {
      expect(groupNodes(tree, list, id, size)).toBe(tree);
    }
  });

  it("keeps every block exactly where it is on the page, whatever the anchors", () => {
    fc.assert(
      fc.property(
        fc.array(box, { minLength: 2, maxLength: 6 }),
        fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
        solidContainer,
        (boxes, mask, size) => {
          const nodes = boxes.map((b, i) => placed(`n${i}`, b));
          const chosen = nodes.filter((_, i) => mask[i]);
          if (chosen.length < 2) return;
          const top = pageWith(...nodes);
          const out = groupNodes(
            top,
            chosen.map((n) => n.id),
            "g",
            size,
          );
          const group = findNode(out, "g") as FreeNode;
          const origin = resolveRect(freeBoxOf(group), size);
          for (const node of chosen) {
            const before: Rect = resolveRect(freeBoxOf(node), size);
            const inner = findNode(out, node.id) as FreeNode;
            const rect = resolveRect(freeBoxOf(inner), { w: origin.w, h: origin.h });
            expect(Math.abs(origin.x + rect.x - before.x)).toBeLessThan(0.1);
            expect(Math.abs(origin.y + rect.y - before.y)).toBeLessThan(0.1);
            expect(Math.abs(rect.w - before.w)).toBeLessThan(0.1);
            expect(Math.abs(rect.h - before.h)).toBeLessThan(0.1);
          }
          // Nothing is lost and nothing is twice.
          const left = out.children.length + chosen.length - 1;
          expect(left).toBe(nodes.length);
        },
      ),
    );
  });
});

describe("ungroupNode", () => {
  const a = placed("a", at(10, 10));
  const b = placed("b", at(200, 100));
  const c = placed("c", at(50, 200));
  const root = pageWith(a, c, b);
  const grouped = groupNodes(root, ["a", "b"], "g", container);

  it("puts the blocks back in the place of the group, where they were on the page", () => {
    const out = ungroupNode(grouped, "g", container);
    expect(ids(out)).toEqual(["c", "a", "b"]);
    expect(findNode(out, "g")).toBeUndefined();
    expect((findNode(out, "a") as FreeNode).position.x).toEqual({ anchor: "start", offset: 10 });
    expect((findNode(out, "b") as FreeNode).position.y).toEqual({ anchor: "start", offset: 100 });
    expect(out.children[0]).toBe(c);
  });

  it("keeps the blocks that were inside a block of the group", () => {
    const inner = placed("in", at(5, 5, 20, 20));
    const nested = pageWith(placed("x", at(0, 0)), placed("y", at(100, 0), [inner]));
    const out = ungroupNode(groupNodes(nested, ["x", "y"], "g", container), "g", container);
    expect(ids(findNode(out, "y"))).toEqual(["in"]);
  });

  it("removes a group with nothing in it", () => {
    const empty = pageWith(a, placed("g", at(0, 0)));
    const emptyGroup = {
      ...empty,
      children: [a, { ...(empty.children[1] as FreeNode), type: "Group" }],
    };
    expect(ids(ungroupNode(emptyGroup, "g", container))).toEqual(["a"]);
  });

  it("returns the very same tree when it cannot ungroup", () => {
    const turned = {
      ...grouped,
      children: grouped.children.map((n) => (n.id === "g" ? { ...n, rotation: 30 } : n)),
    } as TreeNode;
    const flowInside = {
      ...grouped,
      children: grouped.children.map((n) =>
        n.id === "g" ? { ...n, children: [...n.children, flowNode("f")] } : n,
      ),
    } as TreeNode;
    const notGroup = pageWith(placed("s", at(0, 0), [placed("s1", at(0, 0))]));
    // A root that is called a Group is still the page, and cannot be dissolved.
    const groupRoot = { ...pageWith(a), type: "Group" } as TreeNode;
    for (const [tree, id, size] of [
      [grouped, "nope", container],
      [grouped, "root", container],
      [grouped, "a", container],
      [notGroup, "s", container],
      [groupRoot, "root", container],
      [turned, "g", container],
      [flowInside, "g", container],
      [grouped, "g", { w: 0, h: 300 }],
      [grouped, "g", { w: 400, h: 0 }],
    ] as const) {
      expect(ungroupNode(tree, id, size)).toBe(tree);
    }
  });

  it("undoes groupNodes: every block is where it was on the page, whatever the anchors", () => {
    fc.assert(
      fc.property(
        fc.array(box, { minLength: 2, maxLength: 6 }),
        fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
        solidContainer,
        (boxes, mask, size) => {
          const nodes = boxes.map((b, i) => placed(`n${i}`, b));
          const chosen = nodes.filter((_, i) => mask[i]);
          if (chosen.length < 2) return;
          const top = pageWith(...nodes);
          const ungrouped = ungroupNode(
            groupNodes(
              top,
              chosen.map((n) => n.id),
              "g",
              size,
            ),
            "g",
            size,
          );
          expect(ungrouped.children).toHaveLength(nodes.length);
          for (const node of nodes) {
            const before = resolveRect(freeBoxOf(node), size);
            const after = resolveRect(freeBoxOf(findNode(ungrouped, node.id) as FreeNode), size);
            for (const key of ["x", "y", "w", "h"] as const) {
              expect(Math.abs(after[key] - before[key])).toBeLessThan(0.2);
            }
          }
        },
      ),
    );
  });
});

describe("grouping and the phone placement", () => {
  const byHand = at(1, 2, 3, 4);
  const a = withPhoneBox(placed("a", at(10, 10)), byHand);
  const b = withPhoneBox(placed("b", at(200, 100)), byHand);
  const c = withPhoneBox(placed("c", at(50, 200)), byHand);
  const root = pageWith(a, c, b);

  it("drops the phone placement of the blocks it gathers, and only of those", () => {
    const out = groupNodes(root, ["a", "b"], "g", container);
    expect((findNode(out, "a") as FreeNode).phone).toBeUndefined();
    expect((findNode(out, "b") as FreeNode).phone).toBeUndefined();
    expect((findNode(out, "c") as FreeNode).phone).toBe(byHand);
  });

  it("drops the phone placement of the blocks it frees", () => {
    const grouped = groupNodes(root, ["a", "b"], "g", container);
    const inGroup = {
      ...grouped,
      children: grouped.children.map((n) =>
        n.id === "g"
          ? { ...n, children: n.children.map((m) => withPhoneBox(m as FreeNode, byHand)) }
          : n,
      ),
    } as TreeNode;
    const out = ungroupNode(inGroup, "g", container);
    expect((findNode(out, "a") as FreeNode).phone).toBeUndefined();
    expect((findNode(out, "b") as FreeNode).phone).toBeUndefined();
    expect((findNode(out, "c") as FreeNode).phone).toBe(byHand);
  });
});
