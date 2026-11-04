import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { ExternalField, type ExternalSource, ItemRow, pickValue } from "./external-field";

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

describe("what is stored when an item is picked", () => {
  const now = new Date("2026-11-03T10:00:00.000Z");

  it("is exactly { id, label } for an item with no data, so old and new hosts agree", () => {
    const value = pickValue({ id: "p1", label: "Home", hint: "x", image: "y" }, now) as object;
    expect(value).toEqual({ id: "p1", label: "Home" });
    expect(Object.keys(value)).toHaveLength(2);
  });

  it("adds the data and the time it was taken", () => {
    expect(pickValue({ id: "p1", label: "Home", data: { price: 9 } }, now)).toEqual({
      id: "p1",
      label: "Home",
      data: { price: 9 },
      at: "2026-11-03T10:00:00.000Z",
    });
  });

  it("refuses data that is not plain JSON, without throwing", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const data of [{ a: undefined }, { f: () => 1 }, cycle, new Date(), { n: Number.NaN }]) {
      expect(pickValue({ id: "p1", label: "Home", data: data as never }, now)).toBeNull();
    }
  });

  it("keeps data to 8000 bytes of JSON", () => {
    const of = (data: string) => pickValue({ id: "p1", label: "Home", data }, now);
    expect(of("x".repeat(7998))).not.toBeNull();
    expect(of("x".repeat(7999))).toBeNull();
    expect(of("é".repeat(4000))).toBeNull();
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
