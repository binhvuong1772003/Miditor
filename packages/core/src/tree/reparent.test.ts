import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import type { FreeBox } from "../position/types";
import { withFreeBox, withPhoneBox } from "./free-box";
import { findNode, parentOf } from "./nodes";
import { reparentNode } from "./reparent";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const at = (x: number, y: number, w: number, h: number): FreeBox => ({
  x: { anchor: "start", offset: x },
  y: { anchor: "start", offset: y },
  w: { kind: "px", v: w },
  h: { kind: "px", v: h },
  rotation: 0,
});
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
const flowNode = (id: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});
/** The rect a free block really takes up in a parent of this size. */
const rectIn = (n: FreeNode, parent: { w: number; h: number }) =>
  resolveRect(
    { x: n.position.x, y: n.position.y, w: n.size.w, h: n.size.h, rotation: n.rotation },
    parent,
  );
const ids = (n: TreeNode | undefined) => n?.children.map((c) => c.id);

// Page 800x600. A at (100, 50) is 300x200, B at (500, 300) is 200x150. B's corner from A's: (400, 250).
const A_SIZE = { w: 300, h: 200 };
const B_SIZE = { w: 200, h: 150 };
const options = { from: A_SIZE, to: B_SIZE, shift: { x: 400, y: 250 } };

