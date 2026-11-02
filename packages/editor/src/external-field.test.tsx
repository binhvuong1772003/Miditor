import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { ExternalField, type ExternalSource } from "./external-field";

const sources: Record<string, ExternalSource> = { pages: { search: async () => [] } };

const draw = (
  value: unknown,
  list: Record<string, ExternalSource> | undefined = sources,
  source = "pages",
) =>
  renderToString(
    <EditorProvider>
      <ExternalField
        label="Page"
        source={source}
        value={value as never}
        onChange={() => {}}
        sources={list}
      />
    </EditorProvider>,
  );

describe("an external field", () => {
  it("shows what is chosen, or Choose", () => {
    expect(draw({ id: "p1", label: "Home" })).toContain("Home");
    expect(draw({ id: "p1", label: "Home" })).toContain("Clear Page");
    expect(draw(null)).toContain("Choose");
    expect(draw(null)).not.toContain("Clear");
  });

  it("keeps the panel shut until the button is pressed", () => {
    const html = draw(null);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('type="search"');
  });

  it("says so when the host gave no list for the source", () => {
    expect(draw(null, {})).toContain("No list was given for the source");
    expect(draw(null, {}, "constructor")).toContain("No list was given");
  });
});
