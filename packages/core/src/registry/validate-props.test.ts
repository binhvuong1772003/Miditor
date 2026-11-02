import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ComponentDef } from "./types";
import { validateProps } from "./validate-props";

const def: ComponentDef = {
  label: "Sample",
  defaultProps: {},
  canContain: false,
  fields: {
    title: { type: "text", label: "Title", maxLength: 5 },
    size: { type: "number", label: "Size", min: 1, max: 10 },
    shape: { type: "select", label: "Shape", options: ["circle", "square"] },
    shown: { type: "boolean", label: "Shown" },
    tint: { type: "color", label: "Tint" },
    photo: { type: "image", label: "Photo" },
    target: { type: "link", label: "Target" },
    pick: { type: "custom", label: "Pick", kind: "picker" },
  },
};

describe("validateProps", () => {
  it("accepts good props, and no props at all", () => {
    expect(
      validateProps(def, {
        title: "Hello",
        size: 10,
        shape: "circle",
        shown: false,
        tint: "#aabbcc",
      }),
    ).toEqual([]);
    expect(validateProps(def, {})).toEqual([]);
  });

  it("accepts no link yet or a safe address for a link, and refuses the rest", () => {
    for (const target of ["", "https://e.co", "/a", "#top", "mailto:a@b.co", "tel:+84901234567"]) {
      expect(validateProps(def, { target }), target).toEqual([]);
    }
    for (const target of ["javascript:alert(1)", "a.html", "//e.co", "data:x", 5, null]) {
      expect(validateProps(def, { target }), String(target)).toEqual([
        { key: "target", code: "type" },
      ]);
    }
  });

  it("accepts a theme colour for a colour field, and refuses a name that is not one", () => {
    expect(validateProps(def, { tint: "@primary" })).toEqual([]);
    for (const tint of ["@", "@Primary", "primary", "#abc", "@a b"]) {
      expect(validateProps(def, { tint }), tint).toEqual([{ key: "tint", code: "type" }]);
    }
  });

  it("accepts no picture yet or a safe address for an image, and refuses the rest", () => {
    for (const photo of ["", "https://e.co/a.png", "/a.png", "data:image/png;base64,AAAA"]) {
      expect(validateProps(def, { photo }), photo).toEqual([]);
    }
    for (const photo of [
      "javascript:alert(1)",
      "a.png",
      "data:image/svg+xml;base64,AAAA",
      5,
      null,
    ]) {
      expect(validateProps(def, { photo }), String(photo)).toEqual([
        { key: "photo", code: "type" },
      ]);
    }
  });

  it("refuses a prop that has no field, also one named like something on the prototype", () => {
    expect(validateProps(def, { colour: "red" })).toEqual([{ key: "colour", code: "unknown" }]);
    const own = JSON.parse('{"__proto__": 1, "constructor": 2, "toString": 3}');
    expect(validateProps(def, own).map((i) => i.key)).toEqual([
      "__proto__",
      "constructor",
      "toString",
    ]);
    expect(validateProps(def, own).every((i) => i.code === "unknown")).toBe(true);
  });

  it("refuses the wrong kind of value", () => {
    expect(validateProps(def, { title: 5 })).toEqual([{ key: "title", code: "type" }]);
    expect(validateProps(def, { size: "3" })).toEqual([{ key: "size", code: "type" }]);
    expect(validateProps(def, { shape: 1 })).toEqual([{ key: "shape", code: "type" }]);
    expect(validateProps(def, { shown: "yes" })).toEqual([{ key: "shown", code: "type" }]);
    expect(validateProps(def, { tint: "red" })).toEqual([{ key: "tint", code: "type" }]);
    expect(validateProps(def, { tint: "#AABBCC" })).toEqual([{ key: "tint", code: "type" }]);
  });

  it("checks the range of text and numbers, ends included", () => {
    expect(validateProps(def, { title: "abcdef" })).toEqual([{ key: "title", code: "range" }]);
    expect(validateProps(def, { title: "abcde" })).toEqual([]);
    expect(validateProps(def, { size: 0.5 })).toEqual([{ key: "size", code: "range" }]);
    expect(validateProps(def, { size: 10.5 })).toEqual([{ key: "size", code: "range" }]);
    expect(validateProps(def, { size: 1 })).toEqual([]);
  });

  it("refuses a number that is not finite, and a choice that is not offered", () => {
    expect(validateProps(def, { size: Number.NaN })).toEqual([{ key: "size", code: "type" }]);
    expect(validateProps(def, { size: Number.POSITIVE_INFINITY })).toEqual([
      { key: "size", code: "type" },
    ]);
    expect(validateProps(def, { shape: "triangle" })).toEqual([{ key: "shape", code: "option" }]);
  });

  it("reports every bad prop, in the order of the props", () => {
    expect(validateProps(def, { size: 99, extra: true, title: 1 })).toEqual([
      { key: "size", code: "range" },
      { key: "extra", code: "unknown" },
      { key: "title", code: "type" },
    ]);
  });

  it("a field with no limits accepts any value of its kind", () => {
    const open: ComponentDef = {
      ...def,
      fields: { t: { type: "text", label: "T" }, n: { type: "number", label: "N" } },
    };
    fc.assert(
      fc.property(fc.string(), fc.double({ noNaN: true, noDefaultInfinity: true }), (t, n) => {
        expect(validateProps(open, { t, n })).toEqual([]);
      }),
    );
  });
});

describe("validateProps, a custom field", () => {
  it("takes any value that is JSON", () => {
    for (const value of [null, true, 3, "x", [1, "a"], { id: "p1", tags: ["a"] }]) {
      expect(validateProps(def, { pick: value })).toEqual([]);
    }
  });
});
