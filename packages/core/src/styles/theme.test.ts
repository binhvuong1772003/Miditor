import { describe, expect, it } from "vitest";
import {
  colorRef,
  isColorValue,
  isFontStack,
  isTheme,
  isTokenName,
  MAX_THEME_COLORS,
  nameOfColorRef,
  resolveColor,
} from "./theme";

describe("isTokenName and colorRef", () => {
  it.each(["a", "primary", "accent-2", "a".repeat(32)])("accepts %s", (name) => {
    expect(isTokenName(name)).toBe(true);
    expect(nameOfColorRef(colorRef(name))).toBe(name);
  });

  it.each(["", "Primary", "2a", "-a", "a b", "a_b", "a".repeat(33), "é", " a", "a\n", 5, null])(
    "refuses %j",
    (name) => {
      expect(isTokenName(name)).toBe(false);
    },
  );
});

describe("nameOfColorRef and isColorValue", () => {
  it("reads the name in a reference, and nothing in anything else", () => {
    expect(nameOfColorRef("@primary")).toBe("primary");
    for (const value of [
      "primary",
      "@",
      "@Primary",
      "@a b",
      "@a\n",
      "##a",
      "@@a",
      "#aabbcc",
      5,
      null,
      undefined,
    ]) {
      expect(nameOfColorRef(value), String(value)).toBeUndefined();
    }
  });

  it("accepts a stored colour or a reference and nothing else", () => {
    expect(isColorValue("#aabbcc")).toBe(true);
    expect(isColorValue("@accent")).toBe(true);
    for (const value of ["#abc", "#AABBCC", "red", "@", "rgb(0,0,0)", "url(x)", "", 1, null]) {
      expect(isColorValue(value), String(value)).toBe(false);
    }
  });
});

describe("isFontStack", () => {
  it.each([
    "Inter",
    "Playfair Display, serif",
    "'Noto Sans', system-ui, sans-serif",
    "a-b",
    "x".repeat(200),
  ])("accepts %s", (stack) => {
    expect(isFontStack(stack)).toBe(true);
  });

  it.each([
    "",
    "x".repeat(201),
    'a"b',
    "a;b",
    "a{b}",
    "a\\b",
    "a(b)",
    "a:b",
    "url(x)",
    "a\nb",
    "a/*b",
    5,
    null,
  ])("refuses %j", (stack) => {
    expect(isFontStack(stack)).toBe(false);
  });
});

describe("isTheme", () => {
  it("accepts an empty theme, colours, fonts and both", () => {
    expect(isTheme({})).toBe(true);
    expect(isTheme({ colors: {} })).toBe(true);
    expect(isTheme({ colors: { primary: "#112233", "accent-2": "#ffffff" } })).toBe(true);
    expect(isTheme({ fonts: { body: "Inter, sans-serif", heading: "Playfair Display" } })).toBe(
      true,
    );
    expect(isTheme({ fonts: {} })).toBe(true);
    expect(isTheme({ colors: { a: "#000000" }, fonts: { body: "Inter" } })).toBe(true);
  });

  it("refuses what is not a theme", () => {
    for (const value of [null, 5, "x", [], undefined])
      expect(isTheme(value), String(value)).toBe(false);
    expect(isTheme({ extra: 1 })).toBe(false);
    expect(isTheme({ colors: [] })).toBe(false);
    expect(isTheme({ colors: null })).toBe(false);
    expect(isTheme({ colors: { Primary: "#112233" } })).toBe(false);
    expect(isTheme({ colors: { primary: "red" } })).toBe(false);
    expect(isTheme({ colors: { primary: "@other" } })).toBe(false);
    expect(isTheme({ fonts: [] })).toBe(false);
    expect(isTheme({ fonts: null })).toBe(false);
    expect(isTheme({ fonts: { body: "a;b" } })).toBe(false);
    expect(isTheme({ fonts: { mono: "Courier" } })).toBe(false);
  });

  it("allows 32 colours and no more", () => {
    expect(MAX_THEME_COLORS).toBe(32);
    const colors = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, "#000000"]));
    expect(isTheme({ colors: colors(MAX_THEME_COLORS) })).toBe(true);
    expect(isTheme({ colors: colors(MAX_THEME_COLORS + 1) })).toBe(false);
  });
});

describe("resolveColor", () => {
  const theme = { colors: { primary: "#112233" } };

  it("gives a stored colour as it is, with or without a theme", () => {
    expect(resolveColor("#aabbcc", theme)).toBe("#aabbcc");
    expect(resolveColor("#aabbcc")).toBe("#aabbcc");
  });

  it("gives the colour a reference names", () => {
    expect(resolveColor("@primary", theme)).toBe("#112233");
  });

  it("gives nothing for a reference the theme does not have, or when there is no theme", () => {
    expect(resolveColor("@other", theme)).toBeUndefined();
    expect(resolveColor("@primary")).toBeUndefined();
    expect(resolveColor("@primary", {})).toBeUndefined();
    expect(resolveColor("@primary", { fonts: { body: "Inter" } })).toBeUndefined();
  });

  it("gives nothing for a name that is on the prototype, or for a colour that is not stored properly", () => {
    expect(resolveColor("@constructor", theme)).toBeUndefined();
    expect(resolveColor("@tostring", { colors: {} })).toBeUndefined();
    expect(resolveColor("@primary", { colors: { primary: "red" } })).toBeUndefined();
  });

  it("gives nothing for anything else", () => {
    for (const value of ["red", "#abc", 5, null, undefined, "@", "url(x)"]) {
      expect(resolveColor(value, theme), String(value)).toBeUndefined();
    }
  });
});
