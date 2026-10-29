import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, nodesOf, relabel, tree } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import type { FreeBox } from "../position/types";
import { duplicateNode } from "./duplicate";
import { withFreeBox, withPhoneBox } from "./free-box";
import { findNode, nextId } from "./nodes";
import { emptyPage, isPageData } from "./page";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const container = { w: 400, h: 300 };
const shift = { x: 16, y: 24 };

const placed = (id: string, b: FreeBox, children: TreeNode[] = []): FreeNode =>
  withFreeBox(
    {
      id,
      type: "Shape",
      props: { fill: "#cbd5e1" },
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
const ids = (n: TreeNode | undefined) => n?.children.map((c) => c.id);

describe("duplicateNode", () => {
  const inner = placed("inner", at(5, 5, 10, 10));
  const a = placed("a", at(10, 20), [inner]);
  const b = placed("b", at(200, 100));
  const root = flowNode("root", [a, b]);

  it("puts a copy of the block, and of what is in it, right after it with new ids", () => {
    const out = duplicateNode(root, "a");
    expect(ids(out)).toEqual(["a", "n1", "b"]);
    expect(out.children[0]).toBe(a);
    expect(out.children[2]).toBe(b);
    const copy = out.children[1] as FreeNode;
    expect(copy.id).toBe(nextId(root));
    expect(ids(copy)).toEqual(["n2"]);
    expect(copy.position).toBe(a.position);
    expect(copy.props).toBe(a.props);
    expect(root.children).toHaveLength(2);
  });

  it("gives the ids n1, n2... that are free, skipping the ones in use", () => {
    const busy = flowNode("root", [placed("n1", at(0, 0), [placed("n3", at(0, 0))])]);
    const out = duplicateNode(busy, "n1");
    const copy = out.children[1] as TreeNode;
    expect(copy.id).toBe("n2");
    expect(ids(copy)).toEqual(["n4"]);
  });

  it("copies a block inside another one next to it, in that parent", () => {
    const out = duplicateNode(root, "inner");
    expect(ids(findNode(out, "a"))).toEqual(["inner", "n1"]);
  });

  it("moves a free copy by the shift and drops its phone placement, but not with no shift", () => {
    const withPhone = withPhoneBox(a, at(1, 2, 3, 4));
    const page = flowNode("root", [withPhone]);
    const moved = duplicateNode(page, "a", { shift, container }).children[1] as FreeNode;
    expect(moved.position.x).toEqual({ anchor: "start", offset: 26 });
    expect(moved.position.y).toEqual({ anchor: "start", offset: 44 });
    expect(moved.phone).toBeUndefined();
    expect("phone" in moved).toBe(false);
    // What is inside it is measured from it and does not move.
    expect((moved.children[0] as FreeNode).position.x).toEqual({ anchor: "start", offset: 5 });
    const exact = duplicateNode(page, "a").children[1] as FreeNode;
    expect(exact.phone).toEqual(at(1, 2, 3, 4));
  });

  it("shifts a copy whatever its anchors are", () => {
    const anchors: FreeBox[] = [
      { ...at(0, 0), x: { anchor: "end", offset: 30 } },
      { ...at(0, 0), x: { anchor: "center", offset: 4 } },
      { ...at(0, 0), x: { anchor: "stretch", start: 10, end: 20 } },
      { ...at(0, 0), x: { anchor: "scale", start: 10, size: 30 } },
    ];
    for (const b of anchors) {
      const page = flowNode("root", [placed("a", b)]);
      const copy = duplicateNode(page, "a", { shift, container }).children[1] as FreeNode;
      const before = resolveRect(b, container);
      const after = resolveRect(
        {
          ...b,
          x: copy.position.x,
          y: copy.position.y,
          w: copy.size.w,
          h: copy.size.h,
          rotation: 0,
        },
        container,
      );
      expect(Math.abs(after.x - before.x - 16)).toBeLessThan(0.05);
      expect(Math.abs(after.y - before.y - 24)).toBeLessThan(0.05);
      expect(Math.abs(after.w - before.w)).toBeLessThan(0.05);
    }
  });

  it("does not move a copy of a flow block", () => {
    const page = flowNode("root", [flowNode("f", [flowNode("g")])]);
    const out = duplicateNode(page, "f", { shift, container });
    expect(out.children[1]).toEqual({ ...flowNode("n1", [flowNode("n2")]) });
  });

  it("returns the very same tree for the root and for an id that is not there", () => {
    expect(duplicateNode(root, "root")).toBe(root);
    expect(duplicateNode(root, "nope")).toBe(root);
  });

  it("makes a page that is still valid", () => {
    const page = emptyPage();
    const grown = { ...page, root: { ...page.root, children: [a, b] } };
    const out = { ...grown, root: duplicateNode(grown.root, "a", { shift, container }) };
    expect(isPageData(out)).toBe(true);
  });

  it("copies exactly: ids are new and unique, the rest is the same, for any tree", () => {
    fc.assert(
      fc.property(tree, fc.nat(), (generated, pick) => {
        const t = relabel(generated);
        const all = nodesOf(t);
        if (all.length < 2) return;
        const target = all[1 + (pick % (all.length - 1))] as TreeNode;
        const out = duplicateNode(t, target.id);
        const copy = findNode(out, nextId(t)) as TreeNode;
        expect(copy).toBeDefined();
        const allIds = nodesOf(out).map((n) => n.id);
        expect(new Set(allIds).size).toBe(allIds.length);
        expect(allIds).toHaveLength(all.length + nodesOf(target).length);
        expect(relabel(copy)).toEqual(relabel(target));
        expect(nodesOf(out).map((n) => n.id)).toEqual(expect.arrayContaining(all.map((n) => n.id)));
      }),
    );
  });

  it("shifts a free copy by exactly the shift, for any box and container", () => {
    fc.assert(
      fc.property(
        box,
        fc.record({ w: fc.integer({ min: 50, max: 1600 }), h: fc.integer({ min: 50, max: 1200 }) }),
        (b, size) => {
          const page = flowNode("root", [placed("a", b)]);
          const copy = duplicateNode(page, "a", { shift, container: size }).children[1] as FreeNode;
          const before = resolveRect(b, size);
          const after = resolveRect(
            {
              x: copy.position.x,
              y: copy.position.y,
              w: copy.size.w,
              h: copy.size.h,
              rotation: copy.rotation,
            },
            size,
          );
          expect(Math.abs(after.x - before.x - 16)).toBeLessThan(0.1);
          expect(Math.abs(after.y - before.y - 24)).toBeLessThan(0.1);
        },
      ),
    );
  });
});
