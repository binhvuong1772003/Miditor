import type { Registry, TreeNode } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { placeFor, zoneAt } from "./layer-drop";

const node = (id: string, type: string, children: TreeNode[] = []): TreeNode =>
  ({ id, type, props: {}, styles: {}, children, position: { mode: "flow" } }) as TreeNode;
const def = (canContain: boolean) => ({
  label: "x",
  defaultProps: {},
  fields: {},
  canContain,
});
const registry: Registry = { Container: def(true), Text: def(false) };

// root > [a, b, c, box > [x, y], note]; the last child is drawn on top
const root = node("root", "Page", [
  node("a", "Text"),
  node("b", "Text"),
  node("c", "Text"),
  node("box", "Container", [node("x", "Text"), node("y", "Text")]),
  node("note", "Text"),
]);
const abc = node("root", "Page", [node("a", "Text"), node("b", "Text"), node("c", "Text")]);

describe("zoneAt", () => {
  it("splits a row that can hold blocks into the top quarter, the middle half and the bottom quarter", () => {
    expect(zoneAt(2, 40, true)).toBe("above");
    expect(zoneAt(20, 40, true)).toBe("inside");
    expect(zoneAt(38, 40, true)).toBe("below");
  });
  it("splits a row that cannot hold blocks into two halves", () => {
    expect(zoneAt(10, 40, false)).toBe("above");
    expect(zoneAt(30, 40, false)).toBe("below");
  });
});

describe("placeFor", () => {
  const place = (
    tree: TreeNode,
    draggedId: string,
    overId: string,
    zone: "above" | "inside" | "below",
  ) => placeFor({ root: tree, registry, draggedId, overId, zone });

  it("puts a block above a row at the place after it among its siblings, without the block itself", () => {
    expect(place(abc, "a", "c", "above")).toMatchObject({ parentId: "root", index: 2 });
  });
  it("puts a block below a row at the place of that row among its siblings, without the block itself", () => {
    expect(place(abc, "c", "a", "below")).toMatchObject({ parentId: "root", index: 0 });
  });
  it("puts a block inside a block that holds blocks, on top of the ones in it", () => {
    expect(place(root, "a", "box", "inside")).toMatchObject({ parentId: "box", index: 2 });
  });
  it("refuses to go inside a block that cannot hold blocks", () => {
    expect(place(root, "a", "b", "inside")).toBeUndefined();
  });
  it("refuses the block itself, the page, and what is inside the block", () => {
    expect(place(root, "a", "a", "above")).toBeUndefined();
    expect(place(root, "a", "root", "inside")).toBeUndefined();
    expect(place(root, "box", "x", "above")).toBeUndefined();
    expect(place(root, "box", "x", "inside")).toBeUndefined();
  });
  it("gives nothing for a drop that leaves the order as it is", () => {
    // [a, b, c]: b above a is index 1, where b already is.
    expect(place(abc, "b", "a", "above")).toBeUndefined();
  });
  it("takes the parent of the row dropped over, whatever the depth of the row above it in the list", () => {
    expect(place(root, "a", "x", "above")).toMatchObject({ parentId: "box", index: 1 });
    expect(place(root, "a", "x", "below")).toMatchObject({ parentId: "box", index: 0 });
  });
  it("moves a block out of a block to the page", () => {
    expect(place(root, "x", "a", "below")).toMatchObject({ parentId: "root", index: 0 });
  });
});
