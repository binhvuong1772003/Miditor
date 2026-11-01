import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { emptyPage, isPageData } from "../tree/page";
import { clampPageHeight, isPageHeight, MAX_PAGE_HEIGHT, MIN_PAGE_HEIGHT } from "./page-height";

describe("isPageHeight", () => {
  it("accepts a whole number inside the range and nothing else", () => {
    for (const ok of [MIN_PAGE_HEIGHT, 640, 1200, MAX_PAGE_HEIGHT])
      expect(isPageHeight(ok)).toBe(true);
    for (const bad of [199, 20001, 640.5, Number.NaN, "640", null, undefined, -1]) {
      expect(isPageHeight(bad)).toBe(false);
    }
  });
});

describe("clampPageHeight", () => {
  it("is always a valid page height, whatever is typed", () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
        fc.integer({ min: 0, max: 30000 }),
        (v, floor) => isPageHeight(clampPageHeight(v, floor)),
      ),
    );
  });
  it("never goes under the floor, nor over the tallest page", () => {
    expect(clampPageHeight(300, 500)).toBe(500);
    expect(clampPageHeight(50, 0)).toBe(MIN_PAGE_HEIGHT);
    expect(clampPageHeight(99999, 0)).toBe(MAX_PAGE_HEIGHT);
    expect(clampPageHeight(700, 30000)).toBe(MAX_PAGE_HEIGHT);
  });
  it("rounds to a whole px and gives nothing for a number that is not one", () => {
    expect(clampPageHeight(640.6)).toBe(641);
    expect(clampPageHeight(Number.NaN)).toBeUndefined();
    expect(clampPageHeight(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe("a page with a height", () => {
  it("is valid in range, and not when the height is out of range or not whole", () => {
    const page = emptyPage();
    const root = (minHeight: unknown) => ({
      ...page,
      root: { ...page.root, styles: { minHeight } },
    });
    expect(isPageData(root(1200))).toBe(true);
    for (const bad of [100, 30000, 640.5, "640"]) expect(isPageData(root(bad))).toBe(false);
  });
});
