import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_PAGE_HEIGHT, MIN_PAGE_HEIGHT } from "../styles/page-height";
import { lowestPageHeight } from "./page-floor";
import type { FreeBox } from "./types";

const px = (v: number) => ({ kind: "px" as const, v });
const box = (y: FreeBox["y"], h: number): FreeBox => ({
  x: { anchor: "start", offset: 10 },
  y,
  w: px(100),
  h: px(h),
  rotation: 0,
});

describe("lowestPageHeight", () => {
  it("is the shortest page when there is nothing on it", () => {
    expect(lowestPageHeight([], 500)).toBe(MIN_PAGE_HEIGHT);
  });
  it("is the bottom of a box that hangs from the top", () => {
    expect(lowestPageHeight([box({ anchor: "start", offset: 500 }, 80)], 500)).toBe(580);
  });
  it("is the room a box that hangs from the bottom needs, not where it is now", () => {
    expect(lowestPageHeight([box({ anchor: "end", offset: 40 }, 64)], 500)).toBe(MIN_PAGE_HEIGHT);
    expect(lowestPageHeight([box({ anchor: "end", offset: 300 }, 100)], 500)).toBe(400);
  });
  it("counts the tallest need of several boxes", () => {
    const boxes = [
      box({ anchor: "start", offset: 100 }, 50),
      box({ anchor: "start", offset: 700 }, 60),
    ];
    expect(lowestPageHeight(boxes, 500)).toBe(760);
  });
  it("is the tallest page when no page holds the box", () => {
    expect(lowestPageHeight([box({ anchor: "start", offset: 30000 }, 80)], 500)).toBe(
      MAX_PAGE_HEIGHT,
    );
  });
  it("holds every box, and no shorter page does, for boxes hanging from the top", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ y: fc.integer({ min: 0, max: 5000 }), h: fc.integer({ min: 10, max: 300 }) }),
          {
            minLength: 1,
            maxLength: 6,
          },
        ),
        (items) => {
          const boxes = items.map((i) => box({ anchor: "start", offset: i.y }, i.h));
          const need = Math.max(...items.map((i) => i.y + i.h));
          return lowestPageHeight(boxes, 500) === Math.max(MIN_PAGE_HEIGHT, need);
        },
      ),
    );
  });
});
