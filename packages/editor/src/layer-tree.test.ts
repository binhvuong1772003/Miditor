import type { TreeNode } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { ancestorIds, layerRows } from "./layer-tree";

const node = (id: string, children: TreeNode[] = []): TreeNode =>
  ({
    id,
    type: "Container",
    props: {},
    styles: {},
    children,
    position: { mode: "flow" },
  }) as TreeNode;

// page > [a, group > [b, c > [d]], e]
const page = node("page", [
  node("a"),
  node("group", [node("b"), node("c", [node("d")])]),
  node("e"),
]);

describe("layerRows", () => {
  it("lists the topmost block first, each followed by its own blocks, and not the page", () => {
    const rows = layerRows(page, new Set());
    expect(rows.map((r) => [r.node.id, r.depth])).toEqual([
      ["e", 0],
      ["group", 0],
      ["c", 1],
      ["d", 2],
      ["b", 1],
      ["a", 0],
    ]);
  });

  it("says what each line is in, and whether it can be opened", () => {
    const rows = layerRows(page, new Set());
    const by = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(by.d?.parentId).toBe("c");
    expect(by.e?.parentId).toBe("page");
    expect(by.group).toMatchObject({ hasChildren: true, expanded: true });
    expect(by.a).toMatchObject({ hasChildren: false, expanded: false });
  });

  it("leaves out what is under a shut block", () => {
    const rows = layerRows(page, new Set(["group"]));
    expect(rows.map((r) => r.node.id)).toEqual(["e", "group", "a"]);
    expect(rows.find((r) => r.node.id === "group")).toMatchObject({
      hasChildren: true,
      expanded: false,
    });
  });

  it("is empty for an empty page", () => {
    expect(layerRows(node("page"), new Set())).toEqual([]);
  });
});

describe("ancestorIds", () => {
  it("is the blocks a block is in, outermost first, without the page", () => {
    expect(ancestorIds(page, "d")).toEqual(["group", "c"]);
    expect(ancestorIds(page, "b")).toEqual(["group"]);
  });
  it("is empty for a block on the page, the page itself, or an id that is not there", () => {
    expect(ancestorIds(page, "a")).toEqual([]);
    expect(ancestorIds(page, "page")).toEqual([]);
    expect(ancestorIds(page, "nope")).toEqual([]);
  });
});
