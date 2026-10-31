import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_COORDINATE } from "../position/limits";
import { parseCoordinate } from "./coordinate";

describe("parseCoordinate", () => {
  it.each([
    ["12", 12],
    ["-12", -12],
    ["+12", 12],
    ["12.5", 12.5],
    [".5", 0.5],
    ["-.5", -0.5],
    ["12px", 12],
    ["12 px", 12],
    ["  -12PX  ", -12],
    ["0", 0],
    ["1000000", MAX_COORDINATE],
    ["-1000000", -MAX_COORDINATE],
  ])("reads %j as %d", (input, expected) => {
    expect(parseCoordinate(input)).toBe(expected);
  });

  it("rounds to 0.01 px", () => {
    expect(parseCoordinate("1.234")).toBe(1.23);
    expect(parseCoordinate("1.235")).toBe(1.24);
    expect(parseCoordinate("-1.234")).toBe(-1.23);
    expect(parseCoordinate("0.004")).toBe(0);
  });

  it("never gives negative zero", () => {
    expect(Object.is(parseCoordinate("-0"), 0)).toBe(true);
    expect(Object.is(parseCoordinate("-0.001"), 0)).toBe(true);
  });

  it.each([
    "",
    " ",
    "px",
    "-",
    "+",
    "- 5",
    "--5",
    "5-",
    "1e3",
    "1E3",
    "5%",
    "5em",
    "5pt",
    "5 5",
    "5,5",
    "5.",
    "abc",
    "NaN",
    "Infinity",
    "0x10",
    "1000000.01",
    "-1000000.01",
    "99999999999",
  ])("refuses %j", (input) => {
    expect(parseCoordinate(input)).toBeUndefined();
  });

  it("reads back any whole number it was written from", () => {
    fc.assert(
      fc.property(fc.integer({ min: -MAX_COORDINATE, max: MAX_COORDINATE }), (n) => {
        expect(parseCoordinate(String(n))).toBe(n);
        expect(parseCoordinate(`${n}px`)).toBe(n);
      }),
    );
  });
});
