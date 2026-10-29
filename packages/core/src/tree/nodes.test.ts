import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { withPhoneBox } from "./free-box";
import { findNode, insertNode, moveNode, nextId, removeNode, updateNode } from "./nodes";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const leaf = (id: string): FlowNode => ({
  id,
  type: "Text",
  props: {},
  styles: {},
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

describe("removeNode", () => {
  it("removes a leaf and a whole branch, and shares what it did not touch", () => {
    const withoutA2 = removeNode(root, "a2");
    expect(findNode(withoutA2, "a2")).toBeUndefined();
    expect(findNode(withoutA2, "a1")).toBe(a1);
    expect(findNode(withoutA2, "b")).toBe(b);
    const withoutA = removeNode(root, "a");
    expect(withoutA.children).toEqual([b]);
    expect(findNode(withoutA, "a1")).toBeUndefined();
  });

  it("leaves the original tree as it was", () => {
    removeNode(root, "a");
    expect(root.children).toEqual([a, b]);
  });

  it("returns the very same tree for the root and for an id that is not there", () => {
    expect(removeNode(root, "root")).toBe(root);
    expect(removeNode(root, "nope")).toBe(root);
  });

  it("removes exactly the subtree: every other id stays", () => {
    fc.assert(
      fc.property(tree, (generated) => {
        const t = relabel(generated);
        const ids = nodesOf(t).map((n) => n.id);
        for (const id of ids.slice(1)) {
          const gone = new Set(nodesOf(findNode(t, id) as TreeNode).map((n) => n.id));
          const left = nodesOf(removeNode(t, id)).map((n) => n.id);
          expect(left).toEqual(ids.filter((x) => !gone.has(x)));
        }
      }),
    );
  });
});

describe("nextId", () => {
  it("is n1 for a tree that has none, and skips the ones taken", () => {
    expect(nextId(root)).toBe("n1");
    expect(nextId(box("root", [leaf("n1"), box("n2", [leaf("n3")])]))).toBe("n4");
    expect(nextId(box("root", [leaf("n2")]))).toBe("n1");
  });

  it("is never an id of the tree, and the same tree gives the same id", () => {
    fc.assert(
      fc.property(tree, (generated) => {
        const t = relabel(generated);
        const id = nextId(t);
        expect(findNode(t, id)).toBeUndefined();
        expect(nextId(t)).toBe(id);
        // Once a node with that id is added, the next id is a different one.
        const grown = { ...t, children: [...t.children, { ...leaf(id) }] } as TreeNode;
        expect(nextId(grown)).not.toBe(id);
      }),
    );
  });
});

describe("insertNode", () => {
  const fresh = leaf("fresh");

  it("adds last by default, or at an index kept inside the list", () => {
    expect(insertNode(root, "root", fresh).children).toEqual([a, b, fresh]);
    expect(insertNode(root, "root", fresh, 0).children).toEqual([fresh, a, b]);
    expect(findNode(insertNode(root, "a", fresh, 1), "a")?.children).toEqual([a1, fresh, a2]);
    expect(insertNode(root, "root", fresh, 99).children).toEqual([a, b, fresh]);
    expect(insertNode(root, "root", fresh, -5).children).toEqual([fresh, a, b]);
    expect(insertNode(root, "root", fresh, Number.NaN).children).toEqual([a, b, fresh]);
  });

  it("shares what it did not touch and leaves the original as it was", () => {
    const next = insertNode(root, "a", fresh);
    expect(next.children[1]).toBe(b);
    expect(root.children).toEqual([a, b]);
  });

  it("returns the very same tree for a missing parent or an id already taken", () => {
    expect(insertNode(root, "nope", fresh)).toBe(root);
    expect(insertNode(root, "root", leaf("b"))).toBe(root);
    expect(insertNode(root, "root", box("fresh", [leaf("a1")]))).toBe(root);
  });

  it("is undone by removeNode", () => {
    fc.assert(
      fc.property(tree, (generated) => {
        const t = relabel(generated);
        const id = nextId(t);
        const parent = nodesOf(t).at(-1) as TreeNode;
        expect(removeNode(insertNode(t, parent.id, leaf(id)), id)).toEqual(t);
      }),
    );
  });
});

describe("moveNode", () => {
  const p = box("p", [leaf("p1"), leaf("p2")]);
  const q = box("q", []);
  const top = box("root", [p, q, leaf("c")]);
  const ids = (n: TreeNode | undefined) => n?.children.map((c) => c.id);

  it("moves a node, with what is under it, to another parent and shares the rest", () => {
    const out = moveNode(root, "a", "b");
    expect(ids(out)).toEqual(["b"]);
    expect(findNode(out, "a")).toBe(a);
    expect(ids(findNode(out, "b"))).toEqual(["a"]);
    expect(findNode(out, "a2")).toBe(a2);
    expect(ids(root)).toEqual(["a", "b"]);
  });

  it("moves into a parent at an index that counts the children without the moved node", () => {
    expect(ids(findNode(moveNode(top, "c", "p", 1), "p"))).toEqual(["p1", "c", "p2"]);
    expect(ids(findNode(moveNode(top, "c", "p", 0), "p"))).toEqual(["c", "p1", "p2"]);
    expect(ids(findNode(moveNode(top, "c", "p", 99), "p"))).toEqual(["p1", "p2", "c"]);
    expect(ids(findNode(moveNode(top, "c", "p", -3), "p"))).toEqual(["c", "p1", "p2"]);
    expect(ids(findNode(moveNode(top, "c", "p", Number.NaN), "p"))).toEqual(["p1", "p2", "c"]);
  });

  it("reorders inside one parent: the index is the place the node ends up at", () => {
    expect(ids(moveNode(top, "p", "root", 2))).toEqual(["q", "c", "p"]);
    expect(ids(moveNode(top, "c", "root", 0))).toEqual(["c", "p", "q"]);
    expect(ids(moveNode(top, "p", "root"))).toEqual(["q", "c", "p"]);
  });

  it("returns the very same tree when the node would stay where it is", () => {
    expect(moveNode(top, "p", "root", 0)).toBe(top);
    expect(moveNode(top, "q", "root", 1)).toBe(top);
    expect(moveNode(top, "c", "root", 2)).toBe(top);
    expect(moveNode(top, "c", "root", 99)).toBe(top);
    expect(moveNode(top, "c", "root")).toBe(top);
  });

  it("returns the very same tree for the root, a missing node or parent, itself and its own descendants", () => {
    expect(moveNode(top, "root", "p")).toBe(top);
    expect(moveNode(top, "nope", "p")).toBe(top);
    expect(moveNode(top, "c", "nope")).toBe(top);
    expect(moveNode(top, "p", "p")).toBe(top);
    expect(moveNode(root, "a", "a1")).toBe(root);
    expect(moveNode(root, "a", "a2")).toBe(root);
  });

  it("keeps every node, and moving back to the old place gives the old tree", () => {
    fc.assert(
      fc.property(tree, fc.nat(), fc.nat(), (generated, pickNode, pickParent) => {
        const t = relabel(generated);
        const all = nodesOf(t);
        const node = all[1 + (pickNode % Math.max(1, all.length - 1))];
        if (!node || all.length < 2) return;
        const inside = new Set(nodesOf(node).map((n) => n.id));
        const targets = all.filter((n) => !inside.has(n.id));
        const target = targets[pickParent % targets.length] as TreeNode;
        const oldParent = all.find((n) => n.children.some((c) => c.id === node.id)) as TreeNode;
        const oldIndex = oldParent.children.indexOf(node);
        const moved = moveNode(t, node.id, target.id, 0);
        expect(
          nodesOf(moved)
            .map((n) => n.id)
            .sort(),
        ).toEqual(all.map((n) => n.id).sort());
        expect(findNode(moved, target.id)?.children[0]).toBe(node);
        expect(moveNode(moved, node.id, oldParent.id, oldIndex)).toEqual(t);
      }),
    );
  });
});

describe("moveNode and the phone placement", () => {
  const byHand = {
    x: { anchor: "start", offset: 1 },
    y: { anchor: "start", offset: 2 },
    w: { kind: "px", v: 3 },
    h: { kind: "px", v: 4 },
    rotation: 0,
  } as const;
  const placed = (id: string, children: TreeNode[] = []): FreeNode =>
    withPhoneBox(
      {
        id,
        type: "Container",
        props: {},
        styles: {},
        position: { mode: "free", x: byHand.x, y: byHand.y },
        size: { w: byHand.w, h: byHand.h },
        rotation: 0,
        children,
      },
      byHand,
    );
  const inner = placed("inner");
  const top = box("root", [placed("a", [inner]), placed("b"), box("c", [])]);

  it("drops the placement of a block that gets another parent, but not of what is inside it", () => {
    const out = moveNode(top, "a", "c");
    expect((findNode(out, "a") as FreeNode).phone).toBeUndefined();
    expect("phone" in (findNode(out, "a") as FreeNode)).toBe(false);
    expect((findNode(out, "inner") as FreeNode).phone).toBe(byHand);
    expect((findNode(out, "b") as FreeNode).phone).toBe(byHand);
  });

  it("keeps the placement of a block that only changes place among its siblings", () => {
    const out = moveNode(top, "a", "root", 2);
    expect((findNode(out, "a") as FreeNode).phone).toBe(byHand);
  });

  it("moves a flow block as before", () => {
    const out = moveNode(top, "c", "a");
    expect(findNode(out, "c")).toBe(top.children[2]);
  });
});
