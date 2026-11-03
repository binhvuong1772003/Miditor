import { builtInRegistry, newNode, type TreeNode } from "@miditor/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { PropertiesPanel } from "./PropertiesPanel";

const noop = () => {};

const panel = (styles: TreeNode["styles"], permissions?: Record<string, boolean>) => {
  const node = {
    ...newNode(builtInRegistry, "Text", "t1", { w: 680, h: 788 }),
    styles,
  } as TreeNode;
  return renderToString(
    <EditorProvider {...(permissions ? { permissions } : {})}>
      <PropertiesPanel
        node={node}
        device="desktop"
        def={builtInRegistry.Text}
        onPreview={noop}
        onCommit={noop}
        onDiscard={noop}
        onResetPhone={noop}
        onAnchor={noop}
        onRect={noop}
      />
    </EditorProvider>,
  );
};

const shadow = { x: 3, y: 5, blur: 12, spread: -2, color: "#112233", opacity: 40 };

describe("the Effects section", () => {
  it("is in the Design tab, with the opacity and the four shadow choices", () => {
    const html = panel({});
    expect(html).toContain("Effects");
    expect(html).toContain('type="range"');
    for (const choice of ["None", "Soft", "Medium", "Strong"]) expect(html).toContain(choice);
  });

  it("shows no shadow fields while there is no shadow, and presses None", () => {
    const html = panel({});
    expect(html).not.toContain("Blur");
    expect(html).toMatch(/aria-pressed="true"[^>]*>None/);
  });

  it("shows the fields of a stored shadow with its values", () => {
    const html = panel({ shadow });
    for (const label of ["Blur", "Spread", "Strength"]) expect(html).toContain(label);
    expect(html).toContain('value="12"');
    expect(html).toContain('value="-2"');
    expect(html).toContain('value="40"');
    expect(html).not.toMatch(/aria-pressed="true"[^>]*>None/);
  });

  it("presses the preset a stored shadow is equal to", () => {
    const html = panel({
      shadow: { x: 0, y: 4, blur: 16, spread: 0, color: "#000000", opacity: 22 },
    });
    expect(html).toMatch(/aria-pressed="true"[^>]*>Medium/);
  });

  it("shows the opacity that is stored, and 100 when none is", () => {
    expect(panel({ opacity: 35 })).toContain('value="35"');
    expect(panel({})).toMatch(/type="range"[^>]*value="100"|value="100"[^>]*type="range"/);
  });
});
