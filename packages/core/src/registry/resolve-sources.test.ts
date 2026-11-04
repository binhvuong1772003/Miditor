import { describe, expect, it, vi } from "vitest";
import type { PageData } from "../tree/types";
import type { ExternalSource } from "./external-source";
import { resolveSources } from "./resolve-sources";
import type { Registry } from "./types";

const registry = {
  Card: {
    label: "Card",
    defaultProps: {},
    fields: {
      item: { type: "external", label: "I", source: "items", store: "reference" },
      other: { type: "external", label: "O", source: "others" },
    },
  },
} as unknown as Registry;
const node = (id: string, props: object) =>
  ({ id, type: "Card", props, children: [], styles: {} }) as never;
const pageOf = (...cards: unknown[]) =>
  ({
    root: { id: "root", type: "Page", props: {}, children: cards, styles: {} },
  }) as unknown as PageData;

const getManyOf = (data: Record<string, number> = { price: 2 }) =>
  vi.fn(async (ids: readonly string[]) =>
    Object.fromEntries(ids.map((id) => [id, { id, label: id.toUpperCase(), data }])),
  );

describe("resolving the sources of a page", () => {
  it("loads equal ids once and fills every block that holds them", async () => {
    const getMany = getManyOf();
    const page = pageOf(
      node("a", { item: { id: "x", label: "x" } }),
      node("b", { item: { id: "x", label: "x" } }),
    );
    const { page: filled, failed } = await resolveSources(page, registry, {
      items: { search: async () => [], getMany },
    });
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany.mock.calls[0]?.[0]).toEqual(["x"]);
    expect(
      filled.root.children.map((child) => (child.props.item as { data: unknown }).data),
    ).toEqual([{ price: 2 }, { price: 2 }]);
    expect(failed).toEqual([]);
    expect(page.root.children[0]?.props.item as object).not.toHaveProperty("data");
  });

  it("leaves the snapshot fields of the page alone, unless asked to refresh them", async () => {
    const page = pageOf(node("a", { other: { id: "y", label: "y", data: { price: 1 } } }));
    const sources = { others: { search: async () => [], getMany: getManyOf({ price: 5 }) } };
    const plain = await resolveSources(page, registry, sources);
    expect(plain.page.root.children[0]?.props.other).toMatchObject({ data: { price: 1 } });
    const all = await resolveSources(page, registry, sources, { snapshots: true });
    expect(all.page.root.children[0]?.props.other).toMatchObject({ data: { price: 5 } });
  });

  it("takes stale data out of a reference whose item is gone", async () => {
    const stale = { id: "x", label: "x", data: { price: 1 }, at: "2026-01-01T00:00:00.000Z" };
    const page = pageOf(node("a", { item: stale }));
    const { page: filled, failed } = await resolveSources(page, registry, {
      items: { search: async () => [], getMany: async () => ({ x: null }) },
    });
    expect(filled.root.children[0]?.props.item).toEqual({ id: "x", label: "x" });
    expect(failed).toHaveLength(1);
  });

  it("fills data of more than 8 kB: it is drawn, never stored", async () => {
    const page = pageOf(node("a", { item: { id: "x", label: "x" } }));
    const big = { s: "x".repeat(9000) } as never;
    const { page: filled } = await resolveSources(page, registry, {
      items: {
        search: async () => [],
        getMany: async () => ({ x: { id: "x", label: "x", data: big } }),
      },
    });
    expect(filled.root.children[0]?.props.item).toMatchObject({ data: big });
  });

  it("lists what could not be loaded and still fills the other sources, never throwing", async () => {
    const page = pageOf(
      node("a", { item: { id: "x", label: "x" }, other: { id: "y", label: "y" } }),
    );
    const broken: ExternalSource = {
      search: async () => [],
      getMany: async () => {
        throw new Error("down");
      },
    };
    const { page: filled, failed } = await resolveSources(
      page,
      registry,
      { items: broken, others: { search: async () => [], getMany: getManyOf() } },
      { snapshots: true },
    );
    expect(failed).toEqual([{ nodeId: "a", source: "items", id: "x" }]);
    expect(filled.root.children[0]?.props.item).not.toHaveProperty("data");
    expect(filled.root.children[0]?.props.other).toHaveProperty("data");
  });

  it("lists a gone item and leaves it as it was", async () => {
    const page = pageOf(node("a", { item: { id: "x", label: "x" } }));
    const { page: filled, failed } = await resolveSources(page, registry, {
      items: { search: async () => [], getMany: async () => ({ x: null }) },
    });
    expect(failed).toEqual([{ nodeId: "a", source: "items", id: "x" }]);
    expect(filled).toBe(page);
  });

  it("makes no call for a page with nothing to load, or for a source the host did not give", async () => {
    const getMany = getManyOf();
    const none = pageOf(node("a", { item: null }));
    const result = await resolveSources(none, registry, {
      items: { search: async () => [], getMany },
    });
    expect(getMany).not.toHaveBeenCalled();
    expect(result.page).toBe(none);
    const page = pageOf(node("a", { item: { id: "x", label: "x" } }));
    expect((await resolveSources(page, registry, undefined)).page).toBe(page);
  });

  it("gives the metadata to the source", async () => {
    const getMany = getManyOf();
    await resolveSources(
      pageOf(node("a", { item: { id: "x", label: "x" } })),
      registry,
      {
        items: { search: async () => [], getMany },
      },
      { metadata: { shop: 1 } },
    );
    expect(getMany).toHaveBeenCalledWith(["x"], expect.anything(), { metadata: { shop: 1 } });
  });
});
