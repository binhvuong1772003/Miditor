// @vitest-environment node
import type { Device, FlowNode, FreeNode, JsonValue, PageData } from "@midito-kitchen/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Render, type Renderer } from "./Render";

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
const html = (data: PageData, className?: string, device?: Device) =>
  renderToStaticMarkup(
    <Render data={data} {...(className ? { className } : {})} {...(device ? { device } : {})} />,
  );

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

describe("<Render> on a phone", () => {
  const withPhone = (): FreeNode => ({
    ...free("hand"),
    phone: {
      x: { anchor: "start", offset: 11 },
      y: { anchor: "end", offset: 22 },
      w: { kind: "px", v: 33 },
      h: { kind: "px", v: 44 },
      rotation: 0,
    },
  });
  const data = page(flow("root", "Page", [free("auto"), withPhone()]));

  it("draws the desktop placement made smaller when nobody set one for the phone", () => {
    const tag = tagOf(html(data, undefined, "phone"), "auto");
    // 160 x 96 at the top 40 right 20 of a 960 px page, at 375 / 960.
    expect(tag).toContain("width:62.5px");
    expect(tag).toContain("height:37.5px");
    expect(tag).toContain("top:15.63px");
    expect(tag).toContain("right:7.81px");
  });

  it("draws the placement set by hand for the phone", () => {
    const tag = tagOf(html(data, undefined, "phone"), "hand");
    expect(tag).toContain("left:11px");
    expect(tag).toContain("bottom:22px");
    expect(tag).toContain("width:33px");
    expect(tag).toContain("height:44px");
  });

  it("draws the desktop placement on the desktop, also for a block that has a phone one", () => {
    for (const markup of [html(data), html(data, undefined, "desktop")]) {
      expect(tagOf(markup, "auto")).toContain("width:160px");
      expect(tagOf(markup, "hand")).toContain("width:160px");
      expect(tagOf(markup, "hand")).toContain("right:20px");
    }
  });

  it("takes anything but phone for the desktop", () => {
    const odd = renderToStaticMarkup(<Render data={data} device={"tablet" as Device} />);
    expect(tagOf(odd, "auto")).toContain("width:160px");
  });

  it("draws a flow block the same on both screens", () => {
    const flowPage = page(flow("root", "Page", [flow("f", "Container")]));
    expect(html(flowPage, undefined, "phone")).toBe(html(flowPage));
  });

  it("makes the words smaller with the page, but not below 12 px or above the desktop size", () => {
    const text = (id: string, size: number): FlowNode => ({
      ...flow(id, "Text"),
      props: { text: "Hi", size },
    });
    const m = html(
      page(flow("root", "Page", [text("big", 40), text("mid", 24), text("tiny", 10)])),
      undefined,
      "phone",
    );
    expect(tagOf(m, "big")).toContain("font-size:15.63px");
    expect(tagOf(m, "mid")).toContain("font-size:12px");
    expect(tagOf(m, "tiny")).toContain("font-size:10px");
    const d = html(page(flow("root", "Page", [text("mid", 24)])));
    expect(tagOf(d, "mid")).toContain("font-size:24px");
  });
});

const Probe: Renderer = ({ props, device, children }) => (
  <b data-c={String(props.color)} data-d={device}>
    {children}
  </b>
);
const Plain: Renderer = () => <i data-x="" />;

describe("<Render> renderers", () => {
  const heart = (id: string, children: (FlowNode | FreeNode)[] = []): FlowNode => ({
    ...flow(id, "Heart", children),
    props: { color: "#ff0000" },
  });
  const draw = (
    data: PageData,
    renderers: Parameters<typeof Render>[0]["renderers"],
    device?: Device,
  ) =>
    renderToStaticMarkup(
      <Render data={data} renderers={renderers} {...(device ? { device } : {})} />,
    );

  it("draws a host kind with its function, given the props, the device and the blocks inside", () => {
    const data = page(flow("root", "Page", [heart("h", [free("in")])]));
    const markup = draw(data, { Heart: Probe }, "phone");
    expect(markup).toContain('data-c="#ff0000"');
    expect(markup).toContain('data-d="phone"');
    expect(markup.indexOf("<b")).toBeLessThan(markup.indexOf('data-midito-id="in"'));
    expect(tagOf(markup, "h")).not.toContain("data-midito-unknown");
  });

  it("leaves out the blocks inside when the function does not use them", () => {
    const data = page(flow("root", "Page", [heart("h", [free("in")])]));
    expect(draw(data, { Heart: Plain })).not.toContain('data-midito-id="in"');
  });

  it("keeps a kind with no function an empty box", () => {
    const data = page(flow("root", "Page", [heart("h")]));
    expect(tagOf(draw(data, {}), "h")).toContain("data-midito-unknown");
    expect(tagOf(draw(data, undefined), "h")).toContain("data-midito-unknown");
  });

  it("never lets a function replace a built-in type", () => {
    const data = page(flow("root", "Page", [flow("c", "Container")]));
    expect(draw(data, { Container: Plain })).not.toContain("data-x");
  });

  it("ignores a name on the prototype", () => {
    const data = page(flow("root", "Page", [{ ...flow("t", "toString") }]));
    expect(tagOf(draw(data, {}), "t")).toContain("data-midito-unknown");
  });
});

