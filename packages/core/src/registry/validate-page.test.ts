import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nodesOf, relabel, tree } from "../position/arbitraries";
import { emptyPage } from "../tree/page";
import type { FlowNode, PageData, TreeNode } from "../tree/types";
import type { ComponentDef, Registry } from "./types";
import { validatePage } from "./validate-page";

const kind = (over: Partial<ComponentDef> = {}): ComponentDef => ({
  label: "Kind",
  defaultProps: {},
  fields: { text: { type: "text", label: "Text", maxLength: 3 } },
  canContain: false,
  ...over,
});
const registry: Registry = { Text: kind(), Shape: kind({ canContain: true, fields: {} }) };

const node = (id: string, type: string, children: TreeNode[] = [], props = {}): FlowNode => ({
  id,
  type,
  props,
  styles: {},
  position: { mode: "flow" },
  children,
});
const pageOf = (...children: TreeNode[]): PageData => {
  const page = emptyPage();
  return { ...page, root: { ...page.root, children } };
};

describe("validatePage", () => {
  it("has nothing to say about a good page, also an empty one", () => {
    expect(validatePage(registry, emptyPage())).toEqual([]);
    const page = pageOf(node("a", "Shape", [node("b", "Text", [], { text: "ok" })]));
    expect(validatePage(registry, page)).toEqual([]);
  });

  it("does not check the root: the page is not a block", () => {
    const page = emptyPage();
    const odd = { ...page, root: { ...page.root, type: "Nothing", props: { x: 1 } } };
    expect(validatePage({}, odd)).toEqual([]);
  });

  it("reports a kind the registry does not have, also one named like the prototype", () => {
    const page = pageOf(node("a", "Heart"), node("b", "constructor"), node("c", "__proto__"));
    expect(validatePage(registry, page)).toEqual([
      { id: "a", code: "unknown-type" },
      { id: "b", code: "unknown-type" },
      { id: "c", code: "unknown-type" },
    ]);
  });

  it("reports the props a kind refuses, one entry per prop, with the node id", () => {
    const page = pageOf(node("a", "Text", [], { text: "too long", colour: "red" }));
    expect(validatePage(registry, page)).toEqual([
      { id: "a", code: "props", key: "text", issue: "range" },
      { id: "a", code: "props", key: "colour", issue: "unknown" },
    ]);
  });

  it("reports blocks inside a kind that cannot contain", () => {
    const page = pageOf(node("a", "Text", [node("b", "Text")]));
    expect(validatePage(registry, page)).toEqual([{ id: "a", code: "cannot-contain" }]);
  });

  it("still checks what is inside a block of an unknown kind, but not that kind's own rules", () => {
    const page = pageOf(node("a", "Heart", [node("b", "Shape"), node("c", "Mystery")]));
    expect(validatePage(registry, page)).toEqual([
      { id: "a", code: "unknown-type" },
      { id: "c", code: "unknown-type" },
    ]);
  });

  it("lists the problems depth first, a block's own before the blocks inside it", () => {
    const page = pageOf(
      node("a", "Text", [node("a1", "Nope")], { text: "toolong" }),
      node("b", "Shape", [node("b1", "Text", [], { text: 1 })]),
    );
    expect(validatePage(registry, page).map((i) => `${i.id}:${i.code}`)).toEqual([
      "a:props",
      "a:cannot-contain",
      "a1:unknown-type",
      "b1:props",
    ]);
  });

  it("with an empty registry every block but the root is unknown, in tree order", () => {
    fc.assert(
      fc.property(tree, (generated) => {
        const root = relabel(generated);
        const page = { ...emptyPage(), root };
        const expected = nodesOf(root)
          .slice(1)
          .map((n) => ({ id: n.id, code: "unknown-type" }));
        expect(validatePage({}, page)).toEqual(expected);
      }),
    );
  });

  it("with every kind known and open to blocks inside, any tree is fine", () => {
    fc.assert(
      fc.property(tree, (generated) => {
        // The kinds below have no fields, so the props the generator makes are left out.
        const bare = (n: TreeNode): TreeNode => ({
          ...n,
          props: {},
          children: n.children.map(bare),
        });
        const root = bare(relabel(generated));
        const open: Registry = {};
        for (const n of nodesOf(root)) open[n.type] = kind({ canContain: true, fields: {} });
        expect(validatePage(open, { ...emptyPage(), root })).toEqual([]);
      }),
    );
  });

  describe("phone props", () => {
    const sized: Registry = {
      Text: kind({
        fields: {
          text: { type: "text", label: "Text", maxLength: 3 },
          size: { type: "number", label: "Size", min: 1, max: 9, perDevice: true },
        },
      }),
    };
    const withPhone = (phoneProps: Record<string, never | string | number>): PageData =>
      pageOf({ ...node("a", "Text"), phoneProps });

    it("accepts a value for a prop that is marked perDevice", () => {
      expect(validatePage(sized, withPhone({ size: 5 }))).toEqual([]);
    });

    it("refuses a prop that is not marked perDevice, or has no field", () => {
      expect(validatePage(sized, withPhone({ text: "ok", nope: 1 }))).toEqual([
        { id: "a", code: "phone-props", key: "text", issue: "not-per-device" },
        { id: "a", code: "phone-props", key: "nope", issue: "not-per-device" },
      ]);
      const own = JSON.parse('{"constructor": 1}');
      expect(validatePage(sized, withPhone(own))).toEqual([
        { id: "a", code: "phone-props", key: "constructor", issue: "not-per-device" },
      ]);
    });

    it("refuses a value its field refuses, for the same reason as props", () => {
      expect(validatePage(sized, withPhone({ size: 99 }))).toEqual([
        { id: "a", code: "phone-props", key: "size", issue: "range" },
      ]);
      expect(validatePage(sized, withPhone({ size: "big" }))).toEqual([
        { id: "a", code: "phone-props", key: "size", issue: "type" },
      ]);
    });

    it("has nothing to check a block of an unknown kind against", () => {
      const page = pageOf({ ...node("a", "Heart"), phoneProps: { size: 1 } });
      expect(validatePage(sized, page)).toEqual([{ id: "a", code: "unknown-type" }]);
    });
  });
});
