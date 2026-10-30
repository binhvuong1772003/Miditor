import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type AlignTo, alignRects, distributeRects } from "./align";
import { num } from "./arbitraries";
import type { Rect } from "./types";

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const rects = [r(10, 20, 30, 40), r(100, 5, 50, 10), r(60, 90, 20, 20)];
// Together they span x 10..150, y 5..110.
const rect = fc.record({ x: num(-500, 500), y: num(-500, 500), w: num(0, 300), h: num(0, 300) });
const MODES: AlignTo[] = ["left", "center", "right", "top", "middle", "bottom"];

describe("alignRects", () => {
  it.each([
    ["left", [r(10, 20, 30, 40), r(10, 5, 50, 10), r(10, 90, 20, 20)]],
    ["center", [r(65, 20, 30, 40), r(55, 5, 50, 10), r(70, 90, 20, 20)]],
    ["right", [r(120, 20, 30, 40), r(100, 5, 50, 10), r(130, 90, 20, 20)]],
    ["top", [r(10, 5, 30, 40), r(100, 5, 50, 10), r(60, 5, 20, 20)]],
    ["middle", [r(10, 37.5, 30, 40), r(100, 52.5, 50, 10), r(60, 47.5, 20, 20)]],
    ["bottom", [r(10, 70, 30, 40), r(100, 100, 50, 10), r(60, 90, 20, 20)]],
  ] as const)("%s lines the rects up on the box around them", (to, expected) => {
    expect(alignRects(rects, to)).toEqual(expected);
  });

  it("lines up against the given bounds, a parent for example", () => {
    const bounds = r(0, 0, 400, 300);
    expect(alignRects([r(10, 20, 100, 50)], "center", bounds)).toEqual([r(150, 20, 100, 50)]);
    expect(alignRects([r(10, 20, 100, 50)], "bottom", bounds)).toEqual([r(10, 250, 100, 50)]);
    expect(alignRects([r(10, 20, 100, 50)], "right", bounds)).toEqual([r(300, 20, 100, 50)]);
    expect(alignRects([r(10, 20, 100, 50)], "middle", bounds)).toEqual([r(10, 125, 100, 50)]);
  });

  it("gives nothing for nothing and leaves rects alone for an unknown mode", () => {
    expect(alignRects([], "left")).toEqual([]);
    expect(alignRects(rects, "diagonal" as AlignTo)).toEqual(rects);
    expect(alignRects(rects, "diagonal" as AlignTo)[0]).not.toBe(rects[0]);
  });

  it("never changes a size or the other axis, and lines the edges up", () => {
    fc.assert(
      fc.property(
        fc.array(rect, { minLength: 1, maxLength: 6 }),
        fc.constantFrom(...MODES),
        (input, to) => {
          const out = alignRects(input, to);
          expect(out).toHaveLength(input.length);
          input.forEach((from, i) => {
            const got = out[i] as Rect;
            expect([got.w, got.h]).toEqual([from.w, from.h]);
            if (to === "left" || to === "center" || to === "right") expect(got.y).toBe(from.y);
            else expect(got.x).toBe(from.x);
          });
          const edge = (q: Rect) =>
            ({
              left: q.x,
              right: q.x + q.w,
              center: q.x + q.w / 2,
              top: q.y,
              bottom: q.y + q.h,
              middle: q.y + q.h / 2,
            })[to];
          for (const q of out) expect(edge(q)).toBeCloseTo(edge(out[0] as Rect), 6);
          alignRects(out, to).forEach((again, i) => {
            expect(again.x).toBeCloseTo((out[i] as Rect).x, 6);
            expect(again.y).toBeCloseTo((out[i] as Rect).y, 6);
          });
        },
      ),
    );
  });
});

describe("distributeRects", () => {
  it("spreads three rects with equal gaps and keeps the ends", () => {
    const out = distributeRects([r(0, 0, 10, 10), r(15, 0, 10, 10), r(100, 0, 20, 10)], "x");
    // Span 0..120, sizes 40, so two gaps of 40.
    expect(out).toEqual([r(0, 0, 10, 10), r(50, 0, 10, 10), r(100, 0, 20, 10)]);
  });

  it("works down, and keeps the order of the list when it is not the order on the page", () => {
    const out = distributeRects([r(0, 200, 5, 10), r(0, 0, 5, 10), r(0, 20, 5, 10)], "y");
    expect(out).toEqual([r(0, 200, 5, 10), r(0, 0, 5, 10), r(0, 100, 5, 10)]);
  });

  it("returns the rects as they are for fewer than three", () => {
    expect(distributeRects([], "x")).toEqual([]);
    expect(distributeRects([r(1, 2, 3, 4), r(9, 8, 7, 6)], "y")).toEqual([
      r(1, 2, 3, 4),
      r(9, 8, 7, 6),
    ]);
  });

  it("keeps the two ends, the sizes and the other axis, and makes the gaps equal", () => {
    fc.assert(
      fc.property(
        fc.array(rect, { minLength: 3, maxLength: 7 }),
        fc.constantFrom("x", "y" as const),
        (input, axis) => {
          const size = axis === "x" ? "w" : "h";
          const other = axis === "x" ? "y" : "x";
          const out = distributeRects(input, axis);
          const idx = input
            .map((_, i) => i)
            .sort((a, b) => (input[a] as Rect)[axis] - (input[b] as Rect)[axis]);
          const lo = idx[0] as number;
          const hi = idx[idx.length - 1] as number;
          expect((out[lo] as Rect)[axis]).toBe((input[lo] as Rect)[axis]);
          expect((out[hi] as Rect)[axis]).toBe((input[hi] as Rect)[axis]);
          input.forEach((from, i) => {
            expect((out[i] as Rect)[size]).toBe(from[size]);
            expect((out[i] as Rect)[other]).toBe(from[other]);
          });
          const gaps = idx.slice(1).map((cur, k) => {
            const prev = out[idx[k] as number] as Rect;
            return (out[cur] as Rect)[axis] - (prev[axis] + prev[size]);
          });
          for (const g of gaps) expect(g).toBeCloseTo(gaps[0] as number, 6);
        },
      ),
    );
  });
});
