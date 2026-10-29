import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { insertNode, nextId } from "../tree/nodes";
import type { FlowNode, TreeNode } from "../tree/types";
import { canInsert } from "./can-insert";
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
//   ├─ shape  (Shape, holds "inner")
//   ├─ text   (Text)
//   └─ heart  (a kind nobody registered)
const inner = node("inner", "Text");
const shape = node("shape", "Shape", [inner]);
const root = node("page", "Page", [shape, node("text", "Text"), node("heart", "Heart")]);
const fresh = node("fresh", "Text");

describe("canInsert", () => {
  it("lets blocks into the root and into a kind that can contain", () => {
    expect(canInsert(registry, root, "page", fresh)).toBe(true);
    expect(canInsert(registry, root, "shape", fresh)).toBe(true);
    // The root needs no entry in the registry, also with an empty registry.
    expect(canInsert({}, root, "page", fresh)).toBe(true);
  });

  it("refuses a kind that cannot contain, and a kind nobody registered", () => {
    expect(canInsert(registry, root, "text", fresh)).toBe(false);
    expect(canInsert(registry, root, "heart", fresh)).toBe(false);
    expect(canInsert(registry, root, "inner", fresh)).toBe(false);
  });

  it("refuses a parent that is not in the tree", () => {
    expect(canInsert(registry, root, "nope", fresh)).toBe(false);
  });

  it("refuses an id that is taken, also deep inside the new block", () => {
    expect(canInsert(registry, root, "page", node("shape", "Text"))).toBe(false);
    expect(canInsert(registry, root, "page", node("fresh", "Shape", [node("inner", "Text")]))).toBe(
      false,
    );
    expect(canInsert(registry, root, "page", node("fresh", "Shape", [node("other", "Text")]))).toBe(
      true,
    );
  });

  it("does not take a kind named like the prototype for a registered one", () => {
    const odd = node("page", "Page", [node("a", "constructor"), node("b", "__proto__")]);
    expect(canInsert(registry, odd, "a", fresh)).toBe(false);
    expect(canInsert(registry, odd, "b", fresh)).toBe(false);
  });

  it("agrees with insertNode: true exactly when the tree would change", () => {
    fc.assert(
      fc.property(tree, fc.nat(), fc.boolean(), (generated, pick, reuseId) => {
        const t = relabel(generated);
        const all = nodesOf(t);
        const open: Registry = {};
        for (const n of all) open[n.type] = kind(true);
        const parent = all[pick % all.length] as TreeNode;
        const block = node(reuseId ? (all[0] as TreeNode).id : nextId(t), "Text");
        const allowed = canInsert(open, t, parent.id, block);
        expect(allowed).toBe(insertNode(t, parent.id, block) !== t);
        expect(allowed).toBe(!reuseId);
      }),
    );
  });
});