describe("<Render> Image", () => {
  const image = (props: Record<string, JsonValue>, children: (FlowNode | FreeNode)[] = []) =>
    page(flow("root", "Page", [{ ...flow("pic", "Image", children), props }]));
  const picture = (markup: string) => /<img[^>]*>/.exec(markup)?.[0] ?? "";

  it("draws the picture filling its box, with its description and fit", () => {
    const tag = picture(html(image({ src: "https://e.co/a.png", alt: "A cat", fit: "contain" })));
    expect(tag).toContain('src="https://e.co/a.png"');
    expect(tag).toContain('alt="A cat"');
    expect(tag).toContain("object-fit:contain");
    expect(tag).toContain("width:100%");
    expect(tag).toContain("height:100%");
    expect(tag).toContain('draggable="false"');
  });

  it("falls back to cover for a fit it does not know, and to no description", () => {
    const tag = picture(html(image({ src: "/a.png", fit: "stretch" })));
    expect(tag).toContain("object-fit:cover");
    expect(tag).toContain('alt=""');
    expect(picture(html(image({ src: "/a.png", alt: 5 })))).toContain('alt=""');
  });

  it("draws a grey box and no img when there is no picture or the address is not safe", () => {
    for (const src of ["", "javascript:alert(1)", "data:image/svg+xml;base64,AAAA", 5, null]) {
      const markup = html(image({ src }));
      expect(markup, String(src)).not.toContain("<img");
      expect(markup, String(src)).toContain("background-color:#e2e8f0");
    }
    expect(html(image({}))).not.toContain("<img");
  });

  it("does not draw blocks inside a picture", () => {
    const markup = html(image({ src: "/a.png" }, [free("in")]));
    expect(markup).not.toContain('data-midito-id="in"');
  });

  it("clips the picture to its box", () => {
    expect(tagOf(html(image({ src: "/a.png" })), "pic")).toContain("overflow:hidden");
  });
});

describe("<Render> phone props", () => {
  const text = (props: Record<string, JsonValue>, phoneProps?: Record<string, JsonValue>) =>
    page(
      flow("root", "Page", [
        { ...flow("t", "Text"), props, ...(phoneProps ? { phoneProps } : {}) },
      ]),
    );
  const tag = (markup: string) => tagOf(markup, "t");

  it("draws the size set for the phone as it is, with no shrinking by the page ratio", () => {
    const data = text({ text: "Hi", size: 40 }, { size: 20 });
    expect(tag(html(data, undefined, "phone"))).toContain("font-size:20px");
    expect(tag(html(data, undefined, "desktop"))).toContain("font-size:40px");
    expect(tag(html(data))).toContain("font-size:40px");
  });

  it("still shrinks the desktop size on a phone when nothing was set for it", () => {
    const data = text({ text: "Hi", size: 40 });
    expect(tag(html(data, undefined, "phone"))).toContain("font-size:15.63px");
    const other = text({ text: "Hi", size: 40 }, { bold: true });
    expect(tag(html(other, undefined, "phone"))).toContain("font-size:15.63px");
    expect(tag(html(other, undefined, "phone"))).toContain("font-weight:700");
  });

  it("gives the props with the phone ones over them to the function of a host", () => {
    const data = page(
      flow("root", "Page", [
        { ...flow("h", "Heart"), props: { color: "#ff0000" }, phoneProps: { color: "#00ff00" } },
      ]),
    );
    const seen = (device: Device) =>
      renderToStaticMarkup(<Render data={data} device={device} renderers={{ Heart: Probe }} />);
    expect(seen("phone")).toContain('data-c="#00ff00"');
    expect(seen("desktop")).toContain('data-c="#ff0000"');
  });
});
