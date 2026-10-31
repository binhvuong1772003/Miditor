import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isNudgeKey, nudgeRect } from "./nudge";

const rect = { x: 100, y: 50, w: 160, h: 44 };

describe("nudgeRect", () => {
  it("moves one px a press, ten with Shift, and never changes the size", () => {
    expect(nudgeRect(rect, "ArrowLeft", false)).toEqual({ ...rect, x: 99 });
    expect(nudgeRect(rect, "ArrowRight", false)).toEqual({ ...rect, x: 101 });
    expect(nudgeRect(rect, "ArrowUp", false)).toEqual({ ...rect, y: 49 });
    expect(nudgeRect(rect, "ArrowDown", true)).toEqual({ ...rect, y: 60 });
    expect(nudgeRect(rect, "ArrowRight", true)).toEqual({ ...rect, x: 110 });
  });
  it("leaves the rect alone for any other key", () => {
    for (const key of ["a", "Enter", "constructor", "__proto__", ""]) {
      expect(nudgeRect(rect, key, false)).toEqual(rect);
      expect(isNudgeKey(key)).toBe(false);
    }
  });
  it("opposite keys undo each other", () => {
    fc.assert(
      fc.property(fc.integer({ min: -500, max: 500 }), fc.boolean(), (x, far) => {
        const r = { ...rect, x };
        return nudgeRect(nudgeRect(r, "ArrowLeft", far), "ArrowRight", far).x === x;
      }),
    );
  });
});
