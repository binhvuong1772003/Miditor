import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseColourText } from "./colour-text";

describe("parseColourText", () => {
  it("reads a hex code with or without the hash, in any case", () => {
    expect(parseColourText("#2563eb")).toBe("#2563eb");
    expect(parseColourText("2563EB")).toBe("#2563eb");
    expect(parseColourText("  #2563Eb  ")).toBe("#2563eb");
  });

  it("opens up a short hex code", () => {
    expect(parseColourText("#25e")).toBe("#2255ee");
    expect(parseColourText("fff")).toBe("#ffffff");
  });

  it("reads three numbers, with rgb() around them or without", () => {
    expect(parseColourText("rgb(37, 99, 235)")).toBe("#2563eb");
    expect(parseColourText("rgb(37,99,235)")).toBe("#2563eb");
    expect(parseColourText("37, 99, 235")).toBe("#2563eb");
    expect(parseColourText("37 99 235")).toBe("#2563eb");
    expect(parseColourText("0 0 0")).toBe("#000000");
  });

  it("refuses what is not a colour", () => {
    for (const text of [
      "",
      "#",
      "#12",
      "#12345",
      "#1234567",
      "ggg",
      "rgb(300, 0, 0)",
      "256 0 0",
      "1 2",
      "1 2 3 4",
      "rgb(1, 2, 3",
      "red",
      "url(x)",
    ]) {
      expect(parseColourText(text), text).toBeUndefined();
    }
  });

  it("gives back every colour it is given as a six digit code", () => {
    const byte = fc.integer({ min: 0, max: 255 });
    fc.assert(
      fc.property(byte, byte, byte, (r, g, b) => {
        const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        expect(parseColourText(hex)).toBe(hex);
        expect(parseColourText(`rgb(${r}, ${g}, ${b})`)).toBe(hex);
      }),
    );
  });
});
