import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Editor } from "./Editor";
import { EditorHeader, EditorProperties, EditorRail, EditorStartPanel } from "./parts";

// The markup of the default layout, kept from before the editor was split into parts: the default
// layout only adds `data-layout`, and the ids React makes follow the place in the tree; both are
// taken out here. (The files are `.txt` so the formatter leaves them alone.)
const plain = (html: string) =>
  html.replace(' data-layout="default"', "").replace(/_R_[0-9a-z]+_/g, "_R_");

describe("the default layout is the editor as it was", () => {
  it("draws the same markup", async () => {
    await expect(plain(renderToString(<Editor />))).toMatchFileSnapshot(
      "./__snapshots__/editor-default.txt",
    );
  });

  it("draws the same markup with overrides and hide", async () => {
    const html = renderToString(
      <Editor
        overrides={{ header: ({ children }) => <div id="host">{children}</div> }}
        hide={["tool.themes", "header.zoom"]}
      />,
    );
    await expect(plain(html)).toMatchFileSnapshot("./__snapshots__/editor-default-hidden.txt");
  });
});

describe("the parts", () => {
  it.each([
    ["Editor.Header", EditorHeader],
    ["Editor.Rail", EditorRail],
    ["Editor.StartPanel", EditorStartPanel],
    ["Editor.Properties", EditorProperties],
  ])("%s outside a provider says so", (name, Part) => {
    expect(() => renderToString(<Part />)).toThrow(`${name} must be used inside <EditorProvider>`);
  });
});
