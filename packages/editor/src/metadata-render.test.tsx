import {
  builtInRegistry,
  emptyPage,
  insertNode,
  newNode,
  type Registry,
  type TreeNode,
} from "@miditor/core";
import type { Renderer } from "@miditor/render";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Editor } from "./Editor";

const components: Registry = {
  Mark: {
    label: "Mark",
    category: "Test",
    icon: "box",
    keywords: [],
    size: { w: 100, h: 40 },
    canContain: false,
    defaultProps: {},
    fields: {},
  },
};
const registry = { ...builtInRegistry, ...components };
const mark = newNode(registry, "Mark", "m1", { w: 680, h: 788 }) as TreeNode;
const page = { ...emptyPage(), root: insertNode(emptyPage().root, "root", mark) };

const showMetadata: Renderer = ({ metadata }) => <i data-m={JSON.stringify(metadata ?? "none")} />;

describe("the canvas of the editor", () => {
  it("gives the renderers of a kind the metadata of the editor", () => {
    const html = renderToString(
      <Editor
        canvas="inline"
        data={page}
        metadata={{ currency: "VND" }}
        config={{
          components,
          renderers: { Mark: showMetadata },
        }}
      />,
    );
    expect(html).toContain("&quot;currency&quot;:&quot;VND&quot;");
  });

  it("gives them undefined when the host gave none", () => {
    const html = renderToString(
      <Editor
        canvas="inline"
        data={page}
        config={{
          components,
          renderers: { Mark: showMetadata },
        }}
      />,
    );
    expect(html).toContain("&quot;none&quot;");
  });
});
