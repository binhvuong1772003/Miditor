import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { parentOf, pathTo } from "./nodes";
import { pickBlock } from "./pick";
import type { FlowNode, TreeNode } from "./types";

const node = (id: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});

//   root
//   ├─ g
//   │  ├─ a
//   │  └─ b
//   │     └─ b1
//   └─ c
const b = node("b", [node("b1")]);
const g = node("g", [node("a"), b]);
const root = node("root", [g, node("c")]);

describe("pathTo", () => {
  it("lists the nodes from the root down to the target, both included", () => {
    expect(pathTo(root, "b1")?.map((n) => n.id)).toEqual(["root", "g", "b", "b1"]);
    expect(pathTo(root, "root")?.map((n) => n.id)).toEqual(["root"]);
    expect(pathTo(root, "c")?.[1]).toBe(root.children[1]);
  });

  it("is undefined for an id that is not in the tree", () => {
    expect(pathTo(root, "nope")).toBeUndefined();
  });
});

describe("pickBlock", () => {
  it("selects the outermost block of the scope that holds the target", () => {
    expect(pickBlock(root, "root", "b1")).toEqual({ id: "g", scopeId: "root" });
    expect(pickBlock(root, "root", "c")).toEqual({ id: "c", scopeId: "root" });
    expect(pickBlock(root, "g", "b1")).toEqual({ id: "b", scopeId: "g" });
    expect(pickBlock(root, "g", "a")).toEqual({ id: "a", scopeId: "g" });
    expect(pickBlock(root, "b", "b1")).toEqual({ id: "b1", scopeId: "b" });
  });

  it("selects the scope itself, and goes up, when the press is on the scope", () => {
    expect(pickBlock(root, "g", "g")).toEqual({ id: "g", scopeId: "root" });
    expect(pickBlock(root, "b", "b")).toEqual({ id: "b", scopeId: "g" });
  });

  it("starts again from the page for a press outside the scope, or a scope that is not there", () => {
    expect(pickBlock(root, "g", "c")).toEqual({ id: "c", scopeId: "root" });
    expect(pickBlock(root, "b", "a")).toEqual({ id: "g", scopeId: "root" });
    expect(pickBlock(root, "gone", "b1")).toEqual({ id: "g", scopeId: "root" });
  });

  it("selects nothing for the page itself or an id that is not in the tree", () => {
    expect(pickBlock(root, "root", "root")).toBeUndefined();
    expect(pickBlock(root, "g", "root")).toBeUndefined();
    expect(pickBlock(root, "root", "nope")).toBeUndefined();
  });

  it("always picks a block on the way to the target, whose parent is the returned scope", () => {
    fc.assert(
      fc.property(tree, fc.nat(), fc.nat(), (generated, pickTarget, pickScope) => {
        const t = relabel(generated);
        const all = nodesOf(t);
        const target = all[pickTarget % all.length] as TreeNode;
        const scope = all[pickScope % all.length] as TreeNode;
        const picked = pickBlock(t, scope.id, target.id);
        if (target === t) {
          expect(picked).toBeUndefined();
          return;
        }
        expect(picked).toBeDefined();
        if (!picked) return;
        expect(pathTo(t, target.id)?.map((n) => n.id)).toContain(picked.id);
        expect(parentOf(t, picked.id)?.id).toBe(picked.scopeId);
      }),
    );
  });
});
