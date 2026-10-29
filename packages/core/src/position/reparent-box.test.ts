import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, num, solidContainer } from "./arbitraries";
import { reparentBox } from "./reparent-box";
import { resolveRect } from "./resolve-rect";
import type { FreeBox } from "./types";

const at = (over: Partial<FreeBox>): FreeBox => ({
  x: { anchor: "start", offset: 10 },
  y: { anchor: "start", offset: 20 },
  w: { kind: "px", v: 100 },
  h: { kind: "px", v: 50 },
  rotation: 25,
  ...over,
});
const none = { x: 0, y: 0 };

describe("reparentBox, the numbers each anchor stores", () => {
  it("start counts from the new parent's start edge", () => {
    const out = reparentBox(at({}), { w: 400, h: 300 }, { w: 200, h: 100 }, { x: 50, y: 5 });
    expect(out.x).toEqual({ anchor: "start", offset: -40 });
    expect(out.y).toEqual({ anchor: "start", offset: 15 });
  });

  it("end counts from the new parent's end edge", () => {
    const out = reparentBox(
      at({ x: { anchor: "end", offset: 10 } }),
      { w: 400, h: 300 },
      { w: 500, h: 300 },
      { x: 50, y: 0 },
    );
    // The rect started at 290 and 100 wide; in the new parent it starts at 240 and ends at 340.
    expect(out.x).toEqual({ anchor: "end", offset: 160 });
  });

  it("scale stores percentages of the new parent", () => {
    const out = reparentBox(
      at({ x: { anchor: "scale", start: 25, size: 50 } }),
      { w: 400, h: 300 },
      { w: 1000, h: 300 },
      { x: 100, y: 0 },
    );
    // The rect started at 100 and 200 wide; in the new parent it starts at 0.
    expect(out.x).toEqual({ anchor: "scale", start: 0, size: 20 });
  });
});

describe("reparentBox, what stays", () => {
  it("is the same placement for the same parent and no shift", () => {
    const b = at({ x: { anchor: "center", offset: 7 }, w: { kind: "percent", v: 20 } });
    const c = { w: 400, h: 300 };
    expect(resolveRect(reparentBox(b, c, c, none), c)).toEqual(resolveRect(b, c));
  });

  it("keeps the anchor types, the size kinds and the rotation", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        num(-300, 300),
        num(-300, 300),
        (b, from, to, x, y) => {
          const out = reparentBox(b, from, to, { x, y });
          expect(out.x.anchor).toBe(b.x.anchor);
          expect(out.y.anchor).toBe(b.y.anchor);
          expect(out.w.kind).toBe(b.w.kind);
          expect(out.h.kind).toBe(b.h.kind);
          expect(out.rotation).toBe(b.rotation);
        },
      ),
    );
  });

  it("puts the node where it was on the page, for any box, parents and shift", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        num(-300, 300),
        num(-300, 300),
        (b, from, to, x, y) => {
          const before = resolveRect(b, from);
          const after = resolveRect(reparentBox(b, from, to, { x, y }), to);
          // The new parent's corner is at (x, y), so a rect there is shifted back by it.
          // `inferBox` stores 0.01 px and 0.001 %, so the rect moves by a hair at most.
          expect(Math.abs(after.x + x - before.x)).toBeLessThan(0.05);
          expect(Math.abs(after.y + y - before.y)).toBeLessThan(0.05);
          expect(Math.abs(after.w - before.w)).toBeLessThan(0.05);
          expect(Math.abs(after.h - before.h)).toBeLessThan(0.05);
        },
      ),
    );
  });

  it("moving there and back gives the same place", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        num(-300, 300),
        num(-300, 300),
        (b, from, to, x, y) => {
          const there = reparentBox(b, from, to, { x, y });
          const back = reparentBox(there, to, from, { x: -x, y: -y });
          const before = resolveRect(b, from);
          const after = resolveRect(back, from);
          for (const key of ["x", "y", "w", "h"] as const) {
            expect(Math.abs(after[key] - before[key])).toBeLessThan(0.1);
          }
        },
      ),
    );
  });
});
