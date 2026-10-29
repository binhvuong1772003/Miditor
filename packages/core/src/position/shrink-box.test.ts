import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, num, solidContainer } from "./arbitraries";
import { resolveRect } from "./resolve-rect";
import { shrinkBox } from "./shrink-box";
import type { FreeBox } from "./types";

const at = (over: Partial<FreeBox>): FreeBox => ({
  x: { anchor: "start", offset: 100 },
  y: { anchor: "start", offset: 40 },
  w: { kind: "px", v: 200 },
  h: { kind: "px", v: 80 },
  rotation: 25,
  ...over,
});

describe("shrinkBox, what each anchor stores", () => {
  it("multiplies the distances and sizes in px", () => {
    expect(shrinkBox(at({}), 0.5)).toEqual({
      x: { anchor: "start", offset: 50 },
      y: { anchor: "start", offset: 20 },
      w: { kind: "px", v: 100 },
      h: { kind: "px", v: 40 },
      rotation: 25,
    });
  });

  it("does the same for end, center and stretch", () => {
    const out = shrinkBox(
      at({
        x: { anchor: "end", offset: 20 },
        y: { anchor: "stretch", start: 10, end: 30 },
        h: { kind: "px", v: 7 },
      }),
      0.5,
    );
    expect(out.x).toEqual({ anchor: "end", offset: 10 });
    expect(out.y).toEqual({ anchor: "stretch", start: 5, end: 15 });
    expect(shrinkBox(at({ x: { anchor: "center", offset: -30 } }), 0.5).x).toEqual({
      anchor: "center",
      offset: -15,
    });
  });

  it("leaves scale axes and sizes in percent as they are", () => {
    const b = at({ x: { anchor: "scale", start: 10, size: 50 }, h: { kind: "percent", v: 20 } });
    const out = shrinkBox(b, 0.39);
    expect(out.x).toBe(b.x);
    expect(out.h).toBe(b.h);
  });

  it("rounds to 0.01 px", () => {
    expect(shrinkBox(at({ x: { anchor: "start", offset: 7 } }), 0.39).x).toEqual({
      anchor: "start",
      offset: 2.73,
    });
    expect(shrinkBox(at({ x: { anchor: "start", offset: 1 } }), 0.3333).x).toEqual({
      anchor: "start",
      offset: 0.33,
    });
  });
});

describe("shrinkBox, what stays", () => {
  it("gives back the very same box for a ratio of 1, and for one that cannot be used", () => {
    const b = at({});
    for (const ratio of [
      1,
      0,
      -2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(shrinkBox(b, ratio)).toBe(b);
    }
  });

  it("keeps the anchor types, the size kinds and the rotation", () => {
    fc.assert(
      fc.property(box, num(0.05, 3), (b, ratio) => {
        const out = shrinkBox(b, ratio);
        expect(out.x.anchor).toBe(b.x.anchor);
        expect(out.y.anchor).toBe(b.y.anchor);
        expect(out.w.kind).toBe(b.w.kind);
        expect(out.h.kind).toBe(b.h.kind);
        expect(out.rotation).toBe(b.rotation);
      }),
    );
  });

  it("in a container `ratio` times as big, shows each block `ratio` times as big in the same place", () => {
    fc.assert(
      fc.property(box, solidContainer, num(0.1, 2), (b, c, ratio) => {
        const before = resolveRect(b, c);
        const after = resolveRect(shrinkBox(b, ratio), { w: c.w * ratio, h: c.h * ratio });
        // The distances are stored to 0.01 px, so the rect is off by a hair at most.
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(after[key] - before[key] * ratio)).toBeLessThan(0.05);
        }
      }),
    );
  });

  it("is the same as shrinking in two steps, up to rounding", () => {
    fc.assert(
      fc.property(box, solidContainer, num(0.2, 1), num(0.2, 1), (b, c, r1, r2) => {
        const once = resolveRect(shrinkBox(b, r1 * r2), { w: c.w * r1 * r2, h: c.h * r1 * r2 });
        const twice = resolveRect(shrinkBox(shrinkBox(b, r1), r2), {
          w: c.w * r1 * r2,
          h: c.h * r1 * r2,
        });
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(once[key] - twice[key])).toBeLessThan(0.1);
        }
      }),
    );
  });
});
