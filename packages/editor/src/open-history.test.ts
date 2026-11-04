import { builtInRegistry, emptyPage, newNode, type PageData, type TreeNode } from "@miditor/core";
import { describe, expect, it, vi } from "vitest";
import { openSteps, parseHistory } from "./open-history";

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

describe("parseHistory, sharing and checking", () => {
  const present = pageWith(block("a", "A"), block("b", "B"), block("c", "C"));

  it("shares the blocks that did not change by their id, also after a block was taken out near the top", () => {
    // The step before had one more block at the top: every block after it moved one place.
    const past = [
      json(pageWith(block("z", "Z"), block("a", "A"), block("b", "B"), block("c", "C"))),
    ];
    const got = parseHistory({ past }, present, 100);
    const kids = got?.past[0]?.root.children ?? [];
    expect(kids.map((k) => k.id)).toEqual(["z", "a", "b", "c"]);
    expect(kids[1]).toBe(present.root.children[0]);
    expect(kids[2]).toBe(present.root.children[1]);
    expect(kids[3]).toBe(present.root.children[2]);
  });

  it("keeps a key called __proto__ as the key it is, and does not change the prototype of anything", () => {
    const hostile = JSON.parse(
      '{"id":"b","type":"Text","props":{"text":"B","__proto__":{"x":1}},"styles":{},"children":[]}',
    );
    const node = block("b", "B");
    const step = json(pageWith(block("a", "A"), { ...node, props: hostile.props }));
    const got = parseHistory({ past: [step] }, present, 100);
    const props = got?.past[0]?.root.children[1]?.props as object;
    expect(Object.hasOwn(props, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(props)).toBe(Object.prototype);
    expect(JSON.stringify(props)).toBe(JSON.stringify(hostile.props));
    expect(({} as { x?: number }).x).toBeUndefined();
  });

  it("does not check the steps that are cut off by the limit", () => {
    const good = (t: string) => pageWith(block("a", t));
    const got = parseHistory({ past: [{ nope: 1 }, good("v1"), good("v2")] }, present, 2);
    expect(got?.past.map((p) => p.root.children[0]?.props.text)).toEqual(["v1", "v2"]);
    const future = parseHistory({ future: [good("f1"), good("f2"), { nope: 1 }] }, present, 2);
    expect(future?.future).toHaveLength(2);
  });
});

describe("openSteps", () => {
  const present = pageWith(block("a", "now"));

  it("is nothing, and says nothing, when the host gave no history", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(openSteps(undefined, present, 100)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("gives the steps when they can be opened", () => {
    const got = openSteps({ past: [pageWith(block("a", "before"))] }, present, 100);
    expect(got?.past).toHaveLength(1);
  });

  it("is nothing and warns in the console, naming `initialHistory`, when they cannot", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(openSteps({ past: [{ nope: true }] }, present, 100)).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("initialHistory");
    warn.mockRestore();
  });

  it("warns once for the same history, which React's StrictMode opens twice, and again for another", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = { past: [{ nope: true }] };
    openSteps(bad, present, 100);
    openSteps(bad, present, 100);
    expect(warn).toHaveBeenCalledTimes(1);
    openSteps({ past: [{ nope: true }] }, present, 100);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
