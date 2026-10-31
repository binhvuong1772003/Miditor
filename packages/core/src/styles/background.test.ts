import { describe, expect, it } from "vitest";
import {
  BACKGROUND_POSITIONS,
  BACKGROUND_REPEATS,
  BACKGROUND_SIZES,
  isBackgroundPosition,
  isBackgroundRepeat,
  isBackgroundSize,
} from "./background";

describe("the background picture's choices", () => {
  it("lists the sizes, the nine positions and the two ways to repeat", () => {
    expect([...BACKGROUND_SIZES]).toEqual(["cover", "contain", "auto"]);
    expect([...BACKGROUND_REPEATS]).toEqual(["no-repeat", "repeat"]);
    expect(BACKGROUND_POSITIONS).toHaveLength(9);
    expect(new Set(BACKGROUND_POSITIONS).size).toBe(9);
  });

  it("accepts each choice that is listed", () => {
    for (const v of BACKGROUND_SIZES) expect(isBackgroundSize(v)).toBe(true);
    for (const v of BACKGROUND_POSITIONS) expect(isBackgroundPosition(v)).toBe(true);
    for (const v of BACKGROUND_REPEATS) expect(isBackgroundRepeat(v)).toBe(true);
  });

  it("refuses anything else, whatever it looks like", () => {
    const bad = [
      "",
      "Cover",
      "50% 50%",
      "10px 20px",
      "center center",
      "left top",
      "repeat-x",
      "space",
      "url(x)",
      5,
      null,
      undefined,
      {},
      [],
    ];
    for (const v of bad) {
      expect(isBackgroundSize(v), String(v)).toBe(false);
      expect(isBackgroundPosition(v), String(v)).toBe(false);
      expect(isBackgroundRepeat(v), String(v)).toBe(false);
    }
    expect(isBackgroundSize("center")).toBe(false);
    expect(isBackgroundPosition("cover")).toBe(false);
    expect(isBackgroundRepeat("cover")).toBe(false);
  });

  it("does not take a name from the prototype", () => {
    for (const v of ["constructor", "toString", "__proto__", "length"]) {
      expect(isBackgroundSize(v)).toBe(false);
      expect(isBackgroundPosition(v)).toBe(false);
      expect(isBackgroundRepeat(v)).toBe(false);
    }
  });
});
