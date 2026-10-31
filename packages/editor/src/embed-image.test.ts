import { describe, expect, it, vi } from "vitest";
import { encodeWithin, fitWidth } from "./embed-image";

describe("fitWidth", () => {
  it("keeps a picture that is narrow enough", () => {
    expect(fitWidth(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWidth(1600, 900, 1600)).toEqual({ width: 1600, height: 900 });
  });

  it("makes a wider one narrower in the same proportions", () => {
    expect(fitWidth(3200, 1800, 1600)).toEqual({ width: 1600, height: 900 });
    expect(fitWidth(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
  });

  it("never gives a side of less than one pixel", () => {
    expect(fitWidth(10000, 1, 100)).toEqual({ width: 100, height: 1 });
    expect(fitWidth(0, 0, 100)).toEqual({ width: 1, height: 1 });
  });
});

describe("encodeWithin", () => {
  // Longer for a bigger picture and for a higher quality, as a real encoder is.
  const encoder = () =>
    vi.fn((scale: number, quality: number) =>
      "x".repeat(Math.round(scale * scale * quality * 1000)),
    );

  it("takes the first try when it already fits", () => {
    const encode = encoder();
    const out = encodeWithin(encode, 10_000, 0.8);
    expect(out?.length).toBe(800);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("goes on to a lower quality, then a smaller size, until it fits", () => {
    const encode = encoder();
    const out = encodeWithin(encode, 300, 0.8);
    expect(out).toBeDefined();
    expect(out?.length).toBeLessThanOrEqual(300);
    expect(encode.mock.calls.length).toBeGreaterThan(1);
    // Quality drops before the size does.
    expect(encode.mock.calls[1]).toEqual([1, 0.8 * 0.75]);
  });

  it("is undefined when nothing fits", () => {
    expect(encodeWithin(() => "x".repeat(500), 100, 0.8)).toBeUndefined();
  });
});
