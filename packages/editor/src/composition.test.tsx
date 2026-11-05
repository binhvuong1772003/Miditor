import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Editor, EditorProvider } from "./Editor";
import {
  EditorBlocks,
  EditorCanvas,
  EditorHeader,
  EditorImages,
  EditorLayers,
  EditorProperties,
  EditorRail,
  EditorStartPanel,
  EditorThemes,
} from "./parts";
import { useEditorRoot } from "./shell";

// The markup of the default layout, kept from before the editor was split into parts: the default
// layout only adds `data-layout`, and the ids React makes follow the place in the tree; both are
// taken out here. (The files are `.txt` so the formatter leaves them alone.)
const plain = (html: string) =>
  html.replace(' data-layout="default"', "").replace(/_R_[0-9a-z]+_/g, "_R_");

describe("the default layout is the editor as it was", () => {
  it("draws the same markup", async () => {
    await expect(plain(renderToString(<Editor canvas="inline" />))).toMatchFileSnapshot(
      "./__snapshots__/editor-default.txt",
    );
  });

  it("draws the same markup with overrides and hide", async () => {
    const html = renderToString(
      <Editor
        canvas="inline"
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

function Probe() {
  return <i>{String(useEditorRoot())}</i>;
}

const count = (html: string, what: string) => html.split(what).length - 1;

describe("a layout of the host's own", () => {
  it("has the parts as members of Editor", () => {
    expect(Editor.Header).toBe(EditorHeader);
    expect(Editor.Canvas).toBe(EditorCanvas);
    expect(Editor.Provider).toBe(EditorProvider);
  });

  it("draws the root without the default layout", () => {
    const html = renderToString(
      <EditorProvider>
        <Editor.Canvas />
      </EditorProvider>,
    );
    expect(html).toContain("data-miditor-editor");
    expect(html).not.toContain("data-layout");
  });

  it("draws a tool panel on its own, whatever the rail chose", () => {
    const html = renderToString(
      <EditorProvider>
        <EditorBlocks />
        <EditorLayers />
        <EditorImages />
        <EditorThemes />
      </EditorProvider>,
    );
    for (const label of ["Blocks", "Layers", "Images", "Themes"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("does not draw a tool panel the host hid", () => {
    const html = renderToString(
      <EditorProvider hide={["tool.layers"]}>
        <EditorLayers />
        <EditorBlocks />
      </EditorProvider>,
    );
    expect(html).not.toContain('aria-label="Layers"');
    expect(html).toContain('aria-label="Blocks"');
  });

  it("works without a header, a rail or the properties", () => {
    const html = renderToString(
      <EditorProvider>
        <EditorCanvas />
      </EditorProvider>,
    );
    expect(html).toContain('aria-label="Canvas"');
    expect(html).not.toContain("<header");
    expect(html).not.toContain("<nav");
  });

  it("draws the canvas once and ignores a second one", () => {
    const html = renderToString(
      <EditorProvider>
        <EditorCanvas />
        <EditorCanvas />
      </EditorProvider>,
    );
    expect(count(html, 'aria-label="Canvas"')).toBe(1);
  });

  it("can draw the parts twice but the canvas", () => {
    const html = renderToString(
      <EditorProvider>
        <EditorLayers />
        <EditorLayers />
      </EditorProvider>,
    );
    expect(count(html, 'aria-label="Layers"')).toBe(2);
  });

  it("gives no root element before it is mounted", () => {
    expect(
      renderToString(
        <EditorProvider>
          <Probe />
        </EditorProvider>,
      ),
    ).toContain("<i>null</i>");
  });
});
