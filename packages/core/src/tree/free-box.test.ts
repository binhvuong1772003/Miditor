import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, freeNode, num, solidContainer } from "../position/arbitraries";
import { inferBox } from "../position/infer-box";
import { moveRect } from "../position/move-rect";
import { resolveRect } from "../position/resolve-rect";
import { boxFor } from "./device";
import { freeBoxOf, isFreeNode, withFreeBox, withPhoneBox } from "./free-box";
import { emptyPage, isPageData } from "./page";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const flow: FlowNode = {
  id: "page",
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children: [],
};

const sample: FreeNode = {
  id: "hero",
  type: "Image",
  props: { src: "/hero.png" },
  styles: {},
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
    expect(next.styles).toBe(sample.styles);
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
          out.styles === n.styles &&
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

describe("withPhoneBox", () => {
  const node = withFreeBox(
    {
      id: "n",
      type: "Shape",
      props: { a: 1 },
      styles: {},
      position: {
        mode: "free",
        x: { anchor: "start", offset: 0 },
        y: { anchor: "start", offset: 0 },
      },
      size: { w: { kind: "px", v: 10 }, h: { kind: "px", v: 10 } },
      rotation: 0,
      children: [],
    },
    {
      x: { anchor: "start", offset: 100 },
      y: { anchor: "end", offset: 20 },
      w: { kind: "px", v: 200 },
      h: { kind: "px", v: 80 },
      rotation: 10,
    },
  );
  const byHand = {
    x: { anchor: "start", offset: 5 },
    y: { anchor: "start", offset: 6 },
    w: { kind: "px", v: 70 },
    h: { kind: "px", v: 30 },
    rotation: -20,
  } as const;

  it("sets the phone placement and shares everything else", () => {
    const out = withPhoneBox(node, byHand);
    expect(out.phone).toBe(byHand);
    expect(out.props).toBe(node.props);
    expect(out.children).toBe(node.children);
    expect(out.position).toBe(node.position);
    expect(node.phone).toBeUndefined();
  });

  it("changes what the phone shows and not what the desktop shows", () => {
    const out = withPhoneBox(node, byHand);
    expect(boxFor(out, "phone")).toBe(byHand);
    expect(boxFor(out, "desktop")).toEqual(boxFor(node, "desktop"));
  });

  it("with undefined takes the placement away, without leaving the key", () => {
    const out = withPhoneBox(withPhoneBox(node, byHand), undefined);
    expect("phone" in out).toBe(false);
    expect(out).toEqual(node);
    expect(boxFor(out, "phone")).toEqual(boxFor(node, "phone"));
  });

  it("returns the very same node when nothing would change", () => {
    const withIt = withPhoneBox(node, byHand);
    expect(withPhoneBox(withIt, byHand)).toBe(withIt);
    expect(withPhoneBox(node, undefined)).toBe(node);
  });

  it("makes a page that is still valid, also after JSON", () => {
    const page = emptyPage();
    const grown = { ...page, root: { ...page.root, children: [withPhoneBox(node, byHand)] } };
    expect(isPageData(grown)).toBe(true);
    expect(isPageData(JSON.parse(JSON.stringify(grown)))).toBe(true);
  });
});
