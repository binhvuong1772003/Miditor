import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { type AskedSource, ExternalField, ItemRow } from "./external-field";

const sources: Record<string, AskedSource> = {
  pages: { search: async () => [], canLoad: true },
};

const draw = (
  value: unknown,
  list: Record<string, AskedSource> | undefined = sources,
  source = "pages",
  store: "snapshot" | "reference" = "snapshot",
) =>
  renderToString(
    <EditorProvider>
      <ExternalField
        label="Page"
        source={source}
        store={store}
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

  it("says a reference cannot show its data when the source cannot load items", () => {
    const cannot = { pages: { search: async () => [], canLoad: false } };
    const can = { pages: { search: async () => [], canLoad: true } };
    expect(draw({ id: "p1", label: "Home" }, cannot, "pages", "reference")).toContain(
      "cannot load items",
    );
    expect(draw({ id: "p1", label: "Home" }, can, "pages", "reference")).not.toContain(
      "cannot load items",
    );
    expect(draw({ id: "p1", label: "Home" }, cannot, "pages", "snapshot")).not.toContain(
      "cannot load items",
    );
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

describe("a row of the list", () => {
  const html = (item: Parameters<typeof ItemRow>[0]["item"]) =>
    renderToString(<ItemRow item={item} />);

  it("shows the label, and a hint and a picture when the item has them", () => {
    const full = html({ id: "1", label: "Beans", hint: "199.000đ", image: "https://x/y.jpg" });
    expect(full).toContain("Beans");
    expect(full).toContain("199.000đ");
    expect(full).toContain('src="https://x/y.jpg"');
    expect(full).toContain('alt=""');
  });

  it("shows nothing more for an item with only a label", () => {
    const plain = html({ id: "1", label: "Beans" });
    expect(plain).toContain("Beans");
    expect(plain).not.toContain("<img");
  });
});
