import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { propsWithDefaults } from "./props-with-defaults";
import type { ComponentDef } from "./types";
import { validateProps } from "./validate-props";

const def: ComponentDef = {
  label: "Sample",
  canContain: false,
  defaultProps: { title: "Hi", size: 4, shown: true },
  fields: {
    title: { type: "text", label: "Title" },
    size: { type: "number", label: "Size", min: 0, max: 10 },
    shown: { type: "boolean", label: "Shown" },
  },
};

describe("propsWithDefaults", () => {
  it("fills in what is missing and keeps what is there", () => {
    expect(propsWithDefaults(def, { size: 9 })).toEqual({ size: 9, title: "Hi", shown: true });
    expect(propsWithDefaults(def, {})).toEqual(def.defaultProps);
  });

  it("keeps 0, false and an empty string instead of putting the default back", () => {
    const props = { title: "", size: 0, shown: false };
    expect(propsWithDefaults(def, props)).toBe(props);
  });

  it("returns the very same object when nothing is missing", () => {
    const props = { title: "x", size: 1, shown: true };
    expect(propsWithDefaults(def, props)).toBe(props);
  });

  it("changes neither the props nor the defaults", () => {
    const props = { size: 9 };
    propsWithDefaults(def, props);
    expect(props).toEqual({ size: 9 });
    expect(def.defaultProps).toEqual({ title: "Hi", size: 4, shown: true });
  });

  it("keeps a prop with no field, so validateProps can still report it", () => {
    const out = propsWithDefaults(def, { colour: "red" });
    expect(out.colour).toBe("red");
    expect(validateProps(def, out)).toEqual([{ key: "colour", code: "unknown" }]);
  });

  it("keeps a default named __proto__ as data, not as the prototype", () => {
    const odd: ComponentDef = {
      ...def,
      defaultProps: JSON.parse('{"__proto__": 1}'),
      fields: {},
    };
    const out = propsWithDefaults(odd, {});
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(Object.hasOwn(out, "__proto__")).toBe(true);
  });

  it("good props stay good once the defaults are in", () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            title: fc.string(),
            size: fc.double({ min: 0, max: 10, noNaN: true }),
            shown: fc.boolean(),
          },
          { requiredKeys: [] },
        ),
        (props) => {
          const out = propsWithDefaults(def, props);
          expect(validateProps(def, out)).toEqual([]);
          expect(Object.keys(out).sort()).toEqual(["shown", "size", "title"]);
          for (const [key, value] of Object.entries(props)) expect(out[key]).toBe(value);
        },
      ),
    );
  });
});
