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
      {
        nodeId: "a",
        layer: "props",
        store: "snapshot",
        path: ["item"],
        source: "items",
        value: beans,
      },
    ]);
  });

  it("says whether a field keeps a snapshot or a reference", () => {
    const keeps = {
      Card: {
        label: "Card",
        defaultProps: {},
        fields: {
          a: { type: "external", label: "A", source: "items" },
          b: { type: "external", label: "B", source: "items", store: "reference" },
        },
      },
    } as unknown as Registry;
    const refs = externalRefs(
      keeps,
      pageOf(node("n", { a: { id: "1", label: "1" }, b: { id: "2", label: "2" } })),
    );
    expect(refs.map((ref) => ref.store)).toEqual(["snapshot", "reference"]);
  });

  it("finds an item inside an array of objects, with the index in the path", () => {
    const page = pageOf(
      node("a", { links: [{ page: null }, { page: { id: "home", label: "Home" } }] }),
    );
    expect(externalRefs(registry, page)).toEqual([
      {
        nodeId: "a",
        layer: "props",
        store: "snapshot",
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

describe("items kept for the phone", () => {
  it("finds an item in phoneProps, and writes it back there", () => {
    const withPhone = { ...(node("a", { item: null }) as object), phoneProps: { item: beans } };
    const page = pageOf(withPhone);
    const refs = externalRefs(registry, page);
    expect(refs).toEqual([
      {
        nodeId: "a",
        layer: "phoneProps",
        store: "snapshot",
        path: ["item"],
        source: "items",
        value: beans,
      },
    ]);
    const next = withExternalValues(page, [
      { nodeId: "a", layer: "phoneProps", path: ["item"], value: { id: "beans", label: "B2" } },
    ]);
    const node0 = next.root.children[0] as unknown as { props: unknown; phoneProps: unknown };
    expect(node0.phoneProps).toEqual({ item: { id: "beans", label: "B2" } });
    expect(node0.props).toEqual({ item: null });
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
