import { describe, expect, it } from "vitest";
import { isFreeNode } from "../tree/free-box";
import { newBlock } from "../tree/new-block";
import { insertNode } from "../tree/nodes";
import { emptyPage, isPageData } from "../tree/page";
import { newNode } from "./new-node";
import type { Registry } from "./types";
import { validatePage } from "./validate-page";

const registry: Registry = {
  Text: {
    label: "Text",
    canContain: false,
    defaultProps: { text: "Your text", size: 16 },
    fields: {
      text: { type: "text", label: "Text" },
      size: { type: "number", label: "Size", min: 1, max: 200 },
    },
  },
  Bare: { label: "Bare", canContain: true, defaultProps: {}, fields: {} },
};
const page = { w: 960, h: 640 };

describe("newNode", () => {
  it("is a free block of that kind with its default props and the given id", () => {
    const node = newNode(registry, "Text", "n1", page);
    expect(node).toMatchObject({ id: "n1", type: "Text", props: { text: "Your text", size: 16 } });
    expect(node && isFreeNode(node)).toBe(true);
  });

  it("is placed like newBlock", () => {
    const node = newNode(registry, "Text", "n1", page);
    expect(node).toEqual({
      ...newBlock("n1", page),
      type: "Text",
      props: registry.Text?.defaultProps,
    });
  });

  it("uses the size of its kind when it has one, and keeps it whatever the page", () => {
    const sized: Registry = {
      Heart: {
        label: "Heart",
        canContain: false,
        lockRatio: true,
        size: { w: 80, h: 64 },
        defaultProps: {},
        fields: {},
      },
    };
    for (const container of [page, { w: 375, h: 640 }, { w: 2000, h: 300 }]) {
      const node = newNode(sized, "Heart", "n1", container);
      expect(node?.size).toEqual({ w: { kind: "px", v: 80 }, h: { kind: "px", v: 64 } });
      expect(node?.position.x).toEqual({ anchor: "center", offset: 0 });
    }
  });

  it("gives every call its own props object, without touching the registry", () => {
    const a = newNode(registry, "Text", "n1", page);
    const b = newNode(registry, "Text", "n2", page);
    expect(a?.props).not.toBe(b?.props);
    expect(a?.props).not.toBe(registry.Text?.defaultProps);
    if (a) a.props.text = "changed";
    expect(registry.Text?.defaultProps.text).toBe("Your text");
    expect(newNode(registry, "Bare", "n3", page)?.props).toEqual({});
  });

  it("returns undefined for a kind the registry does not have, also one named like the prototype", () => {
    for (const type of ["Heart", "constructor", "__proto__", "toString", ""]) {
      expect(newNode(registry, type, "n1", page)).toBeUndefined();
    }
  });

  it("makes a block that goes into a page and passes every check", () => {
    const node = newNode(registry, "Text", "n1", page);
    expect(node).toBeDefined();
    if (!node) return;
    const empty = emptyPage();
    const grown = { ...empty, root: insertNode(empty.root, "root", node) };
    expect(grown.root.children).toHaveLength(1);
    expect(isPageData(grown)).toBe(true);
    expect(validatePage(registry, grown)).toEqual([]);
  });
});
