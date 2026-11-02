import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { relabel, tree } from "../position/arbitraries";
import type { FreeBox } from "../position/types";
import { clipboardText, copyNodes, parseClipboard, pasteNodes } from "./clipboard";
import { withFreeBox, withPhoneBox } from "./free-box";
import { findNode, idsOf } from "./nodes";
import { emptyPage, isPageData, SCHEMA_VERSION } from "./page";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const at = (x: number, y: number, w = 100, h = 50): FreeBox => ({
  x: { anchor: "start", offset: x },
  y: { anchor: "start", offset: y },
  w: { kind: "px", v: w },
  h: { kind: "px", v: h },
  rotation: 0,
});
const placed = (id: string, b: FreeBox, children: TreeNode[] = []): FreeNode =>
  withFreeBox(
    {
      id,
      type: "Shape",
      props: { fill: "#cbd5e1" },
      styles: {},
      position: { mode: "free", x: b.x, y: b.y },
      size: { w: b.w, h: b.h },
      rotation: 0,
      children,
    },
    b,
  );
const flowNode = (id: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});
const ids = (n: TreeNode | undefined) => n?.children.map((c) => c.id);
const container = { w: 400, h: 300 };
const shift = { x: 16, y: 24 };

describe("copyNodes", () => {
  const inner = placed("inner", at(0, 0));
  const a = placed("a", at(10, 10), [inner]);
  const b = placed("b", at(20, 20));
  const c = placed("c", at(30, 30));
  const root = flowNode("root", [a, b, c]);

  it("gives the blocks in the order of the tree, whatever the order asked", () => {
    expect(copyNodes(root, ["c", "a"]).map((n) => n.id)).toEqual(["a", "c"]);
    expect(copyNodes(root, ["c", "a"])[0]).toBe(a);
  });

  it("leaves out a block that is inside another one in the list, the root and what is missing", () => {
    expect(copyNodes(root, ["inner", "a"]).map((n) => n.id)).toEqual(["a"]);
    expect(copyNodes(root, ["root", "b"]).map((n) => n.id)).toEqual(["b"]);
    expect(copyNodes(root, ["zz"])).toEqual([]);
    expect(copyNodes(root, [])).toEqual([]);
  });

  it("takes a block inside another one when the other is not in the list", () => {
    expect(copyNodes(root, ["inner", "b"]).map((n) => n.id)).toEqual(["inner", "b"]);
  });
});

describe("clipboardText and parseClipboard", () => {
  const nodes = [placed("a", at(10, 10), [placed("in", at(1, 1))]), placed("b", at(20, 20))];

  it("give the same blocks back", () => {
    expect(parseClipboard(clipboardText(nodes))).toEqual(nodes);
  });

  it("refuse text that is not from this editor", () => {
    const good = JSON.parse(clipboardText(nodes));
    const bad: unknown[] = [
      "not json {",
      "",
      "5",
      "null",
      "[]",
      { ...good, miditor: "page" },
      { ...good, miditor: undefined },
      { ...good, version: SCHEMA_VERSION + 1 },
      { ...good, version: undefined },
      { ...good, nodes: [] },
      { ...good, nodes: "x" },
      { ...good, nodes: [5] },
      { ...good, nodes: [{ ...nodes[0], id: 5 }] },
      { ...good, nodes: [nodes[0], nodes[0]] },
      { ...good, nodes: [{ ...nodes[0], id: "clipboard" }] },
    ];
    for (const value of bad) {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      expect(parseClipboard(text), text).toBeUndefined();
    }
  });

  it("refuse a block that is not a safe one, as a page would", () => {
    const evil = { ...placed("a", at(0, 0)), styles: { background: "url(javascript:alert(1))" } };
    expect(parseClipboard(clipboardText([evil]))).toBeUndefined();
  });

  it("turn any copied blocks of any tree into text that reads back the same", () => {
    fc.assert(
      fc.property(tree, (raw) => {
        const t = relabel(raw);
        const picked = t.children.slice(0, 3);
        if (picked.length === 0) return;
        expect(parseClipboard(clipboardText(picked))).toEqual(JSON.parse(JSON.stringify(picked)));
      }),
    );
  });
});

