import { describe, expect, it } from "vitest";
import type { PageData } from "../tree/types";
import type { ExternalItem } from "./external-source";
import { fillItemData } from "./fill-item-data";
import type { Registry } from "./types";

const registry = {
  Card: {
    label: "Card",
    defaultProps: {},
    fields: {
      snap: { type: "external", label: "S", source: "items" },
      live: { type: "external", label: "L", source: "items", store: "reference" },
      links: {
        type: "array",
        label: "Links",
        item: {
          type: "object",
          label: "Link",
          fields: { page: { type: "external", label: "P", source: "items", store: "reference" } },
        },
      },
    },
  },
} as unknown as Registry;

const node = (id: string, props: object, extra: object = {}) =>
  ({ id, type: "Card", props, children: [], styles: {}, ...extra }) as never;
const pageOf = (...cards: unknown[]) =>
  ({
    root: { id: "root", type: "Page", props: {}, children: cards, styles: {} },
  }) as unknown as PageData;

const fresh: ExternalItem = { id: "1", label: "One!", data: { price: 2 } };
const itemOf = (ref: { value: { id: string } }) => (ref.value.id === "1" ? fresh : undefined);

describe("filling the data of stored items into a page", () => {
  it("gives back the very page when nothing is filled", () => {
    const page = pageOf(node("a", { live: { id: "9", label: "Nine" } }));
    expect(fillItemData(page, registry, itemOf)).toBe(page);
    const none = pageOf(node("a", { live: null }));
    expect(fillItemData(none, registry, () => fresh)).toBe(none);
  });

  it("writes the label and the data (no time) of the item into a copy, and leaves the page as it was", () => {
    const page = pageOf(node("a", { live: { id: "1", label: "One" } }));
    const filled = fillItemData(page, registry, itemOf);
    expect(filled.root.children[0]?.props.live).toEqual({
      id: "1",
      label: "One!",
      data: { price: 2 },
    });
    expect(page.root.children[0]?.props.live).toEqual({ id: "1", label: "One" });
  });

  it("fills nested values and the phoneProps of a block", () => {
    const page = pageOf(
      node(
        "a",
        { links: [{ page: { id: "1", label: "One" } }] },
        { phoneProps: { live: { id: "1", label: "One" } } },
      ),
    );
    const filled = fillItemData(page, registry, itemOf);
    const first = filled.root.children[0] as unknown as {
      props: { links: { page: unknown }[] };
      phoneProps: { live: unknown };
    };
    expect(first.props.links[0]?.page).toEqual({ id: "1", label: "One!", data: { price: 2 } });
    expect(first.phoneProps.live).toEqual({ id: "1", label: "One!", data: { price: 2 } });
  });

  it("with only 'reference' leaves the snapshots of the page as they are", () => {
    const snap = { id: "1", label: "One", data: { price: 1 }, at: "2026-11-01T00:00:00.000Z" };
    const page = pageOf(node("a", { snap, live: { id: "1", label: "One" } }));
    const filled = fillItemData(page, registry, itemOf, "reference");
    expect(filled.root.children[0]?.props.snap).toBe(snap);
    expect(filled.root.children[0]?.props.live).toHaveProperty("data");
  });

  it("skips an item whose data cannot be kept in a page", () => {
    const page = pageOf(node("a", { live: { id: "1", label: "One" } }));
    const big: ExternalItem = { id: "1", label: "Big", data: { s: "x".repeat(9000) } };
    expect(fillItemData(page, registry, () => big)).toBe(page);
  });
});
