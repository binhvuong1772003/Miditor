// @vitest-environment node
import type { FlowNode, FreeNode, PageData } from "@midito-kitchen/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Render } from "./Render";

const flow = (id: string, type: string, children: (FlowNode | FreeNode)[] = []): FlowNode => ({
  id,
  type,
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});

const free = (id: string): FreeNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "free", x: { anchor: "end", offset: 20 }, y: { anchor: "start", offset: 40 } },
  size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
  rotation: 0,
  children: [],
});

const page = (root: FlowNode): PageData => ({ schemaVersion: 1, root });
const html = (data: PageData, className?: string) =>
  renderToStaticMarkup(<Render data={data} {...(className ? { className } : {})} />);

/** The opening tag of the element for this node id. */
const tagOf = (markup: string, id: string) =>
  new RegExp(`<div[^>]*data-midito-id="${id}"[^>]*>`).exec(markup)?.[0] ?? "";

describe("<Render>", () => {
  const data = page(
    flow("root", "Page", [flow("box", "Container", [free("hero")]), flow("tail", "Container")]),
  );
  const markup = html(data);

  it("renders on the server with no window or document", () => {
    expect(typeof window).toBe("undefined");
    expect(markup).toContain('data-midito-id="root"');
  });

  it("draws every node with its id and type, in tree order", () => {
    const order = ["root", "box", "hero", "tail"].map((id) =>
      markup.indexOf(`data-midito-id="${id}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(tagOf(markup, "hero")).toContain('data-midito-type="Container"');
  });

  it("nests the nodes the way the tree nests them", () => {
    const heroInBox =
      markup.indexOf('data-midito-id="hero"') < markup.indexOf('data-midito-id="tail"');
    expect(heroInBox).toBe(true);
    expect(markup.match(/<div/g)?.length).toBe(5); // wrapper + four nodes
    expect(markup.match(/<\/div>/g)?.length).toBe(5);
  });

  it("puts `all` first in the style of every node: initial on the root, revert on the rest", () => {
    expect(tagOf(markup, "root")).toMatch(/style="all:initial;margin:0;/);
    for (const id of ["box", "hero", "tail"]) {
      expect(tagOf(markup, id)).toMatch(/style="all:revert;margin:0;/);
    }
  });

  it("places a free node with the CSS from cssFor", () => {
    const tag = tagOf(markup, "hero");
    expect(tag).toContain("position:absolute");
    expect(tag).toContain("right:20px");
    expect(tag).toContain("width:160px");
    expect(tag).toContain("top:40px");
    expect(tag).toContain("height:96px");
  });

  it("gives only the root the page typography and the room to grow", () => {
    const root = tagOf(markup, "root");
    expect(root).toContain("font-size:16px");
    expect(root).toContain("flex-grow:1");
    for (const id of ["box", "hero", "tail"]) {
      expect(tagOf(markup, id)).not.toContain("font-size");
      expect(tagOf(markup, id)).not.toContain("flex-grow");
    }
  });

  it("makes a flow node relative", () => {
    expect(tagOf(markup, "box")).toContain("position:relative");
    expect(tagOf(markup, "tail")).toContain("position:relative");
  });

  it("keeps a free node before a flow node in the markup, so the later one paints on top", () => {
    const data2 = page(flow("root", "Page", [free("under"), flow("over", "Container")]));
    const m = html(data2);
    expect(m.indexOf('data-midito-id="under"')).toBeLessThan(m.indexOf('data-midito-id="over"'));
    expect(tagOf(m, "under")).toContain("position:absolute");
    expect(tagOf(m, "over")).toContain("position:relative");
  });

  it("puts the class on a wrapper that has no reset, never on a node", () => {
    const withClass = html(data, "host-box");
    expect(withClass.startsWith('<div class="host-box" data-midito-render=""')).toBe(true);
    expect(withClass.match(/host-box/g)?.length).toBe(1);
    // The only `class` attribute in the whole output is the wrapper's.
    expect(withClass.match(/class=/g)?.length).toBe(1);
    const wrapper = /^<div[^>]*>/.exec(withClass)?.[0] ?? "";
    expect(wrapper).not.toContain("all:revert");
    // A column, so the root can fill it.
    expect(wrapper).toContain("display:flex;flex-direction:column");
  });

  it("draws a type nobody registered as an empty box and ignores its children", () => {
    const m = html(
      page(flow("root", "Page", [flow("odd", "Mystery", [flow("inside", "Container")])])),
    );
    expect(tagOf(m, "odd")).toContain("data-midito-unknown");
    expect(tagOf(m, "odd")).toContain("position:relative");
    expect(m).not.toContain('data-midito-id="inside"');
  });

  it("draws the background colour of a node, and only a stored colour", () => {
    const colored = free("tinted");
    const m = html(
      page(
        flow("root", "Page", [
          { ...colored, styles: { background: "#ff0000" } },
          { ...free("evil"), styles: { background: "#fff;position:fixed" } },
          flow("plain", "Container"),
        ]),
      ),
    );
    expect(tagOf(m, "tinted")).toContain("background-color:#ff0000");
    expect(tagOf(m, "evil")).toContain("background-color:transparent");
    expect(m).not.toContain("position:fixed");
    expect(tagOf(m, "plain")).toContain("background-color:transparent");
  });

  it("draws a border and rounded corners, and always writes the keys", () => {
    const m = html(
      page(
        flow("root", "Page", [
          {
            ...free("framed"),
            styles: { borderWidth: 2, borderColor: "#112233", borderRadius: 6 },
          },
          flow("plain", "Container"),
        ]),
      ),
    );
    expect(tagOf(m, "framed")).toContain("border:2px solid #112233");
    expect(tagOf(m, "framed")).toContain("border-radius:6px");
    expect(tagOf(m, "plain")).toContain("border:0");
    expect(tagOf(m, "plain")).toContain("border-radius:0");
  });

  it("treats a type named like an inherited object property as unregistered", () => {
    const m = html(
      page(flow("root", "Page", [flow("odd", "constructor", [flow("inside", "Container")])])),
    );
    expect(tagOf(m, "odd")).toContain("data-midito-unknown");
    expect(m).not.toContain('data-midito-id="inside"');
  });

  it("escapes what it prints into attributes", () => {
    const m = html(page(flow("root", "Page", [flow('a"b<c', "Container")])));
    expect(m).not.toContain('a"b<c');
    expect(m).toContain("a&quot;b&lt;c");
  });
});

describe("<Render> Text and Shape", () => {
  const text = (id: string, props: FlowNode["props"], children: FlowNode[] = []): FlowNode => ({
    ...flow(id, "Text", children),
    props,
  });
  const shape = (id: string, props: FlowNode["props"], children: FlowNode[] = []): FlowNode => ({
    ...flow(id, "Shape", children),
    props,
  });

  it("draws a text with its words, size, colour, weight and alignment", () => {
    const m = html(
      page(
        flow("root", "Page", [
          text("t", { text: "Hello", size: 30, color: "#ff0000", bold: true, align: "center" }),
        ]),
      ),
    );
    const tag = tagOf(m, "t");
    expect(tag).toContain("font-size:30px");
    expect(tag).toContain("color:#ff0000");
    expect(tag).toContain("font-weight:700");
    expect(tag).toContain("text-align:center");
    expect(tag).toContain("display:flex");
    expect(tag).toContain("align-items:center");
    expect(tag).toContain("justify-content:center");
    expect(tag).not.toContain("data-midito-unknown");
    expect(m).toContain(">Hello</div>");
  });

  it("escapes the words of a text and keeps the line breaks", () => {
    const m = html(page(flow("root", "Page", [text("t", { text: "<b>x</b>\ny" })])));
    expect(m).toContain("&lt;b&gt;x&lt;/b&gt;\ny");
    expect(m).not.toContain("<b>");
    expect(tagOf(m, "t")).toContain("white-space:pre-wrap");
  });

  it("does not draw the blocks inside a text", () => {
    const m = html(
      page(flow("root", "Page", [text("t", { text: "Hi" }, [flow("inside", "Container")])])),
    );
    expect(m).not.toContain('data-midito-id="inside"');
  });

  it("draws a shape as a layer under the blocks inside it", () => {
    const m = html(
      page(
        flow("root", "Page", [
          shape("s", { shape: "ellipse", fill: "#00ff00" }, [text("t", { text: "Hi" })]),
        ]),
      ),
    );
    const layer = m.indexOf('aria-hidden="true"');
    expect(layer).toBeGreaterThan(m.indexOf('data-midito-id="s"'));
    expect(layer).toBeLessThan(m.indexOf('data-midito-id="t"'));
    expect(m).toContain("border-radius:50%");
    expect(m).toContain("background-color:#00ff00");
    expect(m).toContain("pointer-events:none");
  });

  it("clips a triangle on its layer only, so the blocks inside are not clipped", () => {
    const m = html(page(flow("root", "Page", [shape("s", { shape: "triangle" })])));
    expect(m).toContain("clip-path:polygon(50% 0, 100% 100%, 0 100%)");
    expect(tagOf(m, "s")).not.toContain("clip-path");
  });

  it("draws bad props as the defaults and does not throw", () => {
    const m = html(
      page(
        flow("root", "Page", [
          text("t", { text: 1, size: "x", color: 5 }),
          shape("s", { shape: 7, fill: "nope" }),
        ]),
      ),
    );
    expect(tagOf(m, "t")).toContain("font-size:24px");
    expect(m).toContain("background-color:#cbd5e1");
  });
});

describe("<Render> Group", () => {
  it("draws a group as a box that holds its blocks, with nothing of its own", () => {
    const m = html(
      page(
        flow("root", "Page", [flow("g", "Group", [flow("a", "Container"), flow("b", "Shape")])]),
      ),
    );
    expect(tagOf(m, "g")).not.toContain("data-midito-unknown");
    expect(tagOf(m, "g")).toContain("display:block");
    expect(tagOf(m, "g")).toContain("background-color:transparent");
    expect(m.indexOf('data-midito-id="g"')).toBeLessThan(m.indexOf('data-midito-id="a"'));
    expect(m.indexOf('data-midito-id="a"')).toBeLessThan(m.indexOf('data-midito-id="b"'));
    // The only layer is the one the shape draws, and the group has none.
    expect(m.match(/aria-hidden/g)).toHaveLength(1);
  });
});
