import { builtInRegistry, emptyPage, newNode, type PageData, type TreeNode } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { parseHistory } from "./open-history";

const block = (id: string, text: string) => {
  const node = newNode(builtInRegistry, "Text", id, { w: 680, h: 788 }) as TreeNode;
  return { ...node, props: { ...node.props, text } };
};
const pageWith = (...blocks: object[]): PageData => {
  const page = emptyPage();
  return { ...page, root: { ...page.root, children: blocks as never } };
};
const json = (page: PageData): PageData => JSON.parse(JSON.stringify(page));

describe("parseHistory", () => {
  const present = pageWith(block("a", "now"), block("b", "same"));

  it("gives the steps back as pages, in order", () => {
    const past = [
      pageWith(block("a", "first")),
      pageWith(block("a", "second"), block("b", "same")),
    ];
    const future = [pageWith(block("a", "later"))];
    const got = parseHistory({ past, future }, present, 100);
    expect(got?.past.map((p) => p.root.children[0]?.props.text)).toEqual(["first", "second"]);
    expect(got?.future.map((p) => p.root.children[0]?.props.text)).toEqual(["later"]);
  });

  it("takes a missing past or future for none", () => {
    expect(parseHistory({}, present, 100)).toEqual({ past: [], future: [] });
    expect(parseHistory({ past: [] }, present, 100)).toEqual({ past: [], future: [] });
  });

  it("gives nothing, so the editor opens without the steps, when one page is not a page it can open", () => {
    const bad = { not: "a page" };
    expect(parseHistory({ past: [json(present), bad] }, present, 100)).toBeNull();
    expect(parseHistory({ future: [bad] }, present, 100)).toBeNull();
  });

  it("gives nothing for what is not a history at all", () => {
    for (const raw of [null, undefined, 3, "x", [], { past: "x" }, { past: {} }, { future: 4 }]) {
      expect(parseHistory(raw, present, 100)).toBeNull();
    }
  });

  it("keeps the newest steps of the past and the nearest of the future for the limit", () => {
    const steps = Array.from({ length: 6 }, (_, i) => pageWith(block("a", `v${i}`)));
    const got = parseHistory({ past: steps, future: steps }, present, 2);
    expect(got?.past.map((p) => p.root.children[0]?.props.text)).toEqual(["v4", "v5"]);
    expect(got?.future.map((p) => p.root.children[0]?.props.text)).toEqual(["v0", "v1"]);
  });

  it("shares the blocks that did not change with the present, as the steps of a session do", () => {
    // What a load from JSON gives: every page its own objects.
    const past = [json(pageWith(block("a", "before"), block("b", "same")))];
    const future = [json(pageWith(block("a", "after"), block("b", "same")))];
    const got = parseHistory({ past, future }, present, 100);
    const sameBlock = present.root.children[1];
    expect(got?.past[0]?.root.children[1]).toBe(sameBlock);
    expect(got?.future[0]?.root.children[1]).toBe(sameBlock);
    // A block that did change stays its own object.
    expect(got?.past[0]?.root.children[0]).not.toBe(present.root.children[0]);
    expect(got?.past[0]?.root.children[0]?.props.text).toBe("before");
  });

  it("does not change the pages it was given", () => {
    const past = [json(pageWith(block("a", "before"), block("b", "same")))];
    const copy = JSON.stringify(past);
    parseHistory({ past }, present, 100);
    expect(JSON.stringify(past)).toBe(copy);
  });
});
