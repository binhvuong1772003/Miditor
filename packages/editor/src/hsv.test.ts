import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex } from "./hsv";

const byte = fc.integer({ min: 0, max: 255 });
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

describe("hsvToHex", () => {
  it("makes the primaries", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00ff00");
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe("#0000ff");
  });

  it("makes white, black and greys whatever the hue", () => {
    expect(hsvToHex({ h: 200, s: 0, v: 1 })).toBe("#ffffff");
    expect(hsvToHex({ h: 200, s: 0.7, v: 0 })).toBe("#000000");
    expect(hsvToHex({ h: 90, s: 0, v: 0.5 })).toBe("#808080");
  });

  it("wraps the hue", () => {
    expect(hsvToHex({ h: 360, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: -120, s: 1, v: 1 })).toBe("#0000ff");
  });
});

describe("hexToHsv", () => {
  it("reads the primaries", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv("#0000ff")).toEqual({ h: 240, s: 1, v: 1 });
  });

  it("reads greys with no hue and no saturation", () => {
    expect(hexToHsv("#808080")).toMatchObject({ h: 0, s: 0 });
  });

  it("gives back the same colour for every colour", () => {
    fc.assert(
      fc.property(byte, byte, byte, (r, g, b) => {
        const hex = toHex(r, g, b);
        expect(hsvToHex(hexToHsv(hex))).toBe(hex);
      }),
    );
  });
});
