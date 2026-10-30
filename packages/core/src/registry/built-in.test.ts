import { describe, expect, it } from "vitest";
import { isFreeNode } from "../tree/free-box";
import { groupNodes } from "../tree/group";
import { insertNode } from "../tree/nodes";
import { emptyPage, isPageData } from "../tree/page";
import { builtInRegistry } from "./built-in";
import { newNode } from "./new-node";
import { validatePage } from "./validate-page";
import { validateProps } from "./validate-props";

const page = { w: 960, h: 640 };

describe("builtInRegistry", () => {
  it("has the kinds the editor starts with", () => {
    expect(Object.keys(builtInRegistry)).toEqual(["Container", "Text", "Shape", "Image", "Group"]);
  });

  it("starts a text wide and a shape square, at the size of their kind", () => {
    const text = newNode(builtInRegistry, "Text", "n1", page);
    const shape = newNode(builtInRegistry, "Shape", "n2", page);
    const box = newNode(builtInRegistry, "Container", "n3", page);
    expect(text?.size).toEqual({ w: { kind: "px", v: 240 }, h: { kind: "px", v: 60 } });
    expect(shape?.size).toEqual({ w: { kind: "px", v: 160 }, h: { kind: "px", v: 160 } });
    // A box has no size of its own: it starts as it always did, a quarter of the page wide.
    expect(box?.position.x.anchor).toBe("scale");
  });

  it("has a group that holds blocks and is not offered when adding, and nothing else hidden", () => {
    expect(builtInRegistry.Group).toMatchObject({ canContain: true, hidden: true });
    const hidden = Object.entries(builtInRegistry).filter(([, def]) => def.hidden);
    expect(hidden.map(([type]) => type)).toEqual(["Group"]);
  });

  it("accepts what groupNodes makes", () => {
    const a = newNode(builtInRegistry, "Text", "n1", page);
    const b = newNode(builtInRegistry, "Shape", "n2", page);
    const empty = emptyPage();
    if (!a || !b) throw new Error("a kind is missing");
    const root = insertNode(insertNode(empty.root, "root", a), "root", b);
    const grouped = { ...empty, root: groupNodes(root, ["n1", "n2"], "n3", page) };
    expect(grouped.root.children.map((n) => n.type)).toEqual(["Group"]);
    expect(isPageData(grouped)).toBe(true);
    expect(validatePage(builtInRegistry, grouped)).toEqual([]);
  });

  it("starts an image empty, 240 by 160, keeping its ratio and holding nothing", () => {
    expect(builtInRegistry.Image).toMatchObject({
      size: { w: 240, h: 160 },
      lockRatio: true,
      canContain: false,
      defaultProps: { src: "", alt: "", fit: "cover" },
    });
    expect(builtInRegistry.Image?.fields.src).toEqual({ type: "image", label: "Picture address" });
  });

  it("lets the size of a text be set for the phone, and nothing else", () => {
    const perDevice = Object.entries(builtInRegistry).flatMap(([type, def]) =>
      Object.entries(def.fields)
        .filter(([, field]) => field.perDevice)
        .map(([name]) => `${type}.${name}`),
    );
    expect(perDevice).toEqual(["Text.size"]);
  });

  it("starts a text centred", () => {
    expect(builtInRegistry.Text?.defaultProps.align).toBe("center");
  });

  it("lets a shape and a box hold blocks, but not a text", () => {
    expect(builtInRegistry.Container?.canContain).toBe(true);
    expect(builtInRegistry.Shape?.canContain).toBe(true);
    expect(builtInRegistry.Text?.canContain).toBe(false);
  });

  it("gives every kind a name, and default props that its own fields accept", () => {
    for (const [type, def] of Object.entries(builtInRegistry)) {
      expect(def.label, type).not.toBe("");
      expect(validateProps(def, def.defaultProps), type).toEqual([]);
    }
  });

  it("has a default for every field, so a new block is complete", () => {
    for (const [type, def] of Object.entries(builtInRegistry)) {
      expect(Object.keys(def.defaultProps).sort(), type).toEqual(Object.keys(def.fields).sort());
    }
  });

  it("can make a block of every kind, and a page of them passes every check", () => {
    const empty = emptyPage();
    let root = empty.root;
    let n = 0;
    for (const type of Object.keys(builtInRegistry)) {
      const node = newNode(builtInRegistry, type, `n${++n}`, page);
      expect(node && isFreeNode(node), type).toBe(true);
      if (node) root = insertNode(root, "root", node);
    }
    // A text inside a shape, like a square with a word in it.
    const text = newNode(builtInRegistry, "Text", "n9", page);
    if (text) root = insertNode(root, "n3", text);
    const grown = { ...empty, root };
    expect(isPageData(grown)).toBe(true);
    expect(validatePage(builtInRegistry, grown)).toEqual([]);
  });

  it("can be extended by spreading, without changing it", () => {
    const heart = { label: "Heart", canContain: false, defaultProps: {}, fields: {} };
    const mine = { ...builtInRegistry, Heart: heart };
    expect(Object.keys(mine)).toEqual(["Container", "Text", "Shape", "Image", "Group", "Heart"]);
    expect(Object.keys(builtInRegistry)).toHaveLength(5);
  });
});
