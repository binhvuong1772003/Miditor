import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { resolveRect } from "./resolve-rect";
import type { Axis, Container, FreeBox, Size } from "./types";

const num = (lo: number, hi: number) =>
  fc.double({ min: lo, max: hi, noNaN: true, noDefaultInfinity: true });

const container = fc.record({ w: num(0, 1600), h: num(0, 1200) });

const axis: fc.Arbitrary<Axis> = fc.oneof(
  num(-100, 200).map((offset): Axis => ({ anchor: "start", offset })),
  num(-100, 200).map((offset): Axis => ({ anchor: "end", offset })),
  num(-100, 100).map((offset): Axis => ({ anchor: "center", offset })),
  fc
    .tuple(num(0, 800), num(0, 800))
    .map(([start, end]): Axis => ({ anchor: "stretch", start, end })),
  fc
    .tuple(num(0, 40), num(10, 50))
    .map(([start, size]): Axis => ({ anchor: "scale", start, size })),
);

const size: fc.Arbitrary<Size> = fc.oneof(
  num(10, 200).map((v): Size => ({ kind: "px", v })),
  num(5, 40).map((v): Size => ({ kind: "percent", v })),
);

const box: fc.Arbitrary<FreeBox> = fc.record({
  x: axis,
  y: axis,
  w: size,
  h: size,
  rotation: num(-180, 180),
});

const base = (x: Axis, w: Size = { kind: "px", v: 100 }): FreeBox => ({
  x,
  y: { anchor: "start", offset: 0 },
  w,
  h: { kind: "px", v: 50 },
  rotation: 0,
});

const wide: Container = { w: 800, h: 400 };
const narrow: Container = { w: 400, h: 400 };

describe("resolveRect, each anchor against a different container width", () => {
  it("start keeps the offset from the start edge", () => {
    expect(resolveRect(base({ anchor: "start", offset: 20 }), wide).x).toBe(20);
    expect(resolveRect(base({ anchor: "start", offset: 20 }), narrow).x).toBe(20);
  });

  it("end keeps the offset from the end edge", () => {
    expect(resolveRect(base({ anchor: "end", offset: 20 }), wide).x).toBe(680);
    expect(resolveRect(base({ anchor: "end", offset: 20 }), narrow).x).toBe(280);
  });

  it("center keeps the offset from the middle", () => {
    expect(resolveRect(base({ anchor: "center", offset: 10 }), wide).x).toBe(360);
    expect(resolveRect(base({ anchor: "center", offset: 10 }), narrow).x).toBe(160);
  });

  it("stretch fills the container minus both offsets and ignores the size", () => {
    const b = base({ anchor: "stretch", start: 30, end: 50 }, { kind: "px", v: 999 });
    expect(resolveRect(b, wide)).toMatchObject({ x: 30, w: 720 });
    expect(resolveRect(b, narrow)).toMatchObject({ x: 30, w: 320 });
  });

  it("scale takes position and width as percentages and ignores the size", () => {
    const b = base({ anchor: "scale", start: 10, size: 25 }, { kind: "px", v: 999 });
    expect(resolveRect(b, wide)).toMatchObject({ x: 80, w: 200 });
    expect(resolveRect(b, narrow)).toMatchObject({ x: 40, w: 100 });
  });
});

describe("resolveRect, percent sizes", () => {
  const quarter: Size = { kind: "percent", v: 25 };

  it("takes a share of the container with start, end and center", () => {
    expect(resolveRect(base({ anchor: "start", offset: 20 }, quarter), wide)).toMatchObject({
      x: 20,
      w: 200,
    });
    expect(resolveRect(base({ anchor: "end", offset: 20 }, quarter), wide)).toMatchObject({
      x: 580,
      w: 200,
    });
    expect(resolveRect(base({ anchor: "center", offset: 0 }, quarter), wide)).toMatchObject({
      x: 300,
      w: 200,
    });
  });
});

describe("resolveRect, the vertical axis", () => {
  it("uses the container height, not the width", () => {
    const b: FreeBox = {
      x: { anchor: "start", offset: 0 },
      y: { anchor: "end", offset: 20 },
      w: { kind: "px", v: 100 },
      h: { kind: "percent", v: 50 },
      rotation: 0,
    };
    // Height 300: the node is 150 tall and ends 20px above the bottom edge.
    expect(resolveRect(b, { w: 800, h: 300 })).toMatchObject({ y: 130, h: 150 });
  });
});

describe("resolveRect, an over-constrained stretch", () => {
  it("collapses to zero like CSS and keeps the start offset", () => {
    // Measured in Chrome: left 300 + right 300 in a 400px container gives width 0 at x = 300.
    const b = base({ anchor: "stretch", start: 300, end: 300 });
    expect(resolveRect(b, { w: 400, h: 200 })).toMatchObject({ x: 300, w: 0 });
  });
});

describe("resolveRect, properties", () => {
  it("stretch always gives w = W - start - end when that is not negative", () => {
    fc.assert(
      fc.property(fc.tuple(num(0, 100), num(0, 100)), container, ([start, end], c) => {
        const r = resolveRect(base({ anchor: "stretch", start, end }), c);
        return r.x === start && Math.abs(r.w - Math.max(0, c.w - start - end)) < 1e-9;
      }),
    );
  });

  it("never returns a negative size", () => {
    fc.assert(
      fc.property(box, container, (b, c) => {
        const r = resolveRect(b, c);
        return r.w >= 0 && r.h >= 0;
      }),
      { numRuns: 1000 },
    );
  });

  it("ignores the rotation", () => {
    fc.assert(
      fc.property(box, container, num(-180, 180), (b, c, rotation) => {
        expect(resolveRect({ ...b, rotation }, c)).toEqual(resolveRect(b, c));
      }),
    );
  });

  it("scales position and size with the container when everything is a percentage", () => {
    const relative: fc.Arbitrary<FreeBox> = fc.record({
      x: fc
        .tuple(num(0, 40), num(10, 50))
        .map(([start, s]): Axis => ({ anchor: "scale", start, size: s })),
      y: fc
        .tuple(num(0, 40), num(10, 50))
        .map(([start, s]): Axis => ({ anchor: "scale", start, size: s })),
      w: size,
      h: size,
      rotation: fc.constant(0),
    });
    fc.assert(
      fc.property(relative, container, num(0.5, 4), (b, c, k) => {
        const a = resolveRect(b, c);
        const scaled = resolveRect(b, { w: c.w * k, h: c.h * k });
        const near = (p: number, q: number) =>
          Math.abs(p * k - q) <= 1e-6 * Math.max(1, Math.abs(q));
        return (
          near(a.x, scaled.x) && near(a.y, scaled.y) && near(a.w, scaled.w) && near(a.h, scaled.h)
        );
      }),
    );
  });
});
