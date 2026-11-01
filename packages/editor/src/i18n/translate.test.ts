import { describe, expect, it } from "vitest";
import { vi as vietnamese } from "../locales/vi";
import { en, type MessageKey } from "./en";
import { createT, format, placesOf } from "./translate";

describe("format", () => {
  it("fills the places it has a value for and leaves the others", () => {
    expect(format("Hide {name}", { name: "Blocks" })).toBe("Hide Blocks");
    expect(format("{a} and {b}", { a: 1 })).toBe("1 and {b}");
    expect(format("Hide {name}")).toBe("Hide {name}");
  });
  it("does not take a name from the prototype", () => {
    expect(format("{toString}", {})).toBe("{toString}");
  });
});

describe("createT", () => {
  it("says English without anything", () => {
    expect(createT(undefined)("header.save")).toBe("Save");
    expect(createT({})("rail.hide", { name: "X" })).toBe("Hide X");
  });

  it("says the host's message and falls back to English for a key it leaves out", () => {
    const t = createT({ messages: { "header.save": "Lưu" } });
    expect(t("header.save")).toBe("Lưu");
    expect(t("header.fit")).toBe("Fit");
  });

  it("asks translate first, with the filled-in fallback, and keeps the fallback when it has no answer", () => {
    const seen: unknown[] = [];
    const t = createT({
      messages: { "rail.hide": "Ẩn {name}" },
      translate: (key, params, fallback) => {
        seen.push([key, params, fallback]);
        return key === "header.save" ? "Store" : undefined;
      },
    });
    expect(t("header.save")).toBe("Store");
    expect(t("rail.hide", { name: "Khối" })).toBe("Ẩn Khối");
    expect(seen[1]).toEqual(["rail.hide", { name: "Khối" }, "Ẩn Khối"]);
  });

  it("keeps the fallback for an empty or odd answer", () => {
    const t = createT({ translate: () => "" });
    expect(t("header.save")).toBe("Save");
    const odd = createT({ translate: () => 3 as unknown as string });
    expect(odd("header.save")).toBe("Save");
  });
});

describe("the Vietnamese pack", () => {
  const keys = Object.keys(en) as MessageKey[];
  it("has a sentence for every key", () => {
    expect(Object.keys(vietnamese).sort()).toEqual([...keys].sort());
    for (const key of keys) expect(vietnamese[key].trim()).not.toBe("");
  });
  it("keeps every {place} of the English sentence", () => {
    for (const key of keys) expect(placesOf(vietnamese[key])).toEqual(placesOf(en[key]));
  });
});

describe("createT().or", () => {
  it("says the registered text for a kind with no translation, and a translation when there is one", () => {
    const t = createT({ messages: { "kind.Text.label": "Văn bản" } as never });
    expect(t.or("kind.Text.label", "Text")).toBe("Văn bản");
    expect(t.or("kind.Hero.label", "Hero")).toBe("Hero");
  });

  it("asks translate for a kind of the host, with the registered text as the fallback", () => {
    const t = createT({
      translate: (key, _params, fallback) =>
        key === ("kind.Hero.label" as never) ? `${fallback}!` : undefined,
    });
    expect(t.or("kind.Hero.label", "Hero")).toBe("Hero!");
    expect(t.or("kind.Other.label", "Other")).toBe("Other");
  });
});
