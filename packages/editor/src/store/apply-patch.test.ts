import { builtInRegistry, emptyPage, type Shadow, type TreeNode } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { applyPatch } from "./apply-patch";

const node = (styles: TreeNode["styles"] = {}): TreeNode => ({ ...emptyPage().root, styles });
const apply = (n: TreeNode, patch: Parameters<typeof applyPatch>[1]) =>
  applyPatch(n, patch, "desktop", builtInRegistry);
const shadow: Shadow = { x: 0, y: 4, blur: 16, spread: 0, color: "#000000", opacity: 22 };

describe("applyPatch, opacity", () => {
  it("sets it, and takes it away at 100 because that is what no key means", () => {
    const half = apply(node(), { key: "opacity", value: 50 });
    expect(half.styles.opacity).toBe(50);
    expect(apply(half, { key: "opacity", value: 100 }).styles).toEqual({});
    expect(apply(half, { key: "opacity", value: undefined }).styles).toEqual({});
  });

  it("changes nothing for a value that is not an opacity, or is the same", () => {
    const half = node({ opacity: 50 });
    expect(apply(half, { key: "opacity", value: 101 })).toBe(half);
    expect(apply(half, { key: "opacity", value: Number.NaN })).toBe(half);
    expect(apply(half, { key: "opacity", value: 50 })).toBe(half);
    const plain = node();
    expect(apply(plain, { key: "opacity", value: 100 })).toBe(plain);
  });
});

describe("applyPatch, shadow", () => {
  it("sets it and removes it", () => {
    const shaded = apply(node({ background: "#ffffff" }), { key: "shadow", value: shadow });
    expect(shaded.styles).toEqual({ background: "#ffffff", shadow });
    expect(apply(shaded, { key: "shadow", value: undefined }).styles).toEqual({
      background: "#ffffff",
    });
  });

  it("changes nothing for a shadow that is out of range", () => {
    const plain = node();
    expect(apply(plain, { key: "shadow", value: { ...shadow, blur: -1 } })).toBe(plain);
    expect(apply(plain, { key: "shadow", value: { ...shadow, color: "red" } })).toBe(plain);
  });
});
