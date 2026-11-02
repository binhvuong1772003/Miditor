import { isFontStack } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { DEFAULT_FONTS, fontName, listedFont, usableFonts } from "./fonts";

const inter = { name: "Inter", stack: "Inter, system-ui, sans-serif" };

describe("usableFonts", () => {
  it("keeps the host's fonts that can be stored and drops the rest", () => {
    expect(
      usableFonts([inter, { name: "Bad", stack: "a;b" }, { name: "", stack: "Lora" }]),
    ).toEqual([inter]);
  });
  it("gives the default fonts when the host gives none, or none that can be used", () => {
    expect(usableFonts(undefined)).toBe(DEFAULT_FONTS);
    expect(usableFonts([])).toBe(DEFAULT_FONTS);
    expect(usableFonts([{ name: "Bad", stack: "a;b" }])).toBe(DEFAULT_FONTS);
  });
  it("every default font can be stored as it is", () => {
    for (const font of DEFAULT_FONTS) expect(isFontStack(font.stack)).toBe(true);
  });
});

describe("fontName", () => {
  it("is the name in the list, or the first family when the list no longer has it", () => {
    expect(fontName(inter.stack, [inter])).toBe("Inter");
    expect(fontName("'Playfair Display', serif", [inter])).toBe("Playfair Display");
    expect(fontName("Lora", [])).toBe("Lora");
  });
});

describe("listedFont", () => {
  it("reads the roles of older pages as the page's font, and passes a stack through", () => {
    expect(listedFont("body")).toBe("");
    expect(listedFont("heading")).toBe("");
    expect(listedFont("")).toBe("");
    expect(listedFont(undefined)).toBe("");
    expect(listedFont(5)).toBe("");
    expect(listedFont(inter.stack)).toBe(inter.stack);
  });
});
