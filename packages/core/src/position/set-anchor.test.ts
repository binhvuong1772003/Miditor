import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, solidContainer } from "./arbitraries";
import { resolveRect } from "./resolve-rect";
import { setAnchor } from "./set-anchor";
import type { AxisAnchor, FreeBox } from "./types";

const anchors: AxisAnchor[] = ["start", "end", "center", "stretch", "scale"];
const arbitraryAnchor = fc.constantFrom(...anchors);
const arbitraryAxis = fc.constantFrom("x" as const, "y" as const);

const start: FreeBox = {
  x: { anchor: "start", offset: 10 },
  y: { anchor: "start", offset: 20 },
  w: { kind: "px", v: 100 },
  h: { kind: "px", v: 50 },
  rotation: 30,
};
const container = { w: 400, h: 300 };

describe("setAnchor, the numbers each anchor stores", () => {
  it("end counts from the end edge", () => {
    expect(setAnchor(start, "x", "end", container).x).toEqual({ anchor: "end", offset: 290 });
  });

  it("center counts from the middle", () => {
    expect(setAnchor(start, "x", "center", container).x).toEqual({
      anchor: "center",
      offset: -140,
    });
  });

  it("stretch stores both distances and keeps the saved size", () => {
    const out = setAnchor(start, "x", "stretch", container);
    expect(out.x).toEqual({ anchor: "stretch", start: 10, end: 290 });
    expect(out.w).toEqual(start.w);
  });

  it("scale stores percentages of the container", () => {
    expect(setAnchor(start, "x", "scale", container).x).toEqual({
      anchor: "scale",
      start: 2.5,
      size: 25,
    });
  });

  it("going back from stretch takes the size from where the node is", () => {
    const stretched = setAnchor(start, "x", "stretch", container);
    const back = setAnchor({ ...stretched, w: { kind: "px", v: 7 } }, "x", "start", container);
    expect(back.x).toEqual({ anchor: "start", offset: 10 });
    expect(back.w).toEqual({ kind: "px", v: 100 });
  });
});

describe("setAnchor, what stays", () => {
  it("leaves the other axis, its size and the rotation as they were", () => {
    const out = setAnchor(start, "x", "end", container);
    expect(out.y).toBe(start.y);
    expect(out.h).toBe(start.h);
    expect(out.rotation).toBe(30);
    const outY = setAnchor(start, "y", "end", container);
    expect(outY.x).toBe(start.x);
    expect(outY.w).toBe(start.w);
  });

  it("returns the very same box for the same anchor and for an empty container", () => {
    expect(setAnchor(start, "x", "start", container)).toBe(start);
    expect(setAnchor(start, "x", "scale", { w: 0, h: 300 })).toBe(start);
    expect(setAnchor(start, "y", "end", { w: 400, h: 0 })).toBe(start);
    // The other axis may still be changed.
    expect(setAnchor(start, "y", "end", { w: 0, h: 300 })).not.toBe(start);
  });

  it("keeps the node where it is, for any box, axis, anchor and container", () => {
    fc.assert(
      fc.property(box, arbitraryAxis, arbitraryAnchor, solidContainer, (b, axis, anchor, c) => {
        const before = resolveRect(b, c);
        const after = resolveRect(setAnchor(b, axis, anchor, c), c);
        // inferBox stores 0.01 px and 0.001 %, so the rect moves by a hair at most.
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(after[key] - before[key])).toBeLessThan(0.05);
        }
      }),
    );
  });

  it("is the same box after going to an anchor and back, in position", () => {
    fc.assert(
      fc.property(box, arbitraryAxis, arbitraryAnchor, solidContainer, (b, axis, anchor, c) => {
        const there = setAnchor(b, axis, anchor, c);
        const back = setAnchor(there, axis, b[axis].anchor, c);
        const before = resolveRect(b, c);
        const after = resolveRect(back, c);
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(after[key] - before[key])).toBeLessThan(0.1);
        }
      }),
    );
  });
});
