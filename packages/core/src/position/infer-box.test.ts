import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, container, num, rect, solidContainer } from "./arbitraries";
import { inferBox } from "./infer-box";
import { resolveRect } from "./resolve-rect";
import type { Axis, Container, FreeBox, Size } from "./types";

const at = (x: Axis, w: Size = { kind: "px", v: 100 }): FreeBox => ({
  x,
  y: { anchor: "start", offset: 0 },
  w,
  h: { kind: "px", v: 50 },
  rotation: 0,
});

const dragged = { x: 0, y: 0, w: 100, h: 50 };
const wide: Container = { w: 800, h: 400 };

describe("inferBox, each anchor keeps its type and stores its own numbers", () => {
  it("start stores the distance from the start edge", () => {
    const out = inferBox(at({ anchor: "start", offset: 5 }), { ...dragged, x: 20 }, wide);
    expect(out.x).toEqual({ anchor: "start", offset: 20 });
  });

  it("end stores the distance from the end edge", () => {
    const prev = at({ anchor: "end", offset: 20 }, { kind: "px", v: 160 });
    // The sample block was 20px from the right edge of an 832px page; dragged 50px to the left.
    const out = inferBox(prev, { ...dragged, x: 602, w: 160 }, { w: 832, h: 600 });
    expect(out.x).toEqual({ anchor: "end", offset: 70 });
  });

  it("center stores the offset from the middle", () => {
    const out = inferBox(at({ anchor: "center", offset: 0 }), { ...dragged, x: 360 }, wide);
    expect(out.x).toEqual({ anchor: "center", offset: 10 });
  });

  it("stretch stores both distances and leaves the saved size alone", () => {
    const prev = at({ anchor: "stretch", start: 0, end: 0 }, { kind: "px", v: 999 });
    const out = inferBox(prev, { ...dragged, x: 30, w: 720 }, wide);
    expect(out.x).toEqual({ anchor: "stretch", start: 30, end: 50 });
    expect(out.w).toEqual({ kind: "px", v: 999 });
  });

  it("scale stores percentages and leaves the saved size alone", () => {
    const prev = at({ anchor: "scale", start: 0, size: 10 }, { kind: "px", v: 999 });
    const out = inferBox(prev, { ...dragged, x: 80, w: 200 }, wide);
    expect(out.x).toEqual({ anchor: "scale", start: 10, size: 25 });
    expect(out.w).toEqual({ kind: "px", v: 999 });
  });
});

describe("inferBox, sizes", () => {
  it("stores a px size rounded to 0.01", () => {
    const prev = at({ anchor: "start", offset: 0 });
    expect(inferBox(prev, { ...dragged, w: 100.004 }, wide).w).toEqual({ kind: "px", v: 100 });
    expect(inferBox(prev, { ...dragged, w: 100.006 }, wide).w).toEqual({ kind: "px", v: 100.01 });
  });

  it("stores a percent size as a share of the container, rounded to 0.001", () => {
    const prev = at({ anchor: "start", offset: 0 }, { kind: "percent", v: 5 });
    expect(inferBox(prev, { ...dragged, w: 200 }, wide).w).toEqual({ kind: "percent", v: 25 });
    expect(inferBox(prev, { ...dragged, w: 100 }, { w: 300, h: 400 }).w).toEqual({
      kind: "percent",
      v: 33.333,
    });
  });
});

describe("inferBox, the vertical axis and the rotation", () => {
  it("uses the container height for the vertical axis", () => {
    const prev: FreeBox = {
      ...at({ anchor: "start", offset: 0 }),
      y: { anchor: "end", offset: 5 },
    };
    const out = inferBox(prev, { x: 0, y: 230, w: 100, h: 50 }, { w: 800, h: 300 });
    expect(out.y).toEqual({ anchor: "end", offset: 20 });
  });

  it("copies the rotation from the previous box", () => {
    const out = inferBox({ ...at({ anchor: "start", offset: 0 }), rotation: 30 }, dragged, wide);
    expect(out.rotation).toBe(30);
  });
});

describe("inferBox, clean numbers", () => {
  it("never stores negative zero", () => {
    const prev = at({ anchor: "start", offset: 5 });
    expect(inferBox(prev, { ...dragged, x: -0.001 }, wide).x).toEqual({
      anchor: "start",
      offset: 0,
    });
    expect(
      Object.is(
        (inferBox(prev, { ...dragged, x: -0.001 }, wide).x as { offset: number }).offset,
        0,
      ),
    ).toBe(true);
  });
});

describe("inferBox, an empty container", () => {
  const empty: Container = { w: 0, h: 0 };

  it("keeps the saved values that would need a division", () => {
    const prev = at({ anchor: "scale", start: 10, size: 25 }, { kind: "percent", v: 20 });
    const out = inferBox(prev, { x: 5, y: 5, w: 50, h: 50 }, empty);
    expect(out.x).toEqual({ anchor: "scale", start: 10, size: 25 });
    const percentSize = inferBox(
      at({ anchor: "start", offset: 0 }, { kind: "percent", v: 20 }),
      { x: 5, y: 5, w: 50, h: 50 },
      empty,
    );
    expect(percentSize.w).toEqual({ kind: "percent", v: 20 });
  });

  it("still stores px distances and sizes", () => {
    const out = inferBox(at({ anchor: "end", offset: 0 }), { x: 5, y: 7, w: 50, h: 50 }, empty);
    expect(out.x).toEqual({ anchor: "end", offset: -55 });
    expect(out.w).toEqual({ kind: "px", v: 50 });
    expect(out.y).toEqual({ anchor: "start", offset: 7 });
  });
});

