// @vitest-environment node
import {
  type Device,
  type FlowNode,
  type FreeNode,
  type JsonValue,
  type PageData,
  resolveColor,
} from "@miditor/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Render, type Renderer, type RendererContext } from "./Render";

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
  new RegExp(`<div[^>]*data-miditor-id="${id}"[^>]*>`).exec(markup)?.[0] ?? "";

describe("<Render>", () => {
  const data = page(
    flow("root", "Page", [flow("box", "Container", [free("hero")]), flow("tail", "Container")]),
  );
  const markup = html(data);

  it("renders on the server with no window or document", () => {
    expect(typeof window).toBe("undefined");
    expect(markup).toContain('data-miditor-id="root"');
  });

  it("draws every node with its id and type, in tree order", () => {
    const order = ["root", "box", "hero", "tail"].map((id) =>
      markup.indexOf(`data-miditor-id="${id}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(tagOf(markup, "hero")).toContain('data-miditor-type="Container"');
  });

  it("nests the nodes the way the tree nests them", () => {
    const heroInBox =
      markup.indexOf('data-miditor-id="hero"') < markup.indexOf('data-miditor-id="tail"');
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
    expect(m.indexOf('data-miditor-id="under"')).toBeLessThan(m.indexOf('data-miditor-id="over"'));
    expect(tagOf(m, "under")).toContain("position:absolute");
    expect(tagOf(m, "over")).toContain("position:relative");
  });

  it("puts the class on a wrapper that has no reset, never on a node", () => {
    const withClass = html(data, "host-box");
    expect(withClass.startsWith('<div class="host-box" data-miditor-render=""')).toBe(true);
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
    expect(tagOf(m, "odd")).toContain("data-miditor-unknown");
    expect(tagOf(m, "odd")).toContain("position:relative");
    expect(m).not.toContain('data-miditor-id="inside"');
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
    expect(tagOf(m, "odd")).toContain("data-miditor-unknown");
    expect(m).not.toContain('data-miditor-id="inside"');
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
    expect(tag).not.toContain("data-miditor-unknown");
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
    expect(m).not.toContain('data-miditor-id="inside"');
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
    expect(layer).toBeGreaterThan(m.indexOf('data-miditor-id="s"'));
    expect(layer).toBeLessThan(m.indexOf('data-miditor-id="t"'));
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
    expect(tagOf(m, "g")).not.toContain("data-miditor-unknown");
    expect(tagOf(m, "g")).toContain("display:block");
    expect(tagOf(m, "g")).toContain("background-color:transparent");
    expect(m.indexOf('data-miditor-id="g"')).toBeLessThan(m.indexOf('data-miditor-id="a"'));
    expect(m.indexOf('data-miditor-id="a"')).toBeLessThan(m.indexOf('data-miditor-id="b"'));
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
    expect(markup.indexOf("<b")).toBeLessThan(markup.indexOf('data-miditor-id="in"'));
    expect(tagOf(markup, "h")).not.toContain("data-miditor-unknown");
  });

  it("leaves out the blocks inside when the function does not use them", () => {
    const data = page(flow("root", "Page", [heart("h", [free("in")])]));
    expect(draw(data, { Heart: Plain })).not.toContain('data-miditor-id="in"');
  });

  it("keeps a kind with no function an empty box", () => {
    const data = page(flow("root", "Page", [heart("h")]));
    expect(tagOf(draw(data, {}), "h")).toContain("data-miditor-unknown");
    expect(tagOf(draw(data, undefined), "h")).toContain("data-miditor-unknown");
  });

  it("never lets a function replace a built-in type", () => {
    const data = page(flow("root", "Page", [flow("c", "Container")]));
    expect(draw(data, { Container: Plain })).not.toContain("data-x");
  });

  it("ignores a name on the prototype", () => {
    const data = page(flow("root", "Page", [{ ...flow("t", "toString") }]));
    expect(tagOf(draw(data, {}), "t")).toContain("data-miditor-unknown");
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
    expect(markup).not.toContain('data-miditor-id="in"');
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

const Read: Renderer = ({ props, theme: t }) => (
  <b data-c={resolveColor(props.color, t) ?? "none"}>{props.color as string}</b>
);

describe("<Render> theme", () => {
  const themed = (theme: PageData["theme"]): PageData => ({
    ...page(
      flow("root", "Page", [
        {
          ...flow("t", "Text"),
          props: { text: "Hi", color: "@primary", font: "heading" },
          styles: { background: "@primary" },
        },
        { ...flow("h", "Heart"), props: { color: "@primary" } },
      ]),
    ),
    ...(theme ? { theme } : {}),
  });
  const theme = { colors: { primary: "#112233" }, fonts: { heading: "Playfair Display, serif" } };

  it("draws the colours and fonts of the theme", () => {
    const markup = html(themed(theme));
    const tag = tagOf(markup, "t");
    expect(tag).toContain("background-color:#112233");
    expect(tag).toContain("color:#112233");
    expect(tag).toContain("font-family:Playfair Display, serif");
  });

  it("fills a shape with a theme colour", () => {
    const data: PageData = {
      ...page(flow("root", "Page", [{ ...flow("s", "Shape"), props: { fill: "@primary" } }])),
      theme,
    };
    expect(html(data)).toContain("background-color:#112233");
  });

  it("changes every block when the theme changes", () => {
    const other = html(themed({ ...theme, colors: { primary: "#abcdef" } }));
    expect(tagOf(other, "t")).toContain("background-color:#abcdef");
    expect(tagOf(other, "t")).toContain("color:#abcdef");
  });

  it("draws the defaults when the page has no theme", () => {
    const tag = tagOf(html(themed(undefined)), "t");
    expect(tag).toContain("background-color:transparent");
    expect(tag).toContain("color:#111111");
  });

  it("gives the function of a host the theme, so it can read a colour of its own", () => {
    const markup = renderToStaticMarkup(
      <Render data={themed(theme)} renderers={{ Heart: Read }} />,
    );
    expect(markup).toContain('data-c="#112233"');
    const bare = renderToStaticMarkup(
      <Render data={themed(undefined)} renderers={{ Heart: Read }} />,
    );
    expect(bare).toContain('data-c="none"');
  });
});

const Show: Renderer = ({ metadata }) => <i data-m={JSON.stringify(metadata ?? "none")} />;

describe("<Render> metadata", () => {
  it("is optional in the context, so a host that builds one by hand (in its tests) still compiles", () => {
    const context: RendererContext = {
      props: {},
      device: "desktop",
      responsive: false,
      theme: undefined,
      children: null,
    };
    expect(Show(context)).toBeTruthy();
  });

  const withHeart: PageData = page(
    flow("root", "Page", [{ ...flow("g", "Container", [flow("h", "Heart")]) }]),
  );

  it("gives the function of a host the metadata of the page, for a block at any depth", () => {
    const markup = renderToStaticMarkup(
      <Render data={withHeart} renderers={{ Heart: Show }} metadata={{ currency: "VND" }} />,
    );
    expect(markup).toContain('data-m="{&quot;currency&quot;:&quot;VND&quot;}"');
  });

  it("is undefined when the host gave none, and is never written into the markup of built-in blocks", () => {
    const markup = renderToStaticMarkup(<Render data={withHeart} renderers={{ Heart: Show }} />);
    expect(markup).toContain('data-m="&quot;none&quot;"');
    const withMeta = renderToStaticMarkup(<Render data={withHeart} metadata={{ secret: "x" }} />);
    expect(withMeta).not.toContain("secret");
  });
});

describe("<Render> Button", () => {
  const button = (props: Record<string, JsonValue>, phoneProps?: Record<string, JsonValue>) =>
    page(
      flow("root", "Page", [
        { ...flow("b", "Button"), props, ...(phoneProps ? { phoneProps } : {}) },
      ]),
    );
  const live = (data: PageData, device?: Device) =>
    renderToStaticMarkup(<Render data={data} {...(device ? { device } : {})} />);
  const inert = (data: PageData) => renderToStaticMarkup(<Render data={data} links="inert" />);
  const anchor = (markup: string) => /<a[^>]*>/.exec(markup)?.[0] ?? "";

  it("draws its label in a link when the address is a safe one", () => {
    const markup = live(button({ label: "Go", href: "https://e.co/x" }));
    expect(anchor(markup)).toContain('href="https://e.co/x"');
    expect(anchor(markup)).toContain('rel="noopener noreferrer"');
    expect(markup).toContain(">Go</a>");
  });

  it("accepts a mail, a phone and a page anchor", () => {
    for (const href of ["mailto:a@b.co", "tel:+84901234567", "#top", "/contact"]) {
      expect(anchor(live(button({ label: "x", href }))), href).toContain(`href="${href}"`);
    }
  });

  it("draws the label with no link when there is no address or it is not safe", () => {
    for (const href of ["", "javascript:alert(1)", "//evil.com", "data:text/html,x", 5, null]) {
      const markup = live(button({ label: "Go", href }));
      expect(markup, String(href)).not.toContain("<a ");
      expect(markup, String(href)).toContain(">Go</span>");
    }
    expect(live(button({ label: "Go" }))).not.toContain("<a ");
  });

  it("draws no link at all when the links are inert, so pressing it goes nowhere", () => {
    const markup = inert(button({ label: "Go", href: "https://e.co/x" }));
    expect(markup).not.toContain("<a ");
    expect(markup).not.toContain("href=");
    expect(markup).toContain(">Go</span>");
  });

  it("is not a text: nothing inside it is drawn but the label", () => {
    const data = page(
      flow("root", "Page", [
        { ...flow("b", "Button", [free("in")]), props: { label: "Go", href: "" } },
      ]),
    );
    expect(live(data)).not.toContain('data-miditor-id="in"');
  });

  it("draws the label as nothing when it is not a string", () => {
    expect(live(button({ label: 5 }))).toContain("></span>");
  });

  it("is dark with white text and rounded by default", () => {
    const tag = tagOf(live(button({ label: "Go" })), "b");
    expect(tag).toContain("background-color:#111111");
    expect(tag).toContain("color:#ffffff");
    expect(tag).toContain("border-radius:8px");
    expect(tag).toContain("font-size:16px");
    expect(tag).toContain("font-weight:600");
  });

  it("takes its colours from the props, and from the theme when they name a colour of it", () => {
    const data: PageData = {
      ...button({ label: "Go", fill: "@brand", textColor: "#ff0000" }),
      theme: { colors: { brand: "#112233" } },
    };
    const tag = tagOf(live(data), "b");
    expect(tag).toContain("background-color:#112233");
    expect(tag).toContain("color:#ff0000");
    const missing = tagOf(live(button({ label: "Go", fill: "@nope" })), "b");
    expect(missing).toContain("background-color:#111111");
  });

  it("is rounded by its shape, and a radius of its own wins", () => {
    expect(tagOf(live(button({ shape: "pill" })), "b")).toContain("border-radius:9999px");
    expect(tagOf(live(button({ shape: "square" })), "b")).toContain("border-radius:0");
    expect(tagOf(live(button({ shape: "other" })), "b")).toContain("border-radius:8px");
    const styled = page(
      flow("root", "Page", [
        { ...flow("b", "Button"), props: { shape: "pill" }, styles: { borderRadius: 3 } },
      ]),
    );
    expect(tagOf(live(styled), "b")).toContain("border-radius:3px");
  });

  it("sets the text size between 8 and 72, shrinks it on a phone and keeps one set for the phone", () => {
    expect(tagOf(live(button({ size: 2 })), "b")).toContain("font-size:8px");
    expect(tagOf(live(button({ size: 500 })), "b")).toContain("font-size:72px");
    expect(tagOf(live(button({ size: "big" })), "b")).toContain("font-size:16px");
    expect(tagOf(live(button({ size: 40 }), "phone"), "b")).toContain("font-size:15.63px");
    expect(tagOf(live(button({ size: 40 }, { size: 20 }), "phone"), "b")).toContain(
      "font-size:20px",
    );
  });

  it("keeps its label on one line inside the box", () => {
    const markup = live(button({ label: "A very long label that cannot fit" }));
    expect(markup).toContain("white-space:nowrap");
    expect(markup).toContain("text-overflow:ellipsis");
    expect(tagOf(markup, "b")).toContain("overflow:hidden");
  });
});

const Seen: Renderer = ({ device, responsive }) => (
  <b data-d={device} data-r={String(responsive)} />
);

const Colour: Renderer = ({ props, device, responsive }) => (
  <b data-device={device} data-responsive={String(responsive)} data-c={String(props.color)} />
);

describe("<Render> responsive, a block that differs inside", () => {
  const draw = (data: PageData) => renderToStaticMarkup(<Render data={data} responsive={{}} />);
  const count = (markup: string, id: string) =>
    (markup.match(new RegExp(`data-miditor-id="${id}"`, "g")) ?? []).length;
  const one = (
    type: string,
    props: Record<string, JsonValue>,
    phoneProps?: Record<string, JsonValue>,
  ) =>
    page(
      flow("root", "Page", [{ ...flow("n", type), props, ...(phoneProps ? { phoneProps } : {}) }]),
    );

  it("draws a text with other words for the phone twice, each one hidden on the other screen", () => {
    const markup = draw(one("Text", { text: "Desktop words" }, { text: "Phone words" }));
    expect(count(markup, "n")).toBe(2);
    const desktop = tagOf(markup, "n");
    expect(desktop).toContain('data-miditor-screen="desktop"');
    expect(desktop).toContain("display:var(--m-hide-d, flex)");
    expect(desktop).toContain("--m-hide-d:var(--miditor-phone) none");
    expect(markup).toContain('data-miditor-screen="phone"');
    expect(markup).toContain("display:var(--m-show-p, none)");
    expect(markup).toContain("--m-show-p:var(--miditor-phone) flex");
    expect(markup.indexOf("Desktop words")).toBeLessThan(markup.indexOf("Phone words"));
  });

  it("draws each drawing in the placement of its own screen", () => {
    const markup = draw(one("Text", { text: "A", size: 40 }, { text: "B", size: 20 }));
    expect(markup).toContain("font-size:40px");
    expect(markup).toContain("font-size:20px");
    expect(markup).not.toContain("--m-font-size");
  });

  it("draws a button, a picture and a shape twice when what is inside them differs", () => {
    expect(count(draw(one("Button", { label: "Go" }, { label: "Tap" })), "n")).toBe(2);
    expect(count(draw(one("Button", { label: "Go", href: "/a" }, { href: "/b" })), "n")).toBe(2);
    expect(count(draw(one("Image", { src: "/a.png" }, { src: "/b.png" })), "n")).toBe(2);
    expect(count(draw(one("Image", { src: "/a.png", alt: "a" }, { alt: "b" })), "n")).toBe(2);
    expect(
      count(draw(one("Image", { src: "/a.png", fit: "cover" }, { fit: "contain" })), "n"),
    ).toBe(2);
    expect(count(draw(one("Shape", { fill: "#111111" }, { fill: "#222222" })), "n")).toBe(2);
    expect(count(draw(one("Shape", { shape: "ellipse" }, { shape: "triangle" })), "n")).toBe(2);
  });

  it("draws a block once when only what the style switches differs, or nothing does", () => {
    expect(count(draw(one("Text", { text: "A", size: 40 }, { size: 20 })), "n")).toBe(1);
    expect(
      count(draw(one("Text", { text: "A", color: "#000000" }, { color: "#ffffff" })), "n"),
    ).toBe(1);
    expect(
      count(draw(one("Button", { label: "Go", fill: "#111111" }, { fill: "#222222" })), "n"),
    ).toBe(1);
    expect(count(draw(one("Text", { text: "A" }, { text: "A" })), "n")).toBe(1);
    expect(count(draw(one("Text", { text: "A" })), "n")).toBe(1);
    expect(count(draw(one("Container", { x: 1 }, { x: 2 })), "n")).toBe(1);
  });

  it("draws a kind of the host twice when any prop differs, and tells it which screen each is", () => {
    const data = page(
      flow("root", "Page", [
        { ...flow("n", "Heart"), props: { color: "red" }, phoneProps: { color: "green" } },
      ]),
    );
    const markup = renderToStaticMarkup(
      <Render data={data} responsive={{}} renderers={{ Heart: Colour }} />,
    );
    expect(count(markup, "n")).toBe(2);
    expect(markup).toContain('data-device="desktop" data-responsive="true" data-c="red"');
    expect(markup).toContain('data-device="phone" data-responsive="true" data-c="green"');
  });

  it("draws a kind of the host once when its props are the same on both screens", () => {
    const data = page(
      flow("root", "Page", [
        { ...flow("n", "Heart"), props: { color: "red" }, phoneProps: { color: "red" } },
      ]),
    );
    const markup = renderToStaticMarkup(
      <Render data={data} responsive={{}} renderers={{ Heart: Colour }} />,
    );
    expect(count(markup, "n")).toBe(1);
  });

  it("takes a prop that is a list or an object to be the same when it holds the same things", () => {
    const data = page(
      flow("root", "Page", [
        {
          ...flow("n", "Heart"),
          props: { items: [1, { a: 2 }] },
          phoneProps: { items: [1, { a: 2 }] },
        },
      ]),
    );
    const markup = renderToStaticMarkup(
      <Render data={data} responsive={{}} renderers={{ Heart: Colour }} />,
    );
    expect(count(markup, "n")).toBe(1);
    const other = page(
      flow("root", "Page", [
        { ...flow("n", "Heart"), props: { items: [1] }, phoneProps: { items: [1, 2] } },
      ]),
    );
    expect(
      count(
        renderToStaticMarkup(<Render data={other} responsive={{}} renderers={{ Heart: Colour }} />),
        "n",
      ),
    ).toBe(2);
  });

  it("draws the blocks inside a block that is drawn twice, in each drawing", () => {
    const data = page(
      flow("root", "Page", [
        {
          ...flow("n", "Shape", [free("in")]),
          props: { fill: "#111111" },
          phoneProps: { fill: "#222222" },
        },
      ]),
    );
    expect(count(draw(data), "in")).toBe(2);
  });

  it("never draws a block twice on a page for one screen", () => {
    const data = one("Text", { text: "A" }, { text: "B" });
    expect(count(html(data), "n")).toBe(1);
    expect(count(html(data, undefined, "phone"), "n")).toBe(1);
    expect(html(data, undefined, "phone")).toContain(">B<");
  });
});

describe("<Render> responsive", () => {
  const draw = (
    data: PageData,
    responsive: Parameters<typeof Render>[0]["responsive"] = {},
    extra: { styleNonce?: string } = {},
  ) => renderToStaticMarkup(<Render data={data} responsive={responsive} {...extra} />);
  const withPhone = (): FreeNode => ({
    ...free("a"),
    phone: {
      x: { anchor: "start", offset: 4 },
      y: { anchor: "start", offset: 8 },
      w: { kind: "percent", v: 90 },
      h: { kind: "px", v: 50 },
      rotation: 0,
    },
  });

  it("makes the box around the page a container and brings the style sheet with it", () => {
    const markup = draw(page(flow("root", "Page")));
    expect(markup).toContain("container-type:inline-size");
    expect(markup).toContain("<style>@container (max-width: 640px)");
    expect(markup).toContain("--miditor-phone: ;");
  });

  it("can follow the window, and then the box is no container", () => {
    const markup = draw(page(flow("root", "Page")), { query: "viewport", breakpoint: 480 });
    expect(markup).not.toContain("container-type");
    expect(markup).toContain("@media (max-width: 480px)");
  });

  it("gives the style sheet a nonce when it is asked to", () => {
    expect(draw(page(flow("root", "Page")), {}, { styleNonce: "abc123" })).toContain(
      '<style nonce="abc123">',
    );
  });

  it("draws no style sheet and no variable for a page that is for one screen", () => {
    const markup = html(page(flow("root", "Page", [withPhone()])));
    expect(markup).not.toContain("<style");
    expect(markup).not.toContain("--m-");
    expect(markup).not.toContain("container-type");
  });

  it("places a block on the desktop and on the phone through variables", () => {
    const tag = tagOf(draw(page(flow("root", "Page", [{ ...withPhone(), id: "hero" }]))), "hero");
    expect(tag).toContain("left:var(--m-left-p, var(--m-left-d))");
    expect(tag).toContain("--m-left-d:");
    expect(tag).toContain("--m-left-p:var(--miditor-phone) 4px");
    expect(tag).toContain("--m-top-p:var(--miditor-phone) 8px");
    expect(tag).toContain("--m-width-p:var(--miditor-phone) 90%");
    expect(tag).toContain("--m-height-p:var(--miditor-phone) 50px");
  });

  it("writes what the two screens share as it is, and a block of the flow needs no variable", () => {
    const markup = draw(page(flow("root", "Page", [flow("box", "Container")])));
    expect(markup).not.toContain("--m-");
    expect(tagOf(markup, "box")).toContain("position:relative");
  });

  it("shrinks a block that nobody placed for the phone, like a phone does", () => {
    // One block placed by hand for the phone: the page is not drawn as a flow, and the other is shrunk.
    const tag = tagOf(draw(page(flow("root", "Page", [free("a"), withPhone()]))), "a");
    expect(tag).toContain("--m-right-d:20px");
    expect(tag).toContain("--m-right-p:var(--miditor-phone) 7.81px");
    expect(tag).toContain("--m-top-p:var(--miditor-phone) 15.63px");
    expect(tag).toContain("--m-height-d:96px");
    expect(tag).toContain("--m-height-p:var(--miditor-phone) 37.5px");
  });

  it("sets a text in its own size on each screen", () => {
    const data = page(
      flow("root", "Page", [
        { ...flow("t", "Text"), props: { text: "Hi", size: 40 }, phoneProps: { size: 20 } },
      ]),
    );
    const tag = tagOf(draw(data), "t");
    expect(tag).toContain("font-size:var(--m-font-size-p, var(--m-font-size-d))");
    expect(tag).toContain("--m-font-size-d:40px");
    expect(tag).toContain("--m-font-size-p:var(--miditor-phone) 20px");
  });

  it("shrinks the size of a text that has none of its own for the phone", () => {
    const data = page(
      flow("root", "Page", [{ ...flow("t", "Text"), props: { text: "Hi", size: 40 } }]),
    );
    const tag = tagOf(draw(data), "t");
    expect(tag).toContain("--m-font-size-d:40px");
    expect(tag).toContain("--m-font-size-p:var(--miditor-phone) 15.63px");
  });

  it("gives a button the colours it has on each screen", () => {
    const data = page(
      flow("root", "Page", [
        {
          ...flow("b", "Button"),
          props: { label: "Go", fill: "#111111" },
          phoneProps: { fill: "#ff0000" },
        },
      ]),
    );
    const tag = tagOf(draw(data), "b");
    expect(tag).toContain("--m-background-color-d:#111111");
    expect(tag).toContain("--m-background-color-p:var(--miditor-phone) #ff0000");
  });

  it("tells the function of a host that the page is responsive and that it draws for a desktop", () => {
    const data = page(flow("root", "Page", [flow("h", "Heart")]));
    const markup = renderToStaticMarkup(
      <Render data={data} responsive={{}} renderers={{ Heart: Seen }} />,
    );
    expect(markup).toContain('data-d="desktop"');
    expect(markup).toContain('data-r="true"');
    const plain = renderToStaticMarkup(
      <Render data={data} device="phone" renderers={{ Heart: Seen }} />,
    );
    expect(plain).toContain('data-d="phone"');
    expect(plain).toContain('data-r="false"');
  });

  it("is the same page as the desktop one wherever nothing is set for the phone", () => {
    const data = page(flow("root", "Page", [flow("box", "Container", [flow("in", "Container")])]));
    const strip = (markup: string) => markup.replace(/<style>.*?<\/style>/, "");
    const responsive = strip(draw(data));
    expect(responsive).toContain('data-miditor-id="in"');
    expect(strip(html(data))).not.toContain("--m-");
  });
});

describe("<Render> background picture", () => {
  const box = (styles: Record<string, unknown>) =>
    page(flow("root", "Page", [{ ...flow("b", "Container"), styles } as unknown as FlowNode]));

  it("puts the picture behind a block", () => {
    const tag = tagOf(
      html(box({ backgroundImage: "https://e.co/a.png", backgroundSize: "contain" })),
      "b",
    );
    expect(tag).toContain("background-image:url(&quot;https://e.co/a.png&quot;)");
    expect(tag).toContain("background-size:contain");
    expect(tag).toContain("background-position:center");
    expect(tag).toContain("background-repeat:no-repeat");
  });

  it("draws no picture for an address that is not a safe one", () => {
    const tag = tagOf(html(box({ backgroundImage: "javascript:alert(1)" })), "b");
    expect(tag).toContain("background-image:none");
    expect(tag).not.toContain("javascript");
  });

  it("is the same on a phone and a desktop in a responsive page, with no variable for it", () => {
    const markup = renderToStaticMarkup(
      <Render data={box({ backgroundImage: "/a.png" })} responsive={{}} />,
    );
    expect(tagOf(markup, "b")).toContain("background-image:url(&quot;/a.png&quot;)");
    expect(tagOf(markup, "b")).not.toContain("--m-background-image");
  });
});
