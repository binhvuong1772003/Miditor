import type { FreeNode, PageData, TreeNode } from "@miditor/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Render } from "./Render";

const at = (
  id: string,
  type: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<FreeNode> = {},
): FreeNode => ({
  id,
  type,
  props: type === "Text" ? { text: "Words", size: 40 } : type === "Button" ? { label: "Go" } : {},
  styles: {},
  children: [],
  position: { mode: "free", x: { anchor: "start", offset: x }, y: { anchor: "start", offset: y } },
  size: { w: { kind: "px", v: w }, h: { kind: "px", v: h } },
  rotation: 0,
  ...extra,
});

const page = (...children: TreeNode[]): PageData => ({
  schemaVersion: 1,
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {},
    position: { mode: "flow" },
    children,
  },
});

const phone = (data: PageData) => renderToStaticMarkup(<Render data={data} device="phone" />);
const tagOf = (markup: string, id: string) =>
  new RegExp(`<div[^>]*data-miditor-id="${id}"[^>]*>`).exec(markup)?.[0] ?? "";

const card = at("card", "Container", 48, 940, 272, 190, {
  children: [at("title", "Text", 24, 78, 224, 30), at("icon", "Shape", 24, 24, 36, 36)],
});
const flowed = page(
  at("nav-button", "Button", 788, 22, 124, 40),
  at("head", "Text", 100, 160, 760, 140),
  card,
  at("later", "Container", 48, 1200, 864, 1),
);

describe("a phone page with no placement of its own", () => {
  it("is drawn as a wrapping row, with a gap and room at the edge", () => {
    const root = tagOf(phone(flowed), "root");
    expect(root).toContain("display:flex");
    expect(root).toContain("flex-direction:row");
    expect(root).toContain("flex-wrap:wrap");
    expect(root).toContain("gap:16px");
    expect(root).toContain("padding:16px");
  });

  it("is as tall as a phone screen at least, and no taller than that when it is empty", () => {
    expect(tagOf(phone(flowed), "root")).toContain("min-height:812px");
  });

  it("puts the blocks in reading order, whatever the order in the data", () => {
    const markup = phone(flowed);
    const order = (id: string) => /[";\s]order:(\d+)/.exec(tagOf(markup, id))?.[1];
    expect(order("nav-button")).toBe("0");
    expect(order("head")).toBe("1");
    expect(order("card")).toBe("2");
    expect(order("later")).toBe("3");
  });

  it("gives a big block the full width and a small one its own, pushed to its side", () => {
    const markup = phone(flowed);
    expect(tagOf(markup, "head")).toContain("width:100%");
    expect(tagOf(markup, "head")).toContain("height:auto");
    expect(tagOf(markup, "nav-button")).toContain("width:124px");
    expect(tagOf(markup, "nav-button")).toContain("margin:0 0 0 auto");
    expect(tagOf(markup, "nav-button")).toContain("position:relative");
  });

  it("lets a box with blocks inside grow with them, and lays them out in a flow too", () => {
    const markup = phone(flowed);
    expect(tagOf(markup, "card")).toContain("height:auto");
    expect(tagOf(markup, "card")).toContain("flex-wrap:wrap");
    expect(tagOf(markup, "card")).toContain("padding:16px");
    expect(tagOf(markup, "title")).toContain("width:100%");
    expect(tagOf(markup, "icon")).toContain("width:36px");
  });

  it("keeps the height of a box with nothing in it", () => {
    expect(tagOf(phone(flowed), "later")).toContain("height:1px");
  });

  it("sets the size of a text to what a phone can hold, and not under what it was when small", () => {
    // 40 px on the desktop is 30 px on the phone; the page ratio would have made it 15.63.
    expect(tagOf(phone(flowed), "head")).toContain("font-size:30px");
    const small = page(at("t", "Text", 0, 0, 300, 40, { props: { text: "x", size: 14 } }));
    expect(tagOf(phone(small), "t")).toContain("font-size:14px");
  });

  it("keeps the text size that a person set for the phone", () => {
    const own = page(at("t", "Text", 0, 0, 300, 40, { phoneProps: { size: 22 } }));
    expect(tagOf(phone(own), "t")).toContain("font-size:22px");
  });

  it("draws the desktop as it was", () => {
    const markup = renderToStaticMarkup(<Render data={flowed} />);
    expect(tagOf(markup, "head")).toContain("position:absolute");
    expect(tagOf(markup, "head")).not.toMatch(/[";\s]order:/);
  });

  it("is two layouts through variables on a responsive page", () => {
    const markup = renderToStaticMarkup(<Render data={flowed} responsive={{}} />);
    expect(tagOf(markup, "head")).toContain("--m-order-p:var(--miditor-phone) 1");
    expect(tagOf(markup, "root")).toContain("--m-flex-wrap-p:var(--miditor-phone) wrap");
  });
});

describe("a phone page with a block placed by hand", () => {
  const hand = at("hand", "Container", 0, 0, 100, 100, {
    phone: {
      x: { anchor: "start", offset: 5 },
      y: { anchor: "start", offset: 6 },
      w: { kind: "px", v: 50 },
      h: { kind: "px", v: 60 },
      rotation: 0,
    },
  });
  const frozen = page(hand, at("other", "Text", 100, 160, 760, 140));

  it("is drawn as before: placed by constraints, shrunk, with no flow", () => {
    const markup = phone(frozen);
    expect(tagOf(markup, "root")).not.toContain("flex-wrap");
    expect(tagOf(markup, "hand")).toContain("left:5px");
    expect(tagOf(markup, "other")).toContain("position:absolute");
    expect(tagOf(markup, "other")).toContain("font-size:15.63px");
  });
});

describe("blocks that overlap on a phone drawn as a flow", () => {
  const cup = page(
    at("ring", "Shape", 360, 520, 240, 240),
    at("coffee", "Shape", 410, 570, 140, 140),
    at("after", "Text", 100, 800, 760, 60),
  );
  const wrapper = (markup: string) => /<div[^>]*data-miditor-cluster[^>]*>/.exec(markup)?.[0] ?? "";

  it("are one box with the shape they had, and their places in it in percent", () => {
    const markup = phone(cup);
    expect(wrapper(markup)).toContain("display:block");
    expect(wrapper(markup)).toContain("aspect-ratio:240 / 240");
    expect(wrapper(markup)).toContain("width:min(100%, 240px)");
    expect(tagOf(markup, "coffee")).toContain("position:absolute");
    expect(tagOf(markup, "coffee")).toContain("left:20.8333%");
    expect(tagOf(markup, "coffee")).toContain("width:58.3333%");
  });

  it("hold their blocks, and the next piece comes after the box", () => {
    const markup = phone(cup);
    expect(markup.indexOf('data-miditor-cluster=""')).toBeLessThan(
      markup.indexOf('data-miditor-id="ring"'),
    );
    const order = (id: string) => /[";\s]order:(\d+)/.exec(tagOf(markup, id))?.[1];
    expect(order("after")).toBe("1");
  });

  it("take no part on a desktop, which has no box for them at all", () => {
    expect(wrapper(renderToStaticMarkup(<Render data={cup} />))).toBe("");
  });

  it("are out of the way where a responsive page is not on a phone", () => {
    const markup = renderToStaticMarkup(<Render data={cup} responsive={{}} />);
    expect(wrapper(markup)).toContain("display:var(--m-cluster, contents)");
    expect(wrapper(markup)).toContain("--m-cluster:var(--miditor-phone) block");
  });
});
