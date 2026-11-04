import { builtInRegistry, emptyPage, newNode, type PageData, type TreeNode } from "@miditor/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "./Editor";

const withBlock = (): PageData => {
  const page = emptyPage();
  const node = newNode(builtInRegistry, "Text", "t1", { w: 680, h: 788 }) as TreeNode;
  return { ...page, root: { ...page.root, children: [node] } };
};
/** The part of the markup of the Undo button that says whether it is off. */
const undoOff = (html: string) =>
  /<button[^>]*title="Undo[^"]*"[^>]*>/.exec(html)?.[0]?.includes("disabled");

describe("opening the editor with the steps of an earlier session", () => {
  const present = withBlock();

  it("has nothing to undo without them", () => {
    expect(undoOff(renderToString(<Editor data={present} />))).toBe(true);
  });

  it("has a step to undo with them", () => {
    const html = renderToString(<Editor data={present} initialHistory={{ past: [emptyPage()] }} />);
    expect(undoOff(html)).toBe(false);
  });

  it("opens as if there were none, and warns once, when a step is not a page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = renderToString(
      <Editor data={present} initialHistory={{ past: [{ nope: 1 } as never] }} />,
    );
    expect(undoOff(html)).toBe(true);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("initialHistory"))).toHaveLength(1);
    warn.mockRestore();
  });
});
