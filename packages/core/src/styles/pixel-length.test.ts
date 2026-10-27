import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isPixelLength, MAX_PIXEL_LENGTH, parsePixelLength } from "./pixel-length";

const spaces = fc.constantFrom("", " ", "  ", "\t", "\n", " \n ");

describe("isPixelLength", () => {
  it("accepts a finite number from 0 to the bound", () => {
    for (const ok of [0, 1, 4, 4.5, 0.01, 999.99, MAX_PIXEL_LENGTH]) {
      expect(isPixelLength(ok)).toBe(true);
    }
  });

  it("refuses numbers outside the range and numbers that are not finite", () => {
    for (const bad of [-1, -0.01, MAX_PIXEL_LENGTH + 0.01, 1e9, Number.NaN, Infinity, -Infinity]) {
      expect(isPixelLength(bad)).toBe(false);
    }
  });

  it("refuses everything that is not a number, including what JSON makes of NaN", () => {
    for (const bad of [null, undefined, "4", "4px", {}, [], [4], true, "", Number("x")]) {
      expect(isPixelLength(bad)).toBe(false);
    }
    expect(isPixelLength(JSON.parse(JSON.stringify(Number.NaN)))).toBe(false);
    expect(isPixelLength(JSON.parse(JSON.stringify(Infinity)))).toBe(false);
  });
});

describe("parsePixelLength", () => {
  it("reads a number with or without px", () => {
    expect(parsePixelLength("4")).toBe(4);
    expect(parsePixelLength("4px")).toBe(4);
    expect(parsePixelLength("4 px")).toBe(4);
    expect(parsePixelLength("4PX")).toBe(4);
    expect(parsePixelLength("  12  ")).toBe(12);
    expect(parsePixelLength("0")).toBe(0);
    expect(parsePixelLength("1000")).toBe(1000);
  });

  it("reads decimals and rounds them to 0.01", () => {
    expect(parsePixelLength("4.5")).toBe(4.5);
    expect(parsePixelLength(".5")).toBe(0.5);
    expect(parsePixelLength("0.004")).toBe(0);
    expect(parsePixelLength("0.006")).toBe(0.01);
    expect(parsePixelLength("1.005")).toBe(1);
    expect(parsePixelLength("999.999")).toBe(1000);
  });

  it("refuses what is not a length", () => {
    for (const bad of [
      "",
      " ",
      "px",
      "-1",
      "-0",
      "+4",
      "1e3",
      "1E3",
      "0x10",
      "4.",
      "4..5",
      "4,5",
      "4 5",
      "4%",
      "4em",
      "4rem",
      "4pt",
      "NaN",
      "Infinity",
      "-Infinity",
      "1001",
      "1000.01",
      "99999999999999999999",
      "calc(4px)",
      "var(--x)",
      "4px;color:red",
      "４",
      "٤",
    ]) {
      expect(parsePixelLength(bad)).toBeUndefined();
    }
  });
});

describe("pixel lengths, properties", () => {
  it("every whole number up to the bound reads back as itself, in every spelling", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_PIXEL_LENGTH }),
        fc.constantFrom("", "px", " px", "PX"),
        spaces,
        spaces,
        (n, unit, before, after) => parsePixelLength(`${before}${n}${unit}${after}`) === n,
      ),
      { numRuns: 1000 },
    );
  });

  it("a number above the bound is refused", () => {
    fc.assert(
      fc.property(fc.integer({ min: MAX_PIXEL_LENGTH + 1, max: 10 ** 9 }), (n) => {
        return parsePixelLength(String(n)) === undefined;
      }),
    );
  });

  it("for any text, the result is either nothing or a valid length", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (text) => {
        const out = parsePixelLength(text);
        return out === undefined || isPixelLength(out);
      }),
      { numRuns: 2000 },
    );
  });

  it("reading the written form of a result gives the same result", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: MAX_PIXEL_LENGTH, noNaN: true }), (n) => {
        const once = parsePixelLength(n.toFixed(3));
        return once === undefined || parsePixelLength(`${once}px`) === once;
      }),
      { numRuns: 1000 },
    );
  });

  it("negative numbers are never read", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: -1 }),
        (n) => parsePixelLength(String(n)) === undefined,
      ),
    );
  });
});
