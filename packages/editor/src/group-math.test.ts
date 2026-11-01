import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { boundsOf, centreOf, cornersOf, rectAt, turnAround, turnGroup } from "./group-math";

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const box = (x: number, y: number, w = 100, h = 50) => ({ x, y, w, h });

describe("turnAround", () => {
  it("turns clockwise on the screen, like CSS rotate", () => {
    const p = turnAround({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(near(p.x, 0)).toBe(true);
    expect(near(p.y, 10)).toBe(true);
  });
  it("keeps the distance to the pivot and is undone by the opposite angle", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -500, max: 500 }),
        fc.integer({ min: -360, max: 360 }),
        (x, y, deg) => {
          const pivot = { x: 17, y: -5 };
          const there = turnAround({ x, y }, pivot, deg);
          const back = turnAround(there, pivot, -deg);
          const d0 = Math.hypot(x - pivot.x, y - pivot.y);
          const d1 = Math.hypot(there.x - pivot.x, there.y - pivot.y);
          return near(back.x, x, 1e-6) && near(back.y, y, 1e-6) && near(d0, d1, 1e-6);
        },
      ),
    );
  });
});

describe("boundsOf", () => {
  it("is the union of upright boxes, and undefined for none", () => {
    expect(boundsOf([])).toBeUndefined();
    expect(
      boundsOf([
        { rect: box(0, 0), rotation: 0 },
        { rect: box(200, 100), rotation: 0 },
      ]),
    ).toEqual({
      x: 0,
      y: 0,
      w: 300,
      h: 150,
    });
  });
  it("is bigger around a block that is turned a quarter", () => {
    const b = boundsOf([{ rect: box(0, 0, 100, 20), rotation: 90 }]);
    expect(near(b?.w ?? 0, 20)).toBe(true);
    expect(near(b?.h ?? 0, 100)).toBe(true);
  });
  it("contains every corner of every block", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            x: fc.integer({ min: 0, max: 500 }),
            y: fc.integer({ min: 0, max: 500 }),
            deg: fc.integer({ min: -180, max: 180 }),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        (items) => {
          const blocks = items.map((i) => ({ rect: box(i.x, i.y), rotation: i.deg }));
          const b = boundsOf(blocks);
          if (!b) return false;
          return blocks
            .flatMap(cornersOf)
            .every(
              (p) =>
                p.x >= b.x - 1e-6 &&
                p.x <= b.x + b.w + 1e-6 &&
                p.y >= b.y - 1e-6 &&
                p.y <= b.y + b.h + 1e-6,
            );
        },
      ),
    );
  });
});

describe("turnGroup", () => {
  const blocks = [
    { rect: box(0, 0), rotation: 0 },
    { rect: box(200, 100), rotation: 30 },
  ];
  const pivot = centreOf(boundsOf(blocks) ?? box(0, 0));

  it("turns every block by the same angle and keeps the sizes", () => {
    const turned = turnGroup(blocks, pivot, 45);
    expect(turned.map((t) => t.rotation)).toEqual([45, 75]);
    const back = turned.map((t, i) => rectAt(blocks[i]?.rect ?? box(0, 0), t.centre));
    expect(back.every((r) => r.w === 100 && r.h === 50)).toBe(true);
  });

  it("keeps the distance between the middles of two blocks", () => {
    fc.assert(
      fc.property(fc.integer({ min: -360, max: 360 }), (deg) => {
        const t = turnGroup(blocks, pivot, deg);
        const a = centreOf(blocks[0]?.rect ?? box(0, 0));
        const b = centreOf(blocks[1]?.rect ?? box(0, 0));
        const [t0, t1] = t;
        if (!t0 || !t1) return false;
        return near(
          Math.hypot(a.x - b.x, a.y - b.y),
          Math.hypot(t0.centre.x - t1.centre.x, t0.centre.y - t1.centre.y),
          1e-6,
        );
      }),
    );
  });

  it("is the identity for no turn, and turning there and back restores the middles", () => {
    const same = turnGroup(blocks, pivot, 0);
    expect(same.every((t, i) => near(t.centre.x, centreOf(blocks[i]?.rect ?? box(0, 0)).x))).toBe(
      true,
    );
    const there = turnGroup(blocks, pivot, 70);
    const again = turnGroup(
      there.map((t, i) => ({
        rect: rectAt(blocks[i]?.rect ?? box(0, 0), t.centre),
        rotation: t.rotation,
      })),
      pivot,
      -70,
    );
    expect(
      again.every((t, i) => near(t.centre.x, centreOf(blocks[i]?.rect ?? box(0, 0)).x, 1e-6)),
    ).toBe(true);
  });

  it("a block turned alone around its own middle only changes its rotation", () => {
    const solo = [{ rect: box(40, 40), rotation: 10 }];
    const [t] = turnGroup(solo, centreOf(box(40, 40)), 25);
    expect(near(t?.centre.x ?? 0, centreOf(box(40, 40)).x)).toBe(true);
    expect(t?.rotation).toBe(35);
  });
});
