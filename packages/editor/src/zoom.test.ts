import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fitZoom, MAX_ZOOM, MIN_ZOOM, stageWidth, stepZoom, ZOOM_STEPS, zoomText } from "./zoom";

describe("stepZoom", () => {
  it("goes to the next step and stops at the ends", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(stepZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });
  it("from any zoom lands on a listed step, or stays where it is at the end", () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 3, noNaN: true }), fc.constantFrom(1, -1), (z, d) => {
        const next = stepZoom(z, d as 1 | -1);
        return (ZOOM_STEPS as readonly number[]).includes(next) || next === z;
      }),
    );
  });
  it("moves the right way from a zoom between two steps", () => {
    expect(stepZoom(0.6, 1)).toBe(0.75);
    expect(stepZoom(0.6, -1)).toBe(0.5);
  });
});

describe("fitZoom", () => {
  it("fits the tighter of the width and the height, within the range", () => {
    expect(fitZoom(1000, 1000, 500, 1000)).toBe(0.5);
    expect(fitZoom(500, 1000, 5000, 1000)).toBe(0.5);
    expect(fitZoom(100, 1000, 100, 1000)).toBe(MIN_ZOOM);
    expect(fitZoom(9000, 100, 9000, 100)).toBe(MAX_ZOOM);
  });
  it("is 1 when there is nothing to measure", () => {
    expect(fitZoom(0, 1000, 500, 500)).toBe(1);
    expect(fitZoom(500, Number.NaN, 500, 500)).toBe(1);
    expect(fitZoom(500, 500, 500, 0)).toBe(1);
  });
});

describe("stageWidth", () => {
  it("never goes under the page and fills the room when zoomed out", () => {
    expect(stageWidth(1000, 800, 0.5)).toBe(2000);
    expect(stageWidth(1000, 800, 2)).toBe(800);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 4000 }),
        (room, page) => ZOOM_STEPS.every((z) => stageWidth(room, page, z) >= page),
      ),
    );
  });
});

describe("zoomText", () => {
  it("writes a percentage", () => {
    expect(zoomText(0.75)).toBe("75%");
    expect(zoomText(1)).toBe("100%");
  });
});
