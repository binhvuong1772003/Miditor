import { describe, expect, it } from "vitest";
import type { ExternalItem, ExternalSource, SourceContext } from "./external-source";

describe("the shapes of a source", () => {
  const ctx: SourceContext = { metadata: undefined };
  const signal = new AbortController().signal;
  const item: ExternalItem = { id: "a", label: "A" };

  it("can have only search, or search with get, or all three", async () => {
    const onlySearch: ExternalSource = { search: async () => [item] };
    const withGet: ExternalSource = { search: async () => [], get: async () => item };
    const all: ExternalSource = {
      search: async () => [],
      get: async () => null,
      getMany: async (ids) => Object.fromEntries(ids.map((id) => [id, { id, label: id }])),
    };
    expect(await onlySearch.search("", signal, ctx)).toEqual([item]);
    expect(await withGet.get?.("a", signal, ctx)).toEqual(item);
    expect(await all.getMany?.(["x"], signal, ctx)).toEqual({ x: { id: "x", label: "x" } });
    expect(onlySearch.getMany).toBeUndefined();
  });
});
