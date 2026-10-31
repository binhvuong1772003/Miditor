import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, num, solidContainer } from "./arbitraries";
import { MAX_COORDINATE } from "./limits";
import { resolveRect } from "./resolve-rect";
import type { FreeBox } from "./types";
import { withRect } from "./with-rect";

const page = { w: 400, h: 300 };
const at = (over: Partial<FreeBox> = {}): FreeBox => ({
  x: { anchor: "start", offset: 10 },
  y: { anchor: "start", offset: 20 },
  w: { kind: "px", v: 100 },
  h: { kind: "px", v: 50 },
  rotation: 0,
  ...over,
});

describe("withRect, the anchors", () => {
  it("start counts from the start edge, and a new width keeps the left edge", () => {
    expect(withRect(at(), { x: 30 }, page).x).toEqual({ anchor: "start", offset: 30 });
    expect(withRect(at(), { y: 5, h: 80 }, page)).toMatchObject({
      y: { anchor: "start", offset: 5 },
      h: { kind: "px", v: 80 },
      x: { anchor: "start", offset: 10 },
      w: { kind: "px", v: 100 },
    });
    expect(withRect(at(), { w: 150 }, page).x).toEqual({ anchor: "start", offset: 10 });
  });

  it("end stays stuck to the end edge: the offset is the room that is left on that side", () => {
    const stuck = at({ x: { anchor: "end", offset: 10 } }); // the rect is at 290, 100 wide
    expect(withRect(stuck, { x: 250 }, page).x).toEqual({ anchor: "end", offset: 50 });
    // The left edge stays at 290, so a width of 60 leaves 50 on the right.
    expect(withRect(stuck, { w: 60 }, page).x).toEqual({ anchor: "end", offset: 50 });
  });

  it("center counts from the middle", () => {
    const middle = at({ x: { anchor: "center", offset: 0 } }); // the rect is at 150
    expect(withRect(middle, { x: 100 }, page).x).toEqual({ anchor: "center", offset: -50 });
  });

  it("stretch changes its margins, and its stored size is left as it was", () => {
    const stretched = at({ x: { anchor: "stretch", start: 20, end: 30 } }); // 20, 350 wide
    expect(withRect(stretched, { w: 200 }, page)).toMatchObject({
      x: { anchor: "stretch", start: 20, end: 180 },
      w: { kind: "px", v: 100 },
    });
    expect(withRect(stretched, { x: 50 }, page).x).toEqual({
      anchor: "stretch",
      start: 50,
      end: 0,
    });
  });

  it("scale changes its percentages of the parent", () => {
    const scaled = at({ x: { anchor: "scale", start: 10, size: 50 } }); // 40, 200 wide
    expect(withRect(scaled, { w: 100 }, page).x).toEqual({ anchor: "scale", start: 10, size: 25 });
    expect(withRect(scaled, { x: 100 }, page).x).toEqual({ anchor: "scale", start: 25, size: 50 });
  });

  it("a size in percent stays in percent", () => {
    const wide = at({ w: { kind: "percent", v: 25 } }); // 100 wide
    expect(withRect(wide, { w: 200 }, page).w).toEqual({ kind: "percent", v: 50 });
  });

  it("does not turn the block", () => {
    expect(withRect(at({ rotation: 33 }), { x: 5, w: 20 }, page).rotation).toBe(33);
  });
});

describe("withRect, what is left out and what is refused", () => {
  it("leaves out what the patch does not name", () => {
    const out = withRect(at(), { x: 40 }, page);
    expect(out.y).toEqual(at().y);
    expect(out.w).toEqual(at().w);
    expect(out.h).toEqual(at().h);
  });

  it("ignores a number that is not finite, or not a number", () => {
    const given = at();
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "5", null]) {
      expect(withRect(given, { x: bad as number, w: bad as number }, page)).toBe(given);
    }
    expect(withRect(given, { x: Number.NaN, y: 99 }, page).y).toEqual({
      anchor: "start",
      offset: 99,
    });
  });

  it("keeps the width and height at least the smallest size, 1 px unless told otherwise", () => {
    expect(withRect(at(), { w: 0.2 }, page).w).toEqual({ kind: "px", v: 1 });
    expect(withRect(at(), { h: -5 }, page).h).toEqual({ kind: "px", v: 1 });
    expect(withRect(at(), { w: 3 }, page, { minSize: 8 }).w).toEqual({ kind: "px", v: 8 });
    // A smallest size that is not above 0, or not a number, is the default one.
    for (const minSize of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(withRect(at(), { w: 0.2 }, page, { minSize }).w, String(minSize)).toEqual({
        kind: "px",
        v: 1,
      });
    }
  });

  it("keeps every number inside what a page may store", () => {
    const out = withRect(at(), { x: 1e12, y: -1e12, w: 1e12, h: 1e12 }, page);
    expect(out.x).toEqual({ anchor: "start", offset: MAX_COORDINATE });
    expect(out.y).toEqual({ anchor: "start", offset: -MAX_COORDINATE });
    expect(out.w).toEqual({ kind: "px", v: MAX_COORDINATE });
  });

  it("returns the very same box when nothing changes", () => {
    const given = at({ x: { anchor: "start", offset: 10.004 } });
    expect(withRect(given, {}, page)).toBe(given);
    expect(withRect(given, { x: 10 }, page)).toBe(given);
    expect(withRect(given, { x: 10.0001, w: 100.002 }, page)).toBe(given);
    expect(withRect(given, { x: 10.02 }, page)).not.toBe(given);
  });

  it("returns the same box when the parent is empty", () => {
    const given = at({ x: { anchor: "scale", start: 10, size: 50 } });
    expect(withRect(given, { w: 10 }, { w: 0, h: 300 })).toBe(given);
    expect(withRect(given, { w: 10 }, { w: 400, h: 0 })).toBe(given);
    expect(withRect(given, { w: 10 }, { w: 0.009, h: 300 })).toBe(given);
  });

  it("returns the same box when the result could not be stored", () => {
    // In a parent this thin a percentage of 500000 px is far beyond what may be stored.
    const given = at({ x: { anchor: "scale", start: 10, size: 50 } });
    expect(withRect(given, { x: 500000 }, { w: 0.01, h: 300 })).toBe(given);
  });
});