describe("reparentNode", () => {
  const c = placed("c", at(20, 30, 40, 50));
  const d = placed("d", at(0, 0, 10, 10));
  const a = placed("a", at(100, 50, 300, 200), [c]);
  const b = placed("b", at(500, 300, 200, 150), [d]);
  const root = flowNode("root", [a, b]);

  it("moves the block into the new parent, last by default, and keeps it where it was on the page", () => {
    const out = reparentNode(root, "c", "b", options);
    expect(ids(findNode(out, "a"))).toEqual([]);
    expect(ids(findNode(out, "b"))).toEqual(["d", "c"]);
    const moved = findNode(out, "c") as FreeNode;
    // On the page: A's corner (100, 50) + (20, 30) = (120, 80); B's corner is (500, 300).
    expect(rectIn(moved, B_SIZE)).toMatchObject({ x: -380, y: -220, w: 40, h: 50 });
  });

  it("puts the block at the asked place among the children", () => {
    expect(ids(findNode(reparentNode(root, "c", "b", { ...options, index: 0 }), "b"))).toEqual([
      "c",
      "d",
    ]);
  });

  it("works the other way, out to the page", () => {
    const out = reparentNode(root, "d", "root", {
      from: B_SIZE,
      to: { w: 800, h: 600 },
      shift: { x: -500, y: -300 },
    });
    expect(ids(out)).toEqual(["a", "b", "d"]);
    const moved = findNode(out, "d") as FreeNode;
    expect(
      resolveRect(
        {
          ...at(0, 0, 0, 0),
          x: moved.position.x,
          y: moved.position.y,
          w: moved.size.w,
          h: moved.size.h,
        },
        { w: 800, h: 600 },
      ),
    ).toMatchObject({ x: 500, y: 300 });
  });

  it("drops the phone placement and leaves the other blocks as they are", () => {
    const withPhone = placed("c", at(20, 30, 40, 50));
    const page = flowNode("root", [
      placed("a", at(100, 50, 300, 200), [withPhoneBox(withPhone, at(1, 2, 3, 4))]),
      b,
    ]);
    const out = reparentNode(page, "c", "b", options);
    expect((findNode(out, "c") as FreeNode).phone).toBeUndefined();
    expect(findNode(out, "d")).toBe(d);
  });

  it("returns the same tree when it cannot or need not move", () => {
    expect(reparentNode(root, "zz", "b", options)).toBe(root);
    expect(reparentNode(root, "c", "zz", options)).toBe(root);
    expect(reparentNode(root, "root", "b", options)).toBe(root);
    expect(reparentNode(root, "c", "a", options)).toBe(root); // already its parent
    expect(reparentNode(root, "a", "c", options)).toBe(root); // into itself
    expect(reparentNode(root, "a", "a", options)).toBe(root);
    expect(reparentNode(root, "c", "b", { ...options, from: { w: 0, h: 200 } })).toBe(root);
    expect(reparentNode(root, "c", "b", { ...options, to: { w: 200, h: 0 } })).toBe(root);
  });

  it("does not touch a block that is moved to its own parent, even when it is not last", () => {
    const page = flowNode("root", [placed("a", at(0, 0, 300, 200), [c, d]), b]);
    expect(reparentNode(page, "c", "a", { ...options, index: 1 })).toBe(page);
  });

  it("returns the same tree for a block that is not free", () => {
    const page = flowNode("root", [placed("a", at(0, 0, 100, 100), [flowNode("f")]), b]);
    expect(reparentNode(page, "f", "b", options)).toBe(page);
  });

  it("keeps the block where it was on the page, whatever its anchors", () => {
    fc.assert(
      fc.property(
        box,
        fc.integer({ min: 50, max: 900 }),
        fc.integer({ min: 50, max: 900 }),
        fc.integer({ min: 50, max: 900 }),
        fc.integer({ min: 50, max: 900 }),
        fc.integer({ min: -300, max: 300 }),
        fc.integer({ min: -300, max: 300 }),
        (b0, aw, ah, bw, bh, sx, sy) => {
          const from = { w: aw, h: ah };
          const to = { w: bw, h: bh };
          const child = placed("c", b0);
          const page = flowNode("root", [
            placed("a", at(0, 0, aw, ah), [child]),
            placed("b", at(sx, sy, bw, bh)),
          ]);
          const out = reparentNode(page, "c", "b", { from, to, shift: { x: sx, y: sy } });
          expect(parentOf(out, "c")?.id).toBe("b");
          const moved = findNode(out, "c") as FreeNode;
          const before = resolveRect(b0, from);
          const after = rectIn(moved, to);
          expect(after.x + sx).toBeCloseTo(before.x, 0);
          expect(after.y + sy).toBeCloseTo(before.y, 0);
          expect(after.w).toBeCloseTo(before.w, 0);
          expect(after.h).toBeCloseTo(before.h, 0);
        },
      ),
    );
  });

  describe("with frames", () => {
    // A is 200 x 100 with its middle at (500, 300), turned 90 degrees; the page is upright 800 x 600.
    const turnedA = { size: { w: 200, h: 100 }, center: { x: 500, y: 300 }, rotation: 90 };
    const upright = { size: { w: 800, h: 600 }, center: { x: 400, y: 300 }, rotation: 0 };
    const child = placed("c", at(0, 0, 40, 20));
    const page = flowNode("root", [placed("a", at(0, 0, 200, 100), [child])]);

    it("carries a block out of a turned parent and keeps it where it is and turned as it is", () => {
      const out = reparentNode(page, "c", "root", { from: turnedA, to: upright });
      expect(ids(out)).toEqual(["a", "c"]);
      const moved = findNode(out, "c") as FreeNode;
      expect(rectIn(moved, { w: 800, h: 600 })).toMatchObject({ x: 520, y: 210, w: 40, h: 20 });
      expect(moved.rotation).toBe(90);
    });

    it("works the other way, into a turned parent", () => {
      const out = reparentNode(
        flowNode("root", [
          placed("a", at(0, 0, 200, 100)),
          placed("c", { ...at(520, 210, 40, 20), rotation: 90 }),
        ]),
        "c",
        "a",
        { from: upright, to: turnedA },
      );
      const moved = findNode(out, "c") as FreeNode;
      expect(ids(findNode(out, "a"))).toEqual(["c"]);
      expect(rectIn(moved, { w: 200, h: 100 })).toMatchObject({ x: 0, y: 0, w: 40, h: 20 });
      expect(moved.rotation).toBe(0);
    });

    it("returns the same tree for a frame with an empty size", () => {
      const flat = { ...upright, size: { w: 0, h: 600 } };
      expect(reparentNode(page, "c", "root", { from: turnedA, to: flat })).toBe(page);
      expect(
        reparentNode(page, "c", "root", {
          from: { ...turnedA, size: { w: 200, h: 0 } },
          to: upright,
        }),
      ).toBe(page);
    });

    it("is the same as sizes and a shift when no frame is turned", () => {
      const viaFrames = reparentNode(page, "c", "root", {
        from: { size: { w: 200, h: 100 }, center: { x: 100, y: 50 }, rotation: 0 },
        to: { size: { w: 800, h: 600 }, center: { x: 400 - 100, y: 300 - 50 }, rotation: 0 },
      });
      const viaShift = reparentNode(page, "c", "root", {
        from: { w: 200, h: 100 },
        to: { w: 800, h: 600 },
        shift: { x: -100, y: -50 },
      });
      expect(viaFrames).toEqual(viaShift);
    });
  });
});
