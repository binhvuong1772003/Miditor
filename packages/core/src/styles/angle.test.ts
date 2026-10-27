import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isAngle, normalizeAngle, parseAngle } from "./angle";

describe("normalizeAngle", () => {
  it("leaves an angle that is already in range as it is", () => {
    for (const ok of [0, 1, -1, 45, -45, 90, 179.99, -179.99, 180]) {
      expect(normalizeAngle(ok)).toBe(ok);
    }
  });

  it("wraps what is out of range into -180 (not included) to 180 (included)", () => {
    expect(normalizeAngle(190)).toBe(-170);
    expect(normalizeAngle(-190)).toBe(170);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(725)).toBe(5);
    expect(normalizeAngle(-725)).toBe(-5);
    expect(normalizeAngle(540)).toBe(180);
  });

  it("writes the half turn as 180, never -180", () => {
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(-540)).toBe(180);
  });

  it("rounds to 0.01", () => {
    expect(normalizeAngle(12.3456)).toBe(12.35);
    expect(normalizeAngle(0.004)).toBe(0);
    expect(normalizeAngle(179.999)).toBe(180);
    expect(normalizeAngle(-179.999)).toBe(180);
  });

  it("never returns -0", () => {
    expect(Object.is(normalizeAngle(-0), 0)).toBe(true);
    expect(Object.is(normalizeAngle(-0.001), 0)).toBe(true);
    expect(Object.is(normalizeAngle(360), 0)).toBe(true);
    expect(Object.is(normalizeAngle(-360), 0)).toBe(true);
  });

  it("is 0 for something that is not a finite number", () => {
    for (const bad of [Number.NaN, Infinity, -Infinity]) expect(normalizeAngle(bad)).toBe(0);
  });
});

describe("normalizeAngle, properties", () => {
  const degrees = fc.double({ min: -100000, max: 100000, noNaN: true });

  it("always gives an angle the strict check accepts", () => {
    fc.assert(fc.property(degrees, (d) => isAngle(normalizeAngle(d))));
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(degrees, (d) => {
        const once = normalizeAngle(d);
        return normalizeAngle(once) === once;
      }),
    );
  });

  it("does not change when a full turn is added", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -36000, max: 36000 }),
        fc.integer({ min: -5, max: 5 }),
        (h, turns) => {
          const d = h / 100;
          return normalizeAngle(d + 360 * turns) === normalizeAngle(d);
        },
      ),
    );
  });

  it("changes an angle by less than 0.005 plus whole turns", () => {
    fc.assert(
      fc.property(degrees, (d) => {
        const diff = (((normalizeAngle(d) - d) % 360) + 360) % 360;
        return Math.min(diff, 360 - diff) <= 0.005 + 1e-6;
      }),
    );
  });
});

describe("isAngle", () => {
  it("accepts a finite number above -180 and up to 180", () => {
    for (const ok of [0, 45, -179.99, 180, 0.01]) expect(isAngle(ok)).toBe(true);
  });

  it("refuses the ends that are not stored, and anything out of range", () => {
    for (const bad of [-180, 180.01, -180.01, 190, 360, -1000]) expect(isAngle(bad)).toBe(false);
  });

  it("refuses what is not a finite number, including what JSON makes of NaN", () => {
    for (const bad of [Number.NaN, Infinity, null, undefined, "45", {}, [], true]) {
      expect(isAngle(bad)).toBe(false);
    }
    expect(isAngle(JSON.parse(JSON.stringify(Number.NaN)))).toBe(false);
  });
});

describe("parseAngle", () => {
  it("reads a number with or without a unit", () => {
    expect(parseAngle("30")).toBe(30);
    expect(parseAngle("30°")).toBe(30);
    expect(parseAngle("30deg")).toBe(30);
    expect(parseAngle("30 DEG")).toBe(30);
    expect(parseAngle("  45  ")).toBe(45);
    expect(parseAngle("-45")).toBe(-45);
    expect(parseAngle("+10")).toBe(10);
    expect(parseAngle(".5")).toBe(0.5);
    expect(parseAngle("0")).toBe(0);
  });

  it("reads -0 as 0", () => {
    expect(Object.is(parseAngle("-0"), 0)).toBe(true);
  });

  it("rounds to 0.01 and wraps a turn of more than 180", () => {
    expect(parseAngle("12.3456")).toBe(12.35);
    expect(parseAngle("190")).toBe(-170);
    expect(parseAngle("-190")).toBe(170);
    expect(parseAngle("360")).toBe(0);
  });

  it("refuses text that is not an angle", () => {
    for (const bad of [
      "",
      " ",
      "abc",
      "1e3",
      "1e",
      "30rad",
      "30%",
      "30px",
      "--5",
      "+-5",
      "5 5",
      "°",
      "deg",
      "NaN",
      "Infinity",
      "0x10",
      "1,5",
      "5°°",
    ]) {
      expect(parseAngle(bad)).toBeUndefined();
    }
  });

  it("refuses a number too long to be finite", () => {
    expect(parseAngle("9".repeat(400))).toBeUndefined();
  });

  it("agrees with normalizeAngle for every plain number", () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: 100000 }), (hundredths) => {
        const d = hundredths / 100;
        return parseAngle(String(d)) === normalizeAngle(d);
      }),
    );
  });

  it("always gives a stored angle or nothing", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseAngle(text);
        return result === undefined || isAngle(result);
      }),
    );
  });
});
