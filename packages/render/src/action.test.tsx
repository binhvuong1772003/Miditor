import { emptyPage, type PageData, type TreeNode } from "@miditor/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buttonOf } from "./kind-style";
import { Render } from "./Render";

const button = (props: Record<string, unknown>): TreeNode =>
  ({
    id: "b",
    type: "Button",
    props: { label: "Buy", ...props },
    styles: {},
    children: [],
    position: { mode: "flow" },
  }) as TreeNode;

const page = (node: TreeNode): PageData => {
  const base = emptyPage();
  return { ...base, root: { ...base.root, children: [node] } };
};

const noop = () => {};

describe("buttonOf", () => {
  it("reads a valid action and details, and drops anything else", () => {
    expect(buttonOf({ action: "add-to-cart", payload: { sku: "A1" } })).toMatchObject({
      action: "add-to-cart",
      payload: { sku: "A1" },
    });
    expect(buttonOf({ action: "alert(1)", payload: { a: { b: 1 } } })).toMatchObject({
      action: undefined,
      payload: {},
    });
  });
});

describe("a button with an action", () => {
  const data = page(button({ action: "buy", href: "https://example.com" }));

  it("is a real button when the host handles actions", () => {
    const html = renderToStaticMarkup(<Render data={data} onAction={noop} />);
    expect(html).toContain('<button type="button"');
    expect(html).not.toContain("<a ");
  });

  it("falls back to its link when nobody handles actions", () => {
    const html = renderToStaticMarkup(<Render data={data} />);
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("<button");
  });

  it("does nothing inside an editor", () => {
    const html = renderToStaticMarkup(<Render data={data} onAction={noop} links="inert" />);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("href=");
  });

  it("is a plain label when the action is not a valid name", () => {
    const bad = page(button({ action: "Buy Now!" }));
    expect(renderToStaticMarkup(<Render data={bad} onAction={noop} />)).not.toContain("<button");
  });
});