describe("inferBox, a container thinner than the rounding step", () => {
  it("is treated like an empty one", () => {
    const prev = at({ anchor: "scale", start: 10, size: 25 }, { kind: "percent", v: 20 });
    const out = inferBox(prev, { x: 5, y: 5, w: 50, h: 50 }, { w: 1e-300, h: 0.001 });
    expect(out.x).toEqual({ anchor: "scale", start: 10, size: 25 });
    expect(out.h).toEqual(prev.h);
  });
});

describe("inferBox, does not touch its input", () => {
  it("accepts a deeply frozen previous box", () => {
    const deepFreeze = <T extends object>(o: T): T => {
      for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
      return Object.freeze(o);
    };
    const prev = deepFreeze(at({ anchor: "stretch", start: 1, end: 2 }));
    expect(() => inferBox(prev, { x: 5, y: 7, w: 50, h: 50 }, wide)).not.toThrow();
  });
});

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/** Every number inside a plain object, for "is it all finite" checks. */
const numbersIn = (value: unknown): number[] =>
  typeof value === "number"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(numbersIn)
      : [];

const overConstrained = (a: Axis, size: number) => a.anchor === "stretch" && a.start + a.end > size;

const sameAxis = (a: Axis, b: Axis) => {
  if (a.anchor !== b.anchor) return false;
  const tol = a.anchor === "scale" ? 0.0011 : 0.011;
  const x = a as unknown as Record<string, number | string>;
  const y = b as unknown as Record<string, number | string>;
  return Object.keys(x).every((k) => k === "anchor" || near(x[k] as number, y[k] as number, tol));
};

const sameSize = (a: Size, b: Size) =>
  a.kind === b.kind && near(a.v, b.v, a.kind === "px" ? 0.011 : 0.0011);

describe("inferBox, round trips with resolveRect", () => {
  it("resolveRect(inferBox(prev, rect)) gives the dragged rect back, for every anchor", () => {
    fc.assert(
      fc.property(box, rect, solidContainer, (prev, r, c) => {
        const back = resolveRect(inferBox(prev, r, c), c);
        return (
          near(back.x, r.x, 0.02) &&
          near(back.y, r.y, 0.02) &&
          near(back.w, r.w, 0.02) &&
          near(back.h, r.h, 0.02)
        );
      }),
      { numRuns: 2000 },
    );
  });

  it("inferBox(resolveRect(box)) gives the same data back, within the rounding", () => {
    fc.assert(
      fc.property(box, solidContainer, (b, c) => {
        // An over-constrained stretch was squeezed to width 0, which forgets the original end offset.
        fc.pre(!overConstrained(b.x, c.w) && !overConstrained(b.y, c.h));
        const back = inferBox(b, resolveRect(b, c), c);
        return (
          sameAxis(b.x, back.x) &&
          sameAxis(b.y, back.y) &&
          sameSize(b.w, back.w) &&
          sameSize(b.h, back.h) &&
          back.rotation === b.rotation
        );
      }),
      { numRuns: 2000 },
    );
  });
});

describe("inferBox, properties", () => {
  it("never changes the anchor type or the size kind", () => {
    fc.assert(
      fc.property(box, rect, container, (prev, r, c) => {
        const out = inferBox(prev, r, c);
        return (
          out.x.anchor === prev.x.anchor &&
          out.y.anchor === prev.y.anchor &&
          out.w.kind === prev.w.kind &&
          out.h.kind === prev.h.kind
        );
      }),
      { numRuns: 1000 },
    );
  });

  it("gives the same result when applied twice", () => {
    fc.assert(
      fc.property(box, rect, container, (prev, r, c) => {
        const once = inferBox(prev, r, c);
        expect(inferBox(once, r, c)).toEqual(once);
      }),
    );
  });

  it("only stores finite numbers, and no negative sizes, even for an empty container", () => {
    fc.assert(
      fc.property(box, rect, container, (prev, r, c) => {
        const out = inferBox(prev, r, c);
        return numbersIn(out).every(Number.isFinite) && out.w.v >= 0 && out.h.v >= 0;
      }),
      { numRuns: 1000 },
    );
  });

  it("is not affected by the rotation of the previous box", () => {
    fc.assert(
      fc.property(box, rect, container, num(-180, 180), (prev, r, c, rotation) => {
        const a = inferBox({ ...prev, rotation }, r, c);
        const b = inferBox(prev, r, c);
        expect({ ...a, rotation: 0 }).toEqual({ ...b, rotation: 0 });
        expect(a.rotation).toBe(rotation);
      }),
    );
  });
});
