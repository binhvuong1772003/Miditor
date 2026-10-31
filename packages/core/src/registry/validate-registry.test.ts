import { describe, expect, it } from "vitest";
import { insertNode } from "../tree/nodes";
import { emptyPage } from "../tree/page";
import { builtInRegistry } from "./built-in";
import { newNode } from "./new-node";
import type { ComponentDef, Registry } from "./types";
import { validatePage } from "./validate-page";
import { validateRegistry } from "./validate-registry";

const good: ComponentDef = {
  label: "Heart",
  canContain: false,
  defaultProps: { color: "#ff0000", n: 3 },
  fields: {
    color: { type: "color", label: "Colour" },
    n: { type: "number", label: "N", min: 1, max: 5 },
    kind: { type: "select", label: "Kind", options: ["a"] },
    t: { type: "text", label: "T", maxLength: 0 },
    b: { type: "boolean", label: "B" },
  },
  size: { w: 10, h: 20 },
  hidden: false,
  lockRatio: true,
};
/** A registry with one kind, `Heart`, that is `good` with these changes. */
const with_ = (change: Record<string, unknown>): Registry => ({
  Heart: { ...good, ...change } as ComponentDef,
});

describe("validateRegistry", () => {
  it("finds nothing wrong with the built-in kinds or with a good kind", () => {
    expect(validateRegistry(builtInRegistry)).toEqual([]);
    expect(validateRegistry({ Heart: good })).toEqual([]);
    expect(validateRegistry({})).toEqual([]);
  });

  it("refuses an empty name and Page", () => {
    expect(validateRegistry({ " ": good })).toEqual([{ type: " ", code: "name" }]);
    expect(validateRegistry({ Page: good })).toEqual([{ type: "Page", code: "name" }]);
  });

  it.each([
    [{ label: "" }, { type: "Heart", code: "label" }],
    [{ label: "  " }, { type: "Heart", code: "label" }],
    [{ label: 3 }, { type: "Heart", code: "label" }],
    [{ canContain: "yes" }, { type: "Heart", code: "canContain" }],
    [{ canContain: undefined }, { type: "Heart", code: "canContain" }],
    [{ hidden: 1 }, { type: "Heart", key: "hidden", code: "flag" }],
    [{ lockRatio: "x" }, { type: "Heart", key: "lockRatio", code: "flag" }],
    [{ size: { w: 0, h: 5 } }, { type: "Heart", code: "size" }],
    [{ size: { w: 5, h: Number.NaN } }, { type: "Heart", code: "size" }],
    [{ size: { w: 5, h: -1 } }, { type: "Heart", code: "size" }],
    [{ size: { w: Number.POSITIVE_INFINITY, h: 5 } }, { type: "Heart", code: "size" }],
    [{ size: 5 }, { type: "Heart", code: "size" }],
    [{ defaultProps: { color: "red", n: 3 } }, { type: "Heart", key: "color", code: "default" }],
    [
      { defaultProps: { extra: 1, color: "#ff0000", n: 3 } },
      { type: "Heart", key: "extra", code: "default" },
    ],
    [{ defaultProps: undefined }, { type: "Heart", code: "default" }],
    [{ category: "" }, { type: "Heart", key: "category", code: "meta" }],
    [{ category: " Basic" }, { type: "Heart", key: "category", code: "meta" }],
    [{ category: "x".repeat(41) }, { type: "Heart", key: "category", code: "meta" }],
    [{ category: 5 }, { type: "Heart", key: "category", code: "meta" }],
    [{ icon: "Text" }, { type: "Heart", key: "icon", code: "meta" }],
    [{ icon: "<svg>" }, { type: "Heart", key: "icon", code: "meta" }],
    [{ icon: "" }, { type: "Heart", key: "icon", code: "meta" }],
    [{ icon: "a".repeat(33) }, { type: "Heart", key: "icon", code: "meta" }],
    [{ keywords: "link" }, { type: "Heart", key: "keywords", code: "meta" }],
    [{ keywords: ["ok", ""] }, { type: "Heart", key: "keywords", code: "meta" }],
    [{ keywords: ["ok", 5] }, { type: "Heart", key: "keywords", code: "meta" }],
    [{ keywords: ["x".repeat(41)] }, { type: "Heart", key: "keywords", code: "meta" }],
    [
      { keywords: Array.from({ length: 21 }, () => "k") },
      { type: "Heart", key: "keywords", code: "meta" },
    ],
    [{ description: 5 }, { type: "Heart", key: "description", code: "meta" }],
    [{ description: "x".repeat(201) }, { type: "Heart", key: "description", code: "meta" }],
  ])("reports %j", (change, issue) => {
    expect(validateRegistry(with_(change))).toEqual([issue]);
  });

  it.each([
    ["no label", { type: "text", label: "" }],
    ["no type", { label: "X" }],
    ["unknown type", { type: "slider", label: "X" }],
    ["not an object", 5],
    ["image with no label", { type: "image" }],
    ["link with no label", { type: "link" }],
    ["perDevice that is not a boolean", { type: "text", label: "X", perDevice: "yes" }],
    ["negative maxLength", { type: "text", label: "X", maxLength: -1 }],
    ["fractional maxLength", { type: "text", label: "X", maxLength: 1.5 }],
    ["min over max", { type: "number", label: "X", min: 5, max: 1 }],
    ["min not a number", { type: "number", label: "X", min: "1" }],
    ["max NaN", { type: "number", label: "X", max: Number.NaN }],
    ["no options", { type: "select", label: "X", options: [] }],
    ["options missing", { type: "select", label: "X" }],
    ["option not a string", { type: "select", label: "X", options: ["a", 2] }],
  ])("reports a broken field: %s", (_name, field) => {
    const out = validateRegistry(with_({ fields: { x: field }, defaultProps: {} }));
    expect(out).toEqual([{ type: "Heart", key: "x", code: "field" }]);
  });

  it("accepts the library details at their limits", () => {
    const edges = {
      category: "x".repeat(40),
      icon: `a${"b".repeat(31)}`,
      keywords: Array.from({ length: 20 }, () => "k".repeat(40)),
      description: "d".repeat(200),
    };
    expect(validateRegistry(with_(edges))).toEqual([]);
    expect(validateRegistry(with_({ keywords: [], icon: "a", category: "A" }))).toEqual([]);
  });

  it("accepts the edges of a field", () => {
    const fields = {
      a: { type: "number", label: "A", min: 2, max: 2 },
      b: { type: "number", label: "B" },
      c: { type: "text", label: "C", maxLength: 0 },
      d: { type: "image", label: "D" },
      e: { type: "text", label: "E", perDevice: true },
      g: { type: "link", label: "G" },
      f: { type: "number", label: "F", perDevice: false },
    };
    expect(validateRegistry(with_({ fields, defaultProps: {} }))).toEqual([]);
  });

  it("reports fields that are not an object, and every kind in order", () => {
    expect(validateRegistry(with_({ fields: undefined, defaultProps: {} }))).toEqual([
      { type: "Heart", code: "field" },
    ]);
    const out = validateRegistry({
      A: { ...good, label: "" },
      B: good,
      C: { ...good, canContain: 1 as unknown as boolean },
    });
    expect(out.map((i) => i.type)).toEqual(["A", "C"]);
  });

  it("does not throw on a kind that is not an object", () => {
    expect(validateRegistry({ X: null as unknown as ComponentDef })).toEqual([
      { type: "X", code: "label" },
    ]);
  });

  it("a registry with no issues makes blocks that pass validatePage", () => {
    const registry = { ...builtInRegistry, Heart: good };
    expect(validateRegistry(registry)).toEqual([]);
    let page = emptyPage();
    for (const type of Object.keys(registry)) {
      const node = newNode(registry, type, `n-${type}`, { w: 960, h: 640 });
      if (node) page = { ...page, root: insertNode(page.root, page.root.id, node) };
    }
    expect(page.root.children).toHaveLength(Object.keys(registry).length);
    expect(validatePage(registry, page)).toEqual([]);
  });
});
