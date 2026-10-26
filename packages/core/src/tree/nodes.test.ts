import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { findNode, updateNode } from "./nodes";
import type { FlowNode, TreeNode } from "./types";

const leaf = (id: string): FlowNode => ({
  id,
  type: "Text",
  props: {},
  position: { mode: "flow" },
  children: [],
});
const box = (id: string, children: TreeNode[]): FlowNode => ({
  ...leaf(id),
  type: "Container",
  children,
});

//   root
//   ├─ a
//   │  ├─ a1
//   │  └─ a2
//   └─ b
const a1 = leaf("a1");
const a2 = leaf("a2");
const a = box("a", [a1, a2]);
const b = leaf("b");
const root = box("root", [a, b]);

const rename = (node: TreeNode): TreeNode => ({ ...node, type: "Renamed" });

describe("findNode", () => {
  it("finds the root, a child and a deep node", () => {
    expect(findNode(root, "root")).toBe(root);
    expect(findNode(root, "b")).toBe(b);
    expect(findNode(root, "a2")).toBe(a2);
  });

  it("returns undefined for an unknown id", () => {
    expect(findNode(root, "nope")).toBeUndefined();
  });

  it("searches depth first, so a node of an earlier branch wins", () => {
    const twin = box("t", [leaf("same"), box("u", [leaf("same")])]);
    expect(findNode(twin, "same")).toBe(twin.children[0]);
  });
});

describe("updateNode", () => {
  it("replaces the node and keeps the order of the children", () => {
    const out = updateNode(root, "a1", rename);
    expect(findNode(out, "a1")?.type).toBe("Renamed");
    expect(out.children.map((c) => c.id)).toEqual(["a", "b"]);
    expect(out.children[0]?.children.map((c) => c.id)).toEqual(["a1", "a2"]);
  });

  it("copies only the nodes on the way down and shares everything else", () => {
    const out = updateNode(root, "a1", rename);
    expect(out).not.toBe(root);
    expect(out.children[0]).not.toBe(a);
    expect(out.children[1]).toBe(b);
    expect(out.children[0]?.children[1]).toBe(a2);
  });

  it("does not modify the tree it was given", () => {
    updateNode(root, "a1", rename);
    expect(a1.type).toBe("Text");
    expect(root.children[0]).toBe(a);
    expect(a.children[0]).toBe(a1);
  });

  it("can replace the root itself", () => {
    expect(updateNode(root, "root", rename).type).toBe("Renamed");
  });

  it("returns the very same tree for an unknown id", () => {
    expect(updateNode(root, "nope", rename)).toBe(root);
  });

  it("returns the very same tree when the update changes nothing", () => {
    expect(updateNode(root, "a2", (n) => n)).toBe(root);
  });

  it("hands the node it found to the update", () => {
    const seen: TreeNode[] = [];
    updateNode(root, "a2", (n) => {
      seen.push(n);
      return n;
    });
    expect(seen).toEqual([a2]);
    expect(seen[0]).toBe(a2);
  });

  it("accepts a deeply frozen tree", () => {
    const deepFreeze = <T extends object>(o: T): T => {
      for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
      return Object.freeze(o);
    };
    expect(() => updateNode(deepFreeze(structuredClone(root)), "a2", rename)).not.toThrow();
  });
});

describe("findNode and updateNode, properties", () => {
  const idsOf = (n: TreeNode) => nodesOf(n).map((x) => x.id);

  it("finds every node of a tree by its id", () => {
    fc.assert(
      fc.property(tree, (t) => {
        const labelled = relabel(t);
        return nodesOf(labelled).every((n) => findNode(labelled, n.id) === n);
      }),
    );
  });

  it("changes exactly one node and shares every node off the path", () => {
    fc.assert(
      fc.property(tree, fc.nat(), (t, pick) => {
        const labelled = relabel(t);
        const all = nodesOf(labelled);
        const target = all[pick % all.length] as TreeNode;
        const out = updateNode(labelled, target.id, rename);
        // Same shape and the same order of ids.
        if (idsOf(out).join() !== idsOf(labelled).join()) return false;
        // Exactly one node was renamed, and it is the target.
        const renamed = nodesOf(out).filter((n) => n.type === "Renamed");
        if (renamed.length !== 1 || renamed[0]?.id !== target.id) return false;
        // The target and the nodes above it are new objects; every other node is the very same object.
        const path = new Set(all.filter((n) => findNode(n, target.id)).map((n) => n.id));
        return nodesOf(out).every((n, i) => (path.has(n.id) ? n !== all[i] : n === all[i]));
      }),
      { numRuns: 500 },
    );
  });

  it("gives the same tree back when the update changes nothing", () => {
    fc.assert(
      fc.property(tree, fc.nat(), (t, pick) => {
        const labelled = relabel(t);
        const all = nodesOf(labelled);
        const target = all[pick % all.length] as TreeNode;
        return updateNode(labelled, target.id, (n) => n) === labelled;
      }),
    );
  });
});
