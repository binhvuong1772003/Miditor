import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, freeNode, num, solidContainer } from "../position/arbitraries";
import { inferBox } from "../position/infer-box";
import { moveRect } from "../position/move-rect";
import { resolveRect } from "../position/resolve-rect";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const flow: FlowNode = {
  id: "page",
  type: "Container",
  props: {},
  position: { mode: "flow" },
  children: [],
};

const sample: FreeNode = {
  id: "hero",
  type: "Image",
  props: { src: "/hero.png" },
  position: { mode: "free", x: { anchor: "end", offset: 20 }, y: { anchor: "start", offset: 40 } },
  size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
  rotation: 0,
  children: [flow],
};

describe("isFreeNode", () => {
  it("tells the two kinds of node apart and narrows the type", () => {
    const nodes: TreeNode[] = [flow, sample];
    expect(nodes.map(isFreeNode)).toEqual([false, true]);
    for (const n of nodes) if (isFreeNode(n)) expect(freeBoxOf(n).rotation).toBe(0);
  });
});

describe("freeBoxOf", () => {
  it("gathers the placement of a free node", () => {
    expect(freeBoxOf(sample)).toEqual({
      x: { anchor: "end", offset: 20 },
      y: { anchor: "start", offset: 40 },
      w: { kind: "px", v: 160 },
      h: { kind: "px", v: 96 },
      rotation: 0,
    });
  });
});

describe("withFreeBox", () => {
  const next = withFreeBox(sample, {
    x: { anchor: "end", offset: 120 },
    y: { anchor: "start", offset: 100 },
    w: { kind: "px", v: 200 },
    h: { kind: "percent", v: 10 },
    rotation: 30,
  });

  it("writes the position, the size and the rotation", () => {
    expect(next.position).toEqual({
      mode: "free",
      x: { anchor: "end", offset: 120 },
      y: { anchor: "start", offset: 100 },
    });
    expect(next.size).toEqual({ w: { kind: "px", v: 200 }, h: { kind: "percent", v: 10 } });
    expect(next.rotation).toBe(30);
  });

  it("returns a new node and keeps the other parts as they were", () => {
    expect(next).not.toBe(sample);
    expect(next.id).toBe("hero");
    expect(next.type).toBe("Image");
    expect(next.props).toBe(sample.props);
    expect(next.children).toBe(sample.children);
  });

  it("does not modify the node it was given", () => {
    expect(sample.position).toEqual({
      mode: "free",
      x: { anchor: "end", offset: 20 },
      y: { anchor: "start", offset: 40 },
    });
    expect(sample.rotation).toBe(0);
  });

  it("accepts a deeply frozen node", () => {
    const deepFreeze = <T extends object>(o: T): T => {
      for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
      return Object.freeze(o);
    };
    expect(() => withFreeBox(deepFreeze(structuredClone(sample)), freeBoxOf(sample))).not.toThrow();
  });
});

describe("freeBoxOf and withFreeBox, properties", () => {
  it("writing back what was read changes nothing", () => {
    fc.assert(
      fc.property(freeNode, (n) => {
        expect(withFreeBox(n, freeBoxOf(n))).toEqual(n);
      }),
      { numRuns: 1000 },
    );
  });

  it("reading what was written gives the same placement", () => {
    fc.assert(
      fc.property(freeNode, box, (n, b) => {
        expect(freeBoxOf(withFreeBox(n, b))).toEqual(b);
      }),
      { numRuns: 1000 },
    );
  });

  it("only the placement changes", () => {
    fc.assert(
      fc.property(freeNode, box, (n, b) => {
        const out = withFreeBox(n, b);
        return (
          out.id === n.id &&
          out.type === n.type &&
          out.props === n.props &&
          out.children === n.children
        );
      }),
    );
  });
});

describe("the pieces working together on a stored node", () => {
  it("a drag stored on the node resolves to where the pointer left it", () => {
    fc.assert(
      fc.property(
        freeNode,
        solidContainer,
        num(-200, 200),
        num(-200, 200),
        (n, container, dx, dy) => {
          const before = freeBoxOf(n);
          const start = resolveRect(before, container);
          const target = moveRect(start, { x: dx, y: dy }, 0);
          const saved = withFreeBox(n, inferBox(before, target, container));
          const shown = resolveRect(freeBoxOf(saved), container);
          // Rounding to 0.01px and 0.001% leaves at most a hair of difference.
          return (
            Math.abs(shown.x - target.x) < 0.02 &&
            Math.abs(shown.y - target.y) < 0.02 &&
            Math.abs(shown.w - target.w) < 0.02 &&
            Math.abs(shown.h - target.h) < 0.02
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});
