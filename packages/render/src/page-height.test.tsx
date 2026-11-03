import { emptyPage, type PageData } from "@miditor/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Render } from "./Render";

const withHeight = (minHeight: unknown): PageData => {
  const base = emptyPage();
  return { ...base, root: { ...base.root, styles: { minHeight } as never } };
};

describe("the height of a page", () => {
  it("sets the minimum height of the root when it is valid", () => {
    expect(renderToStaticMarkup(<Render data={withHeight(1200)} />)).toContain("min-height:1200px");
    expect(renderToStaticMarkup(<Render data={withHeight(1200)} />)).toContain("flex-grow:0");
  });
  it("writes nothing for a page without one, or with one that is not valid", () => {
    expect(renderToStaticMarkup(<Render data={emptyPage()} />)).not.toContain("min-height");
    for (const bad of [10, 99999, 640.5, "640px", null]) {
      expect(renderToStaticMarkup(<Render data={withHeight(bad)} />)).not.toContain("min-height");
    }
  });
});

describe("the height of a page on a phone", () => {
  const free = (styles: object = {}): PageData => {
    const base = emptyPage();
    const box = {
      id: "a",
      type: "Container",
      props: {},
      styles: {},
      children: [],
      position: {
        mode: "free" as const,
        x: { anchor: "start" as const, offset: 0 },
        y: { anchor: "start" as const, offset: 0 },
      },
      size: { w: { kind: "px" as const, v: 600 }, h: { kind: "px" as const, v: 600 } },
      rotation: 0,
    };
    return { ...base, root: { ...base.root, styles: styles as never, children: [box] } };
  };

  it("fits the blocks as they are on the phone, whatever the desktop page height is", () => {
    // 600 px of desktop is 234.38 on a phone: the page is 235 and the gap of 16 px.
    const markup = renderToStaticMarkup(<Render data={free({ minHeight: 1200 })} device="phone" />);
    expect(markup).toContain("min-height:251px");
    expect(markup).not.toContain("min-height:1200px");
  });

  it("uses the height set for the phone", () => {
    const markup = renderToStaticMarkup(
      <Render data={free({ phoneMinHeight: 812 })} device="phone" />,
    );
    expect(markup).toContain("min-height:812px");
  });

  it("leaves the desktop page as it was", () => {
    const markup = renderToStaticMarkup(<Render data={free({ phoneMinHeight: 812 })} />);
    expect(markup).not.toContain("min-height");
  });

  it("gives a responsive page both heights", () => {
    const markup = renderToStaticMarkup(
      <Render data={free({ minHeight: 1200 })} responsive={{}} />,
    );
    expect(markup).toContain("1200px");
    expect(markup).toContain("251px");
  });
});
