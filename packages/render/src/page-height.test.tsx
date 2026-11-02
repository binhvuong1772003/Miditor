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
