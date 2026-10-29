import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, solidContainer } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import type { FreeBox, Rect } from "../position/types";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import { groupNodes } from "./group";
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
