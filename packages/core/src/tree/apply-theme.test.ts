import { describe, expect, it } from "vitest";
import { builtInRegistry } from "../registry/built-in";
import { applyTheme } from "./apply-theme";
import { emptyPage } from "./page";
import type { PageData, TreeNode } from "./types";

const text = (id: string, color: string): TreeNode => ({
  id,
  type: "Text",
  props: { text: "Hi", color },
  styles: {},
  children: [],
  position: { mode: "flow" },
});

const page = (children: TreeNode[], colors?: Record<string, string>): PageData => {
  const base = emptyPage();
  return {
    ...base,
    ...(colors ? { theme: { colors, fonts: { body: "Inter, sans-serif" } } } : {}),
    root: { ...base.root, children },
  };
};

describe("applyTheme", () => {
  it("puts the colours and the font of the theme on the page", () => {
    const next = applyTheme(page([]), builtInRegistry, {
      colors: { primary: "#0e7490" },
      font: "Lora, serif",
    });
    expect(next.theme).toEqual({ colors: { primary: "#0e7490" }, fonts: { body: "Lora, serif" } });
  });

  it("leaves the blocks that use a colour the new theme has, so they show the new one", () => {
    const data = page([text("a", "@primary")], { primary: "#c2410c" });
    const next = applyTheme(data, builtInRegistry, { colors: { primary: "#0e7490" } });
    expect(next.root.children[0]?.props.color).toBe("@primary");
  });

  it("keeps the colour a block showed when the new theme has no such colour", () => {
    const data = page([text("a", "@accent")], { accent: "#be123c" });
    const next = applyTheme(data, builtInRegistry, { colors: { primary: "#0e7490" } });
    expect(next.root.children[0]?.props.color).toBe("#be123c");
  });

  it("does not touch a block with a colour of its own", () => {
    const data = page([text("a", "#123456")], { primary: "#c2410c" });
    const next = applyTheme(data, builtInRegistry, { colors: { primary: "#0e7490" } });
    expect(next.root.children[0]?.props.color).toBe("#123456");
  });

  it("gives back the very same page when the theme is already the page's", () => {
    const data = page([text("a", "@primary")], { primary: "#c2410c" });
    const same = applyTheme(data, builtInRegistry, {
      colors: { primary: "#c2410c" },
      font: "Inter, sans-serif",
    });
    expect(same).toBe(data);
  });

  it("an empty theme takes the theme off the page", () => {
    const next = applyTheme(page([], { primary: "#c2410c" }), builtInRegistry, { colors: {} });
    expect(next.theme).toBeUndefined();
  });
});
