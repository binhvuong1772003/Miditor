import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { num, rect } from "./arbitraries";
import { resizeRotated } from "./resize-rotated";
import type { Handle, Rect } from "./types";

const handle: fc.Arbitrary<Handle> = fc.tuple(
  fc.constantFrom(-1, 0, 1),
  fc.constantFrom(-1, 0, 1),
) as fc.Arbitrary<Handle>;

/** Where a point of the node, given from its centre in its own axes, is on the canvas. */
const onCanvas = (r: Rect, rotation: number, local: { x: number; y: number }) => {
  const a = (rotation * Math.PI) / 180;
  return {
    x: r.x + r.w / 2 + local.x * Math.cos(a) - local.y * Math.sin(a),
    y: r.y + r.h / 2 + local.x * Math.sin(a) + local.y * Math.cos(a),
  };
};

const start = { x: 100, y: 50, w: 200, h: 80 };

describe("resizeRotated", () => {
  it("keeps the top left corner when the bottom right handle is dragged on a straight node", () => {
    expect(resizeRotated(start, 0, [1, 1], 250, 100)).toEqual({ x: 100, y: 50, w: 250, h: 100 });
  });

  it("keeps the bottom right corner when the top left handle is dragged on a straight node", () => {
    expect(resizeRotated(start, 0, [-1, -1], 250, 100)).toEqual({ x: 50, y: 30, w: 250, h: 100 });
  });

  it("changes only the width for the right edge, and keeps the left edge and the top", () => {
    expect(resizeRotated(start, 0, [1, 0], 260, 80)).toEqual({ x: 100, y: 50, w: 260, h: 80 });
  });

  it("changes only the height for the top edge, and keeps the bottom edge", () => {
    expect(resizeRotated(start, 0, [0, -1], 200, 120)).toEqual({ x: 100, y: 10, w: 200, h: 120 });
  });

  it("keeps the corner opposite the handle in place on a node turned 90 degrees", () => {
    // Turned a quarter, the node's right edge points down the canvas, so its right handle moves down.
    const after = resizeRotated(start, 90, [1, 0], 300, 80);
    const before = onCanvas(start, 90, { x: -100, y: 0 });
    const fixed = onCanvas(after, 90, { x: -150, y: 0 });
    expect(fixed.x).toBeCloseTo(before.x, 9);
    expect(fixed.y).toBeCloseTo(before.y, 9);
    expect(after.w).toBe(300);
    expect(after.h).toBe(80);
  });

  it("does not move a node that keeps its size", () => {
    const same = resizeRotated(start, 37, [1, -1], start.w, start.h);
    expect(same.x).toBeCloseTo(start.x, 9);
    expect(same.y).toBeCloseTo(start.y, 9);
  });

  it("resizes around the centre when there is no handle side", () => {
    expect(resizeRotated(start, 25, [0, 0], 100, 40)).toMatchObject({ x: 150, y: 70 });
  });

  it("does not modify its input", () => {
    const input = Object.freeze({ ...start });
    expect(() => resizeRotated(input, 20, [1, 1], 10, 10)).not.toThrow();
  });
});

describe("resizeRotated, properties", () => {
  it("keeps the point opposite the handle where it is on the canvas, whatever the rotation", () => {
    fc.assert(
      fc.property(
        rect,
        num(-360, 360),
        handle,
        num(0, 500),
        num(0, 500),
        (r, rotation, [sx, sy], w, h) => {
          const after = resizeRotated(r, rotation, [sx, sy], w, h);
          const before = onCanvas(r, rotation, { x: (-sx * r.w) / 2, y: (-sy * r.h) / 2 });
          const now = onCanvas(after, rotation, { x: (-sx * w) / 2, y: (-sy * h) / 2 });
          return Math.abs(before.x - now.x) < 1e-6 && Math.abs(before.y - now.y) < 1e-6;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("returns exactly the size it is given", () => {
    fc.assert(
      fc.property(
        rect,
        num(-360, 360),
        handle,
        num(0, 500),
        num(0, 500),
        (r, rotation, h, w, ht) => {
          const after = resizeRotated(r, rotation, h, w, ht);
          return after.w === w && after.h === ht;
        },
      ),
    );
  });

  it("gives the same result for a full turn", () => {
    fc.assert(
      fc.property(
        rect,
        num(-180, 180),
        handle,
        num(0, 500),
        num(0, 500),
        (r, rotation, hd, w, h) => {
          const a = resizeRotated(r, rotation, hd, w, h);
          const b = resizeRotated(r, rotation + 360, hd, w, h);
          return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
        },
      ),
    );
  });

  it("moves the centre only along the node's own axis for an edge handle", () => {
    fc.assert(
      fc.property(rect, num(-360, 360), num(0, 500), (r, rotation, w) => {
        const after = resizeRotated(r, rotation, [1, 0], w, r.h);
        const a = (rotation * Math.PI) / 180;
        const dx = after.x + after.w / 2 - (r.x + r.w / 2);
        const dy = after.y + after.h / 2 - (r.y + r.h / 2);
        // The part of the move across the node's x axis (its own y direction) must be nothing.
        return Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < 1e-6;
      }),
    );
  });
});
