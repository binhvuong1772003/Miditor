import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { num, rect } from "./arbitraries";
import { moveRect } from "./move-rect";

const start = { x: 250, y: 80, w: 120, h: 60 };

describe("moveRect", () => {
  it("adds the distance as it is when the node is not rotated", () => {
    expect(moveRect(start, { x: -60, y: 50 }, 0)).toEqual({ x: 190, y: 130, w: 120, h: 60 });
  });

  it("turns the distance back by the rotation of the node", () => {
    // Measured in TN4 at zoom 4: dragging a node turned 30 degrees by (-15, 12.5) canvas px
    // made react-moveable report this distance in the node's own axes.
    const moved = moveRect(start, { x: -6.7403811, y: 18.3253175 }, 30);
    expect(moved.x).toBeCloseTo(250 - 15, 5);
    expect(moved.y).toBeCloseTo(80 + 12.5, 5);
  });

  it("sends the x axis of a node turned 90 degrees to the y axis of the canvas", () => {
    const moved = moveRect(start, { x: 10, y: 0 }, 90);
    expect(moved.x).toBeCloseTo(250, 9);
    expect(moved.y).toBeCloseTo(90, 9);
  });

  it("does not touch the size", () => {
    expect(moveRect(start, { x: 7, y: 9 }, 45)).toMatchObject({ w: 120, h: 60 });
  });

  it("does not modify its input", () => {
    const input = Object.freeze({ ...start });
    expect(() => moveRect(input, { x: 1, y: 2 }, 33)).not.toThrow();
  });
});

describe("moveRect, properties", () => {
  it("moves the rect by the same length as the drag, whatever the rotation", () => {
    fc.assert(
      fc.property(rect, num(-300, 300), num(-300, 300), num(-360, 360), (r, x, y, rotation) => {
        const moved = moveRect(r, { x, y }, rotation);
        return Math.abs(Math.hypot(moved.x - r.x, moved.y - r.y) - Math.hypot(x, y)) < 1e-9;
      }),
      { numRuns: 1000 },
    );
  });

  it("gives the same result for a full turn", () => {
    fc.assert(
      fc.property(rect, num(-300, 300), num(-300, 300), num(-180, 180), (r, x, y, rotation) => {
        const a = moveRect(r, { x, y }, rotation);
        const b = moveRect(r, { x, y }, rotation + 360);
        return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
      }),
    );
  });

  it("is undone by a drag of the opposite distance", () => {
    fc.assert(
      fc.property(rect, num(-300, 300), num(-300, 300), num(-360, 360), (r, x, y, rotation) => {
        const back = moveRect(moveRect(r, { x, y }, rotation), { x: -x, y: -y }, rotation);
        return Math.abs(back.x - r.x) < 1e-9 && Math.abs(back.y - r.y) < 1e-9;
      }),
    );
  });
});