describe("pasteNodes", () => {
  const inner = placed("inner", at(5, 5, 10, 10));
  const a = placed("a", at(10, 20), [inner]);
  const b = placed("b", at(200, 100));
  const root = flowNode("root", [a, b]);
  const options = { shift, container };

  it("pastes copies after the other children with new ids, and gives the ids of the blocks", () => {
    const out = pasteNodes(root, "root", [a], options);
    expect(ids(out.root)).toEqual(["a", "b", "n1"]);
    expect(out.ids).toEqual(["n1"]);
    expect(ids(findNode(out.root, "n1"))).toEqual(["n2"]);
    expect(out.root.children[0]).toBe(a);
    expect(root.children).toHaveLength(2);
  });

  it("keeps the order of the blocks and puts them at the index", () => {
    const out = pasteNodes(root, "root", [a, b], { ...options, index: 1 });
    expect(ids(out.root)).toEqual(["a", "n1", "n3", "b"]);
    expect(out.ids).toEqual(["n1", "n3"]);
    expect(ids(pasteNodes(root, "root", [b], { ...options, index: -5 }).root)).toEqual([
      "n1",
      "a",
      "b",
    ]);
    expect(ids(pasteNodes(root, "root", [b], { ...options, index: -1 }).root)).toEqual([
      "n1",
      "a",
      "b",
    ]);
    expect(ids(pasteNodes(root, "root", [b], { ...options, index: 99 }).root)).toEqual([
      "a",
      "b",
      "n1",
    ]);
    expect(ids(pasteNodes(root, "root", [b], { ...options, index: 0.5 }).root)).toEqual([
      "a",
      "b",
      "n1",
    ]);
  });

  it("works for blocks whose ids are taken, and skips the ids in use", () => {
    const busy = flowNode("root", [placed("n1", at(0, 0), [placed("n3", at(0, 0))])]);
    const out = pasteNodes(busy, "root", [busy.children[0] as TreeNode], options);
    expect(out.ids).toEqual(["n2"]);
    expect(ids(findNode(out.root, "n2"))).toEqual(["n4"]);
  });

  it("pastes into any block of the tree", () => {
    const out = pasteNodes(root, "a", [b], options);
    expect(ids(findNode(out.root, "a"))).toEqual(["inner", "n1"]);
  });

  it("shifts a free block and drops its phone placement; a block of the flow is not moved", () => {
    const withPhone = withPhoneBox(a, at(1, 2, 3, 4));
    const out = pasteNodes(root, "root", [withPhone, flowNode("f")], options);
    const copy = findNode(out.root, out.ids[0] as string) as FreeNode;
    expect(copy.position.x).toEqual({ anchor: "start", offset: 26 });
    expect(copy.position.y).toEqual({ anchor: "start", offset: 44 });
    expect(copy.phone).toBeUndefined();
    expect(findNode(out.root, out.ids[1] as string)?.position).toEqual({ mode: "flow" });
  });

  it("returns the same tree and no ids for a missing parent or nothing to paste", () => {
    const missing = pasteNodes(root, "zz", [a], options);
    expect(missing.root).toBe(root);
    expect(missing.ids).toEqual([]);
    const nothing = pasteNodes(root, "root", [], options);
    expect(nothing.root).toBe(root);
    expect(nothing.ids).toEqual([]);
  });

  it("keeps a page valid with unique ids, for any copied blocks", () => {
    fc.assert(
      fc.property(tree, fc.nat(3), (raw, count) => {
        const t = relabel(raw);
        // Only pages that were valid to begin with can be expected to stay valid.
        fc.pre(isPageData({ ...emptyPage(), root: t }));
        const copied = copyNodes(
          t,
          t.children.slice(0, count + 1).map((n) => n.id),
        );
        const out = pasteNodes(t, t.id, copied, options);
        expect(idsOf(out.root).size).toBe(
          idsOf(t).size + copied.reduce((n, c) => n + idsOf(c).size, 0),
        );
        expect(isPageData({ ...emptyPage(), root: out.root })).toBe(true);
        expect(out.ids).toHaveLength(copied.length);
        for (const id of out.ids) expect(idsOf(t).has(id)).toBe(false);
      }),
    );
  });
});
