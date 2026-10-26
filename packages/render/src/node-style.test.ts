import type { Axis, FlowNode, FreeNode, TreeNode } from "@midito-kitchen/core";
import { cssFor, freeBoxOf } from "@midito-kitchen/core";
import { describe, expect, it } from "vitest";
import { isBuiltIn, nodeStyle } from "./node-style";

const flow = (type: string, id = "n"): FlowNode => ({
  id,
  type,
  props: {},
  position: { mode: "flow" },
  children: [],
});

const free = (x: Axis, y: Axis = { anchor: "start", offset: 40 }): FreeNode => ({
  id: "f",
  type: "Container",
  props: {},
  position: { mode: "free", x, y },
  size: { w: { kind: "px", v: 160 }, h: { kind: "percent", v: 20 } },
  rotation: 15,
  children: [],
});

const everyAnchor: Axis[] = [
  { anchor: "start", offset: 10 },
  { anchor: "end", offset: 20 },
  { anchor: "center", offset: 5 },
  { anchor: "stretch", start: 30, end: 50 },
  { anchor: "scale", start: 10, size: 25 },
];

const nodes: TreeNode[] = [
  flow("Page"),
  flow("Container"),
  flow("Mystery"),
  ...everyAnchor.map((a) => free(a)),
];

describe("nodeStyle", () => {
  it("starts with `all` on every node, so it drops the host's rules first", () => {
    for (const node of nodes) {
      for (const isRoot of [false, true]) {
        expect(Object.keys(nodeStyle(node, isRoot))[0]).toBe("all");
      }
      expect(nodeStyle(node, false).all).toBe("revert");
    }
  });

  it("uses `all: initial` on the root, so inherited rules of the host cannot reach the page", () => {
    expect(nodeStyle(flow("Page", "root"), true).all).toBe("initial");
    expect(nodeStyle(flow("Container"), false).all).toBe("revert");
  });

  it("writes the box values right after it, then the type's own values", () => {
    expect(Object.keys(nodeStyle(flow("Container"), false)).slice(0, 8)).toEqual([
      "all",
      "margin",
      "padding",
      "border",
      "boxSizing",
      "transform",
      "display",
      "flexDirection",
    ]);
  });

  it("writes `transform: none`, never `revert`, so a drag library can append to it", () => {
    for (const node of nodes) expect(nodeStyle(node, false).transform).toBe("none");
  });

  it("always sets display explicitly, because `all: revert` resets it", () => {
    for (const node of nodes) expect(nodeStyle(node, false).display).toBeDefined();
  });

  it("makes a flow node `relative`, so the order in the tree is the order of painting", () => {
    expect(nodeStyle(flow("Container"), false).position).toBe("relative");
    expect(nodeStyle(flow("Mystery"), false).position).toBe("relative");
  });

  it("gives a free node exactly what cssFor gives, for every kind of anchor", () => {
    for (const anchor of everyAnchor) {
      const node = free(anchor);
      const style = nodeStyle(node, false) as Record<string, string>;
      for (const [key, value] of Object.entries(cssFor(freeBoxOf(node)))) {
        expect(style[key]).toBe(value);
      }
    }
  });

  it("puts the position after the type's values, so nothing can undo it", () => {
    const keys = Object.keys(nodeStyle(free({ anchor: "end", offset: 20 }), false));
    expect(keys.indexOf("left")).toBe(-1);
    expect(keys.indexOf("right")).toBeGreaterThan(keys.indexOf("display"));
    expect(keys.indexOf("top")).toBeGreaterThan(keys.indexOf("flexDirection"));
  });

  it("writes the page typography only on the root", () => {
    const root = nodeStyle(flow("Page", "root"), true);
    expect(root.fontFamily).toBeDefined();
    expect(root.fontSize).toBe("16px");
    expect(root.flexGrow).toBe(1);
    expect(nodeStyle(flow("Container"), false).fontFamily).toBeUndefined();
  });

  it("does not leak a class-like property: every value is a string or a number", () => {
    for (const node of nodes) {
      for (const value of Object.values(nodeStyle(node, false))) {
        expect(["string", "number"]).toContain(typeof value);
      }
    }
  });
});

describe("isBuiltIn", () => {
  it("knows the two built-in types for now", () => {
    expect(isBuiltIn("Page")).toBe(true);
    expect(isBuiltIn("Container")).toBe(true);
    expect(isBuiltIn("Mystery")).toBe(false);
    // Names that exist on every object must not count as types.
    expect(isBuiltIn("toString")).toBe(false);
    expect(isBuiltIn("constructor")).toBe(false);
  });
});
