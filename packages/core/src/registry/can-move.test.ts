import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { moveNode } from "../tree/nodes";
import type { FlowNode, TreeNode } from "../tree/types";
import { canMove } from "./can-move";
import type { ComponentDef, Registry } from "./types";

const kind = (canContain: boolean): ComponentDef => ({
  label: "Kind",
  defaultProps: {},
  fields: {},
  canContain,
});
const registry: Registry = { Shape: kind(true), Text: kind(false) };

const node = (id: string, type: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type,
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});

//   page
//   ├─ shape   (Shape)
//   │   └─ inner  (Text)
//   ├─ other   (Shape)
//   ├─ text    (Text)
//   └─ heart   (a kind nobody registered)
const inner = node("inner", "Text");
const shape = node("shape", "Shape", [inner]);
const root = node("page", "Page", [
  shape,
  node("other", "Shape"),
  node("text", "Text"),
  node("heart", "Heart"),
]);

describe("canMove", () => {
  it("lets a block go into the root and into a kind that can contain", () => {
    expect(canMove(registry, root, "text", "page")).toBe(true);
    expect(canMove(registry, root, "text", "shape")).toBe(true);
    expect(canMove(registry, root, "inner", "other")).toBe(true);
    // The root needs no entry in the registry.
    expect(canMove({}, root, "inner", "page")).toBe(true);
  });

  it("refuses a kind that cannot contain, and a kind nobody registered", () => {
    expect(canMove(registry, root, "other", "text")).toBe(false);
    expect(canMove(registry, root, "other", "heart")).toBe(false);
    expect(canMove(registry, root, "other", "inner")).toBe(false);
  });

  it("refuses the root, a missing block and a missing parent", () => {
    expect(canMove(registry, root, "page", "shape")).toBe(false);
    expect(canMove(registry, root, "nope", "shape")).toBe(false);
    expect(canMove(registry, root, "text", "nope")).toBe(false);
  });

  it("refuses to put a block inside itself or inside what it holds", () => {
    expect(canMove(registry, root, "shape", "shape")).toBe(false);
    expect(canMove(registry, root, "shape", "inner")).toBe(false);
    const deep = node("page", "Page", [
      node("a", "Shape", [node("b", "Shape", [node("c", "Shape")])]),
    ]);
    expect(canMove(registry, deep, "a", "c")).toBe(false);
    expect(canMove(registry, deep, "c", "a")).toBe(true);
  });

  it("allows a block into the parent it is already in", () => {
    expect(canMove(registry, root, "inner", "shape")).toBe(true);
    expect(canMove(registry, root, "text", "page")).toBe(true);
  });

  it("does not take a kind named like the prototype for a registered one", () => {
    const odd = node("page", "Page", [
      node("a", "constructor"),
      node("b", "__proto__"),
      node("c", "Text"),
    ]);
    expect(canMove(registry, odd, "c", "a")).toBe(false);
    expect(canMove(registry, odd, "c", "b")).toBe(false);
  });

  it("with every kind open: a false means moveNode leaves the tree alone, a true means it can change it", () => {
    fc.assert(
      fc.property(tree, fc.nat(), fc.nat(), (generated, pickNode, pickParent) => {
        const t = relabel(generated);
        const all = nodesOf(t);
        const open: Registry = {};
        for (const n of all) open[n.type] = kind(true);
        const moving = all[pickNode % all.length] as TreeNode;
        const target = all[pickParent % all.length] as TreeNode;
        const allowed = canMove(open, t, moving.id, target.id);
        const moved = moveNode(t, moving.id, target.id, 0);
        if (!allowed) expect(moved).toBe(t);
        const alreadyFirst = target.children[0]?.id === moving.id;
        if (allowed && !alreadyFirst) expect(moved).not.toBe(t);
      }),
    );
  });
});
