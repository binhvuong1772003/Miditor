import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Editor, EditorProvider } from "./Editor";
import { visibleTool } from "./hide";
import { type HostTool, usableTools } from "./host-tool";

const Panel: HostTool["panel"] = ({ label }) => <p>panel of {label}</p>;
const products: HostTool = { id: "products", label: "Products", icon: <i>P</i>, panel: Panel };

describe("tools of the host", () => {
  it("are on the rail after the editor's", () => {
    const html = renderToString(<Editor config={{ tools: [products] }} />);
    const rail = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
    expect(rail).toContain("Products");
    expect(rail.indexOf("Themes")).toBeLessThan(rail.indexOf("Products"));
    expect(rail).toContain("<i>P</i>");
  });

  it("show the first letters of the label when there is no icon", () => {
    const html = renderToString(
      <Editor config={{ tools: [{ ...products, icon: undefined, label: "Shop" }] }} />,
    );
    expect(html).toContain("SH");
  });

  it("draw their panel on its own in a layout of the host's", () => {
    const html = renderToString(
      <EditorProvider config={{ tools: [products] }}>
        <Editor.Tool id="products" />
      </EditorProvider>,
    );
    expect(html).toContain('aria-label="Products"');
    expect(html).toMatch(/panel of (<!-- -->)?Products/);
  });

  it("leave out a bad id, a repeated one and a name the editor has", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const same = { ...products, id: "layers" };
    const bad = { ...products, id: "Bad Id" };
    expect(usableTools([products, products, same, bad])).toEqual([products]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("fall back on a tool left when the chosen one is gone", () => {
    expect(visibleTool("products", () => false, ["products"])).toBe("products");
    expect(visibleTool("products", () => false, [])).toBe("blocks");
    expect(visibleTool("themes", (name) => name === "tool.themes", [])).toBe("blocks");
  });
});
