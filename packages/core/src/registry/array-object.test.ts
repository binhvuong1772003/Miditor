import { describe, expect, it } from "vitest";
import { defaultValueOf } from "./default-value";
import type { ComponentDef, Field, Registry } from "./types";
import { validateProps, validateValue } from "./validate-props";
import { validateRegistry } from "./validate-registry";

const entry = {
  type: "object",
  label: "Entry",
  fields: {
    label: { type: "text", label: "Label", maxLength: 10 },
    link: { type: "link", label: "Link" },
    new: { type: "boolean", label: "New" },
  },
} as const satisfies Field;

const menu: Field = { type: "array", label: "Menu", item: entry, minItems: 1, maxItems: 3 };

const def: ComponentDef = {
  label: "Nav",
  canContain: false,
  defaultProps: { menu: [{ label: "Home", link: "" }] },
  fields: { menu },
};

describe("array and object values", () => {
  it("accept a list of entries that follow their fields", () => {
    expect(validateProps(def, { menu: [{ label: "Home", link: "/", new: true }, {}] })).toEqual([]);
  });

  it("refuse what is not a list, and a list that is too short or too long", () => {
    expect(validateProps(def, { menu: "x" })).toEqual([{ key: "menu", code: "type" }]);
    expect(validateProps(def, { menu: [] })).toEqual([{ key: "menu", code: "range" }]);
    expect(validateProps(def, { menu: [{}, {}, {}, {}] })).toEqual([
      { key: "menu", code: "range" },
    ]);
  });

  it("refuse an entry with a value its field refuses or a key it does not have", () => {
    expect(validateProps(def, { menu: [{ label: "much too long a label" }] })).toEqual([
      { key: "menu", code: "range" },
    ]);
    expect(validateProps(def, { menu: [{ label: 3 }] })).toEqual([{ key: "menu", code: "type" }]);
    expect(validateProps(def, { menu: [{ other: 1 }] })).toEqual([
      { key: "menu", code: "unknown" },
    ]);
    expect(validateProps(def, { menu: [[]] })).toEqual([{ key: "menu", code: "type" }]);
  });

  it("do not find a field on the prototype", () => {
    expect(validateProps(def, { menu: [{ constructor: "x" }] })).toEqual([
      { key: "menu", code: "unknown" },
    ]);
  });

  it("cap a list at 100 whatever maxItems says", () => {
    const wide: Field = { type: "array", label: "A", item: { type: "boolean", label: "B" } };
    expect(
      validateValue(
        wide,
        Array.from({ length: 100 }, () => true),
      ),
    ).toBeUndefined();
    expect(
      validateValue(
        wide,
        Array.from({ length: 101 }, () => true),
      ),
    ).toBe("range");
  });
});

describe("defaultValueOf", () => {
  it("gives an empty or first value for each type and fills minItems", () => {
    expect(defaultValueOf(entry)).toEqual({ label: "", link: "", new: false });
    expect(defaultValueOf(menu)).toEqual([{ label: "", link: "", new: false }]);
    expect(defaultValueOf({ type: "number", label: "N", min: 5, max: 9 })).toBe(5);
    expect(defaultValueOf({ type: "number", label: "N", min: 5, max: 3 })).toBe(3);
    expect(defaultValueOf({ type: "select", label: "S", options: ["b", "a"] })).toBe("b");
    expect(defaultValueOf({ type: "custom", label: "C", kind: "x" })).toBeNull();
  });

  it("gives a value its field accepts", () => {
    for (const field of [entry, menu, { type: "color", label: "C" } as Field]) {
      expect(validateValue(field, defaultValueOf(field))).toBeUndefined();
    }
  });
});

const registry = (fields: Record<string, unknown>, defaultProps = {}): Registry =>
  ({ Nav: { label: "Nav", canContain: false, defaultProps, fields } }) as unknown as Registry;

describe("validateRegistry, arrays and objects", () => {
  it("accepts the nav", () => {
    expect(validateRegistry({ Nav: def })).toEqual([]);
  });

  const bad: [string, unknown][] = [
    ["no item", { type: "array", label: "A" }],
    ["an image inside", { type: "array", label: "A", item: { type: "image", label: "I" } }],
    [
      "an action inside",
      { type: "object", label: "O", fields: { a: { type: "action", label: "A" } } },
    ],
    [
      "a group inside",
      { type: "array", label: "A", item: { type: "boolean", label: "B", group: "X" } },
    ],
    ["no fields", { type: "object", label: "O", fields: {} }],
    [
      "a bad key",
      { type: "object", label: "O", fields: { "a b": { type: "boolean", label: "B" } } },
    ],
    [
      "minItems over maxItems",
      {
        type: "array",
        label: "A",
        item: { type: "boolean", label: "B" },
        minItems: 3,
        maxItems: 2,
      },
    ],
    [
      "maxItems over the cap",
      { type: "array", label: "A", item: { type: "boolean", label: "B" }, maxItems: 101 },
    ],
    [
      "nesting too deep",
      {
        type: "array",
        label: "A",
        item: {
          type: "array",
          label: "B",
          item: {
            type: "array",
            label: "C",
            item: { type: "array", label: "D", item: { type: "boolean", label: "E" } },
          },
        },
      },
    ],
  ];
  it.each(bad)("refuses %s", (_name, field) => {
    expect(validateRegistry(registry({ a: field }))).toEqual([
      { type: "Nav", key: "a", code: "field" },
    ]);
  });

  it("accepts a custom field inside an item", () => {
    const field = {
      type: "array",
      label: "A",
      item: { type: "custom", label: "P", kind: "picker" },
    };
    expect(validateRegistry(registry({ a: field }))).toEqual([]);
  });
});
