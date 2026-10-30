// @vitest-environment node
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { boxBetween, type Edges, touched } from "./marquee";

const rect = (left: number, top: number, right: number, bottom: number): Edges => ({
  left,
  top,
  right,
  bottom,
});

describe("boxBetween", () => {
  it("is the same box whichever corner the drag began at", () => {
    const a = { x: 10, y: 80 };
    const b = { x: 40, y: 20 };
    expect(boxBetween(a, b)).toEqual(rect(10, 20, 40, 80));
    expect(boxBetween(b, a)).toEqual(rect(10, 20, 40, 80));
  });

  it("has edges in order for any two corners", () => {
    const point = fc.record({
      x: fc.integer({ min: -500, max: 500 }),
      y: fc.integer({ min: -500, max: 500 }),
    });
    fc.assert(
      fc.property(point, point, (a, b) => {
        const box = boxBetween(a, b);
        expect(box.left).toBeLessThanOrEqual(box.right);
        expect(box.top).toBeLessThanOrEqual(box.bottom);
        expect(boxBetween(b, a)).toEqual(box);
      }),
    );
  });
});

describe("touched", () => {
  const box = rect(100, 100, 200, 200);
  const items = [
    { id: "inside", rect: rect(120, 120, 140, 140) },
    { id: "around", rect: rect(0, 0, 500, 500) },
    { id: "left-edge", rect: rect(50, 150, 120, 160) },
    { id: "right-edge", rect: rect(190, 150, 300, 160) },
    { id: "above", rect: rect(150, 50, 160, 110) },
    { id: "below", rect: rect(150, 190, 160, 400) },
    { id: "far", rect: rect(300, 300, 400, 400) },
    { id: "meets-left", rect: rect(50, 150, 100, 160) },
    { id: "meets-right", rect: rect(200, 150, 250, 160) },
    { id: "meets-top", rect: rect(150, 50, 160, 100) },
    { id: "meets-bottom", rect: rect(150, 200, 160, 250) },
    { id: "flat", rect: rect(150, 150, 150, 180) },
    { id: "flat-wide", rect: rect(150, 150, 180, 150) },
  ];

  it("picks the items that share area with the box, in the order given", () => {
    expect(touched(box, items)).toEqual([
      "inside",
      "around",
      "left-edge",
      "right-edge",
      "above",
      "below",
    ]);
  });

  it("picks nothing from no items or from a flat box", () => {
    expect(touched(box, [])).toEqual([]);
    expect(touched(rect(150, 100, 150, 200), items)).toEqual([]);
    expect(touched(rect(100, 150, 200, 150), items)).toEqual([]);
  });
});