describe("withRect, keeping the proportions", () => {
  const lock = { lockRatio: true };

  it("changes the other side with the one that is changed", () => {
    expect(withRect(at(), { w: 200 }, page, lock)).toMatchObject({
      w: { kind: "px", v: 200 },
      h: { kind: "px", v: 100 },
    });
    expect(withRect(at(), { h: 25 }, page, lock)).toMatchObject({
      w: { kind: "px", v: 50 },
      h: { kind: "px", v: 25 },
    });
  });

  it("uses both numbers when both are given, and does nothing about it without the lock", () => {
    expect(withRect(at(), { w: 30, h: 30 }, page, lock)).toMatchObject({
      w: { kind: "px", v: 30 },
      h: { kind: "px", v: 30 },
    });
    expect(withRect(at(), { w: 200 }, page).h).toEqual({ kind: "px", v: 50 });
    expect(withRect(at(), { w: 200 }, page, { lockRatio: false }).h).toEqual({ kind: "px", v: 50 });
  });

  it("lets the proportions win at the smallest size: both grow until neither is too small", () => {
    // 100 x 50 at a width of 0.2 would be 0.2 x 0.1; scaled up so that the height is 1, it is 2 x 1.
    expect(withRect(at(), { w: 0.2 }, page, lock)).toMatchObject({
      w: { kind: "px", v: 2 },
      h: { kind: "px", v: 1 },
    });
    expect(withRect(at(), { w: 0.2 }, page, { lockRatio: true, minSize: 10 })).toMatchObject({
      w: { kind: "px", v: 20 },
      h: { kind: "px", v: 10 },
    });
  });

  it("has no proportions to keep for a side that is 0", () => {
    const flat = at({ h: { kind: "px", v: 0 } });
    expect(withRect(flat, { w: 200 }, page, lock)).toMatchObject({
      w: { kind: "px", v: 200 },
      h: { kind: "px", v: 0 },
    });
  });

  it("keeps the size inside what a page may store while keeping the proportions", () => {
    const out = withRect(at(), { w: 1e12 }, page, lock);
    expect(out.w).toEqual({ kind: "px", v: MAX_COORDINATE });
    expect(out.h).toEqual({ kind: "px", v: MAX_COORDINATE / 2 });
  });

  it("moves a block while changing it, since x and y still apply", () => {
    expect(withRect(at(), { x: 0, w: 200 }, page, lock)).toMatchObject({
      x: { anchor: "start", offset: 0 },
      h: { kind: "px", v: 100 },
    });
  });
});

describe("withRect, for any placement", () => {
  const maybe = (a: fc.Arbitrary<number>) => fc.option(a, { nil: undefined });
  const patch = fc.record(
    { x: num(-500, 2000), y: num(-500, 2000), w: num(1, 2000), h: num(1, 2000) },
    { requiredKeys: [] },
  );
  const near = (a: number, b: number) => Math.abs(a - b) <= 0.05;

  it("gives the rect that was asked for and leaves the rest as it was", () => {
    fc.assert(
      fc.property(box, solidContainer, patch, (b, c, p) => {
        const before = resolveRect(b, c);
        const after = resolveRect(withRect(b, p, c), c);
        expect(near(after.x, p.x ?? before.x)).toBe(true);
        expect(near(after.y, p.y ?? before.y)).toBe(true);
        expect(near(after.w, p.w ?? before.w)).toBe(true);
        expect(near(after.h, p.h ?? before.h)).toBe(true);
      }),
    );
  });

  it("does not turn the block and gives the same result when it is applied again", () => {
    fc.assert(
      fc.property(box, solidContainer, patch, (b, c, p) => {
        const once = withRect(b, p, c);
        const twice = withRect(once, p, c);
        expect(once.rotation).toBe(b.rotation);
        const a = resolveRect(once, c);
        const d = resolveRect(twice, c);
        expect(near(a.x, d.x) && near(a.y, d.y) && near(a.w, d.w) && near(a.h, d.h)).toBe(true);
      }),
    );
  });

  it("keeps the proportions when only one side is given", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        fc.boolean(),
        maybe(num(10, 800)),
        num(10, 800),
        (b, c, widthFirst, _unused, n) => {
          const before = resolveRect(b, c);
          fc.pre(before.w >= 10 && before.h >= 10);
          const out = resolveRect(
            withRect(b, widthFirst ? { w: n } : { h: n }, c, { lockRatio: true }),
            c,
          );
          // Each side is stored to 0.01 px, which a tall thin box magnifies by its ratio.
          const slack = 0.02 * (1 + before.h / before.w + before.w / before.h);
          expect(Math.abs(out.h - (out.w * before.h) / before.w) <= slack).toBe(true);
        },
      ),
    );
  });
});
