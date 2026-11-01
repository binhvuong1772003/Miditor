import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  isSameTheme,
  isSavedTheme,
  MAX_THEME_NAME,
  type SavedTheme,
  savedFrom,
  themeOf,
} from "./saved-theme";

const sea: SavedTheme = {
  id: "sea",
  name: "Sea",
  colors: { primary: "#0e7490", paper: "#ecfeff" },
  font: "Lora, Georgia, serif",
};

describe("isSavedTheme", () => {
  it("accepts a theme with or without a font", () => {
    expect(isSavedTheme(sea)).toBe(true);
    expect(isSavedTheme({ id: "a1", name: "A", colors: {} })).toBe(true);
  });
  it("refuses a bad id, name, colour, font or key", () => {
    for (const bad of [
      { ...sea, id: "" },
      { ...sea, id: "Sea" },
      { ...sea, name: "" },
      { ...sea, name: " padded " },
      { ...sea, name: "x".repeat(MAX_THEME_NAME + 1) },
      { ...sea, name: "line\nbreak" },
      { ...sea, colors: { Primary: "#000000" } },
      { ...sea, colors: { primary: "red" } },
      { ...sea, colors: "none" },
      { ...sea, font: "a;b" },
      { ...sea, extra: 1 },
      null,
      [],
      "sea",
    ]) {
      expect(isSavedTheme(bad)).toBe(false);
    }
  });
});

describe("themeOf, savedFrom and isSameTheme", () => {
  it("make a theme of the page and back", () => {
    const theme = themeOf(sea);
    expect(theme).toEqual({ colors: sea.colors, fonts: { body: sea.font } });
    expect(savedFrom(theme, "sea", "Sea")).toEqual(sea);
    expect(isSameTheme(theme, sea)).toBe(true);
  });
  it("tell a different colour or font from the same theme", () => {
    expect(isSameTheme({ colors: { primary: "#000000", paper: "#ecfeff" } }, sea)).toBe(false);
    expect(isSameTheme({ colors: sea.colors }, sea)).toBe(false);
    expect(isSameTheme(undefined, { colors: {} })).toBe(true);
  });
  it("a theme made from any theme of the page is a good one", () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
          fc.stringMatching(/^#[0-9a-f]{6}$/),
          {
            maxKeys: 8,
          },
        ),
        (colors) => isSavedTheme(savedFrom({ colors }, "id1", "Name")),
      ),
    );
  });
});
