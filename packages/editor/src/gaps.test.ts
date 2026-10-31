import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { gapsAround } from "./gaps";

const bounds = { x: 0, y: 0, w: 800, h: 600 };
const box = (x: number, y: number, w = 100, h = 50) => ({ x, y, w, h });
const by = (gaps: ReturnType<typeof gapsAround>, direction: string) =>
  gaps.find((g) => g.direction === direction);

describe("gapsAround", () => {
  it("measures to the edges of the parent when nothing is near", () => {
    const gaps = gapsAround(box(200, 100), [], bounds);
    expect(by(gaps, "left")?.distance).toBe(200);
    expect(by(gaps, "right")?.distance).toBe(800 - 300);
    expect(by(gaps, "up")?.distance).toBe(100);
    expect(by(gaps, "down")?.distance).toBe(600 - 150);
  });

  it("measures to a block that shares height, over the edge of the parent", () => {
    const gaps = gapsAround(box(300, 100), [box(100, 110)], bounds);
    expect(by(gaps, "left")?.distance).toBe(100); // 300 - (100 + 100)
    expect(by(gaps, "left")?.from.x).toBe(200);
  });

  it("ignores a block that is on the same side but shares no height", () => {
    const gaps = gapsAround(box(300, 100), [box(100, 400)], bounds);
    expect(by(gaps, "left")?.distance).toBe(300);
  });

  it("takes the nearest block when there are several", () => {
    const gaps = gapsAround(box(500, 100), [box(50, 100), box(250, 100)], bounds);
    expect(by(gaps, "left")?.distance).toBe(150); // 500 - (250 + 100)
  });

  it("leaves out a side that touches, or that the block spills over", () => {
    const touching = gapsAround(box(0, 100), [], bounds);
    expect(by(touching, "left")).toBeUndefined();
    const spilled = gapsAround(box(-20, 100), [], bounds);
    expect(by(spilled, "left")).toBeUndefined();
  });

  it("every gap is a whole number of px, at least 1, and its line is that long", () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 700 }),
          y: fc.integer({ min: 0, max: 550 }),
        }),
        fc.array(
          fc.record({
            x: fc.integer({ min: 0, max: 700 }),
            y: fc.integer({ min: 0, max: 550 }),
          }),
          { maxLength: 6 },
        ),
        (at, others) => {
          const gaps = gapsAround(
            box(at.x, at.y),
            others.map((o) => box(o.x, o.y)),
            bounds,
          );
          return gaps.every((g) => {
            const length = Math.abs(g.to.x - g.from.x) + Math.abs(g.to.y - g.from.y);
            return (
              Number.isInteger(g.distance) && g.distance >= 1 && Math.abs(length - g.distance) <= 1
            );
          });
        },
      ),
    );
  });
});
