import { describe, expect, it } from "vitest";
import type { PageData } from "../tree/types";
import { externalRefs, withExternalValues } from "./external-refs";
import type { Registry } from "./types";

const registry = {
  Card: {
    label: "Card",
    defaultProps: {},
    fields: {
      item: { type: "external", label: "Item", source: "items" },
      title: { type: "text", label: "Title" },
      links: {
        type: "array",
        label: "Links",
        item: {
          type: "object",
          label: "Link",
          fields: { page: { type: "external", label: "Page", source: "pages" } },
        },
      },
    },
  },
} as unknown as Registry;

const node = (id: string, props: object, children: unknown[] = []) =>
  ({ id, type: id === "root" ? "Page" : "Card", props, children, styles: {} }) as never;
const pageOf = (...cards: unknown[]) => ({ root: node("root", {}, cards) }) as unknown as PageData;

const beans = { id: "beans", label: "Beans", data: { price: 1 } };

describe("the stored items of a page", () => {
  it("finds a plain external prop, with the node, path and source", () => {
    const page = pageOf(node("a", { item: beans, title: "x" }));
    expect(externalRefs(registry, page)).toEqual([
      { nodeId: "a", path: ["item"], source: "items", value: beans },
    ]);
  });

  it("finds an item inside an array of objects, with the index in the path", () => {
    const page = pageOf(
      node("a", { links: [{ page: null }, { page: { id: "home", label: "Home" } }] }),
    );
    expect(externalRefs(registry, page)).toEqual([
      {
        nodeId: "a",
        path: ["links", 1, "page"],
        source: "pages",
        value: { id: "home", label: "Home" },
      },
    ]);
  });

  it("skips null values, other field types and kinds the registry does not know", () => {
    const page = pageOf(node("a", { item: null, title: "t" }), {
      ...(node("b", { item: beans }) as object),
      type: "Unknown",
    });
    expect(externalRefs(registry, page)).toEqual([]);
  });

  it("finds items in nested blocks", () => {
    const page = pageOf(node("g", {}, [node("a", { item: beans })]));
    expect(externalRefs(registry, page).map((ref) => ref.nodeId)).toEqual(["a"]);
  });
});

describe("writing items back", () => {
  it("replaces the value at a path and leaves the rest of the page as it was", () => {
    const untouched = node("b", { item: beans });
    const page = pageOf(node("a", { item: beans }), untouched);
    const next = withExternalValues(page, [
      { nodeId: "a", path: ["item"], value: { id: "beans", label: "Beans!" } },
    ]);
    expect(next.root.children[0]?.props.item).toEqual({ id: "beans", label: "Beans!" });
    expect(next.root.children[1]).toBe(untouched);
    expect(page.root.children[0]?.props.item).toEqual(beans);
  });

  it("writes inside an array by index", () => {
    const page = pageOf(node("a", { links: [{ page: null }, { page: { id: "h", label: "H" } }] }));
    const next = withExternalValues(page, [
      { nodeId: "a", path: ["links", 1, "page"], value: { id: "h", label: "Home" } },
    ]);
    expect(next.root.children[0]?.props.links).toEqual([
      { page: null },
      { page: { id: "h", label: "Home" } },
    ]);
  });

  it("gives back the same page for no change, or for a value that is already there", () => {
    const page = pageOf(node("a", { item: beans }));
    expect(withExternalValues(page, [])).toBe(page);
    expect(withExternalValues(page, [{ nodeId: "a", path: ["item"], value: { ...beans } }])).toBe(
      page,
    );
  });
});
