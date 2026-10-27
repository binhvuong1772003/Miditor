import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pixelLength, styles } from "../position/arbitraries";
import type { NodeStyles } from "../tree/types";
import { minSize } from "./min-size";
import { MAX_PIXEL_LENGTH } from "./pixel-length";

describe("minSize", () => {
  it("is 1px for a node without styles or without a border", () => {
    expect(minSize(undefined)).toBe(1);
    expect(minSize({})).toBe(1);
    expect(minSize({ background: "#ffffff", borderRadius: 40, borderColor: "#000000" })).toBe(1);
  });

  it("is twice the border width", () => {
    expect(minSize({ borderWidth: 10 })).toBe(20);
    expect(minSize({ borderWidth: 1 })).toBe(2);
    expect(minSize({ borderWidth: MAX_PIXEL_LENGTH })).toBe(2 * MAX_PIXEL_LENGTH);
  });

  it("never goes under 1px, even for a hairline border", () => {
    expect(minSize({ borderWidth: 0 })).toBe(1);
    expect(minSize({ borderWidth: 0.25 })).toBe(1);
    expect(minSize({ borderWidth: 0.5 })).toBe(1);
  });

  it("uses the border width as it is drawn, rounded to 0.01", () => {
    expect(minSize({ borderWidth: 1.234 })).toBe(2.46);
  });

  it("treats a width that is not valid as no border", () => {
    for (const borderWidth of [-5, 1001, Number.NaN, Number.POSITIVE_INFINITY, "5", null, {}]) {
      expect(minSize({ borderWidth } as unknown as NodeStyles)).toBe(1);
    }
  });
});

describe("minSize, properties", () => {
  it("is at least 1 and at least twice a valid border", () => {
    fc.assert(
      fc.property(styles, (s) => {
        const min = minSize(s);
        return min >= 1 && min >= 2 * (s.borderWidth ?? 0) - 0.02;
      }),
    );
  });

  it("is exactly max(1, 2 * width) for a width written with at most two decimals", () => {
    fc.assert(
      fc.property(
        pixelLength,
        (borderWidth) => minSize({ borderWidth }) === Math.max(1, 2 * borderWidth),
      ),
    );
  });
});
