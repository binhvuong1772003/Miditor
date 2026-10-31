import { describe, expect, it } from "vitest";
import { builtInRegistry } from "./built-in";
import { BASIC_CATEGORY, DEFAULT_CATEGORY, libraryOf, searchRegistry } from "./library";
import type { ComponentDef, Registry } from "./types";

const kind = (label: string, over: Partial<ComponentDef> = {}): ComponentDef => ({
  label,
  canContain: false,
  defaultProps: {},
  fields: {},
  ...over,
});
const types = (items: { type: string }[]) => items.map((i) => i.type);

describe("searchRegistry", () => {
  const registry: Registry = {
    Text: kind("Text", { keywords: ["heading", "title"] }),
    Button: kind("Button", { keywords: ["link"], description: "A call to action" }),
    Hero: kind("Hero banner", { description: "Big text at the top" }),
    Footer: kind("Footer"),
    Group: kind("Group", { hidden: true }),
    Nut: kind("Nút bấm"),
  };

  it("finds every kind that is not hidden, in the order of the registry, for an empty query", () => {
    expect(types(searchRegistry(registry, ""))).toEqual([
      "Text",
      "Button",
      "Hero",
      "Footer",
      "Nut",
    ]);
    expect(types(searchRegistry(registry, "   "))).toEqual([
      "Text",
      "Button",
      "Hero",
      "Footer",
      "Nut",
    ]);
  });

  it("never finds a hidden kind, whatever the query", () => {
    expect(types(searchRegistry(registry, "group"))).toEqual([]);
  });

  it("ranks the label first (all of it, the start, inside), then a keyword that is the query, the type, a keyword that starts with it or has it inside, then the description", () => {
    const ranked: Registry = {
      Z8: kind("Last", { description: "has text in it" }),
      Z7: kind("Almost", { keywords: ["the context"] }),
      Z6: kind("Other", { keywords: ["textile"] }),
      Text: kind("Other label"),
      Z4: kind("Another", { keywords: ["text"] }),
      Z1: kind("In the middle, a Text word"),
      Z2: kind("Text box"),
      Z3: kind("Text"),
    };
    expect(types(searchRegistry(ranked, "text"))).toEqual([
      "Z3",
      "Z2",
      "Z1",
      "Z4",
      "Text",
      "Z6",
      "Z7",
      "Z8",
    ]);
  });

  it("keeps the order of the registry among kinds that match equally", () => {
    const same: Registry = { B: kind("Box one"), A: kind("Box two"), C: kind("Box three") };
    expect(types(searchRegistry(same, "box"))).toEqual(["B", "A", "C"]);
  });

  it("ignores case and accents, and the stroke of a Vietnamese d", () => {
    expect(types(searchRegistry(registry, "NUT"))).toEqual(["Nut"]);
    expect(types(searchRegistry(registry, "nút"))).toEqual(["Nut"]);
    expect(types(searchRegistry({ Item: kind("Đồng hồ") }, "dong"))).toEqual(["Item"]);
    expect(types(searchRegistry({ Item: kind("Đồng hồ") }, "ĐỒNG"))).toEqual(["Item"]);
    expect(types(searchRegistry({ E: kind("Café") }, "cafe"))).toEqual(["E"]);
  });

  it("finds a kind by a keyword, a description or its type", () => {
    expect(types(searchRegistry(registry, "heading"))).toEqual(["Text"]);
    expect(types(searchRegistry(registry, "action"))).toEqual(["Button"]);
    expect(types(searchRegistry({ MyHero: kind("Banner") }, "myhero"))).toEqual(["MyHero"]);
  });

  it("needs every word of a query somewhere in the kind", () => {
    expect(types(searchRegistry(registry, "big top"))).toEqual(["Hero"]);
    expect(types(searchRegistry(registry, "button link"))).toEqual(["Button"]);
    expect(types(searchRegistry(registry, "button nonsense"))).toEqual([]);
  });

  it("finds nothing for text that matches nothing", () => {
    expect(searchRegistry(registry, "zzz")).toEqual([]);
  });

  it("gives the definition with each type", () => {
    const [first] = searchRegistry(registry, "footer");
    expect(first).toEqual({ type: "Footer", def: registry.Footer });
  });

  it("skips an entry that is not a definition", () => {
    const odd = { Bad: null, Worse: { label: 5 }, Good: kind("Good") } as unknown as Registry;
    expect(types(searchRegistry(odd, ""))).toEqual(["Good"]);
  });

  it("finds the built-in kinds that the library lists, and not the group or the image", () => {
    expect(types(searchRegistry(builtInRegistry, ""))).toEqual([
      "Container",
      "Text",
      "Shape",
      "Button",
    ]);
    expect(types(searchRegistry(builtInRegistry, "picture"))).toEqual([]);
    // "cta" is also inside the keyword "rectangle", but only a keyword that is the query comes first.
    expect(types(searchRegistry(builtInRegistry, "cta"))).toEqual(["Button", "Shape"]);
  });
});

describe("libraryOf", () => {
  const registry: Registry = {
    Hero: kind("Hero"),
    Text: kind("Text", { category: BASIC_CATEGORY }),
    Pricing: kind("Pricing", { category: "From your website" }),
    Image: kind("Image", { category: BASIC_CATEGORY }),
    Blank: kind("Blank", { category: "   " }),
  };

  it("groups the kinds by category, Basic first, the others in the order of the registry", () => {
    expect(libraryOf(registry).map((g) => [g.category, types(g.items)])).toEqual([
      [BASIC_CATEGORY, ["Text", "Image"]],
      [DEFAULT_CATEGORY, ["Hero", "Blank"]],
      ["From your website", ["Pricing"]],
    ]);
  });

  it("puts a kind with no category, or a blank one, in Custom", () => {
    const groups = libraryOf({ A: kind("A"), B: kind("B", { category: "" }) });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe(DEFAULT_CATEGORY);
  });

  it("lists the groups by the best match when something is searched", () => {
    const groups = libraryOf(registry, "pricing");
    expect(groups.map((g) => g.category)).toEqual(["From your website"]);
    const both = libraryOf(
      { Basic1: kind("Zed", { category: BASIC_CATEGORY, keywords: ["x"] }), Custom1: kind("Xyz") },
      "x",
    );
    // "Xyz" starts with the query, "Zed" has it as a keyword: the custom group comes first.
    expect(both.map((g) => g.category)).toEqual([DEFAULT_CATEGORY, BASIC_CATEGORY]);
  });

  it("is empty when nothing matches, and without Basic it does not make one", () => {
    expect(libraryOf(registry, "zzz")).toEqual([]);
    expect(libraryOf({ A: kind("A") }).map((g) => g.category)).toEqual([DEFAULT_CATEGORY]);
  });

  it("lists the built-in kinds in Basic", () => {
    const groups = libraryOf(builtInRegistry);
    expect(groups.map((g) => [g.category, types(g.items)])).toEqual([
      [BASIC_CATEGORY, ["Container", "Text", "Shape", "Button"]],
    ]);
  });
});
