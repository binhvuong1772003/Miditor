import { describe, expect, it } from "vitest";
import { isOpacity, isShadow, type Shadow } from "./effects";

const shadow: Shadow = { x: 0, y: 4, blur: 16, spread: 0, color: "#000000", opacity: 22 };

describe("isOpacity", () => {
  it.each([0, 1, 50, 99.5, 100])("accepts %s", (value) => {
    expect(isOpacity(value)).toBe(true);
  });

  it.each([-1, 100.01, Number.NaN, Number.POSITIVE_INFINITY, "50", null, undefined, {}])(
    "refuses %s",
    (value) => {
      expect(isOpacity(value)).toBe(false);
    },
  );
});

describe("isShadow", () => {
  it("accepts a good shadow, with a hex or a theme colour", () => {
    expect(isShadow(shadow)).toBe(true);
    expect(isShadow({ ...shadow, color: "@primary" })).toBe(true);
    expect(isShadow({ x: -200, y: 200, blur: 0, spread: -200, color: "#abcdef", opacity: 0 })).toBe(
      true,
    );
  });

  it.each([
    ["an x too far", { ...shadow, x: 201 }],
    ["a y too far", { ...shadow, y: -201 }],
    ["a negative blur", { ...shadow, blur: -1 }],
    ["a blur too big", { ...shadow, blur: 201 }],
    ["a spread too far", { ...shadow, spread: 201 }],
    ["an opacity over 100", { ...shadow, opacity: 101 }],
    ["a colour that is not a colour", { ...shadow, color: "red; x" }],
    ["a missing member", { x: 0, y: 0, blur: 0, spread: 0, color: "#000000" }],
    ["a member too many", { ...shadow, inset: true }],
    ["a NaN", { ...shadow, blur: Number.NaN }],
    ["a string number", { ...shadow, x: "1" }],
  ])("refuses %s", (_name, value) => {
    expect(isShadow(value)).toBe(false);
  });

  it.each([null, undefined, 3, "x", [], [shadow]])("refuses %j", (value) => {
    expect(isShadow(value)).toBe(false);
  });
});
