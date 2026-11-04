import { describe, expect, it, vi } from "vitest";
import { type ExternalSource, withMetadata } from "./external-field";

const signal = new AbortController().signal;

describe("the metadata given to the search of a source", () => {
  it("is passed to search as the third argument", async () => {
    const search = vi.fn(async () => [{ id: "1", label: "One" }]);
    const wrapped = withMetadata({ pages: { search } }, () => ({ shop: "s1" }));
    const items = await wrapped?.pages?.search("ab", signal);
    expect(search).toHaveBeenCalledWith("ab", signal, { metadata: { shop: "s1" } });
    expect(items).toEqual([{ id: "1", label: "One" }]);
  });

  it("passes { metadata: undefined } when the host gave none", async () => {
    const search = vi.fn(async () => []);
    await withMetadata({ pages: { search } }, () => undefined)?.pages?.search("", signal);
    expect(search).toHaveBeenCalledWith("", signal, { metadata: undefined });
  });

  it("works for a host whose search takes two parameters", async () => {
    const two: ExternalSource = { search: async (query: string) => [{ id: query, label: query }] };
    const wrapped = withMetadata({ pages: two }, () => 1);
    expect(await wrapped?.pages?.search("x", signal)).toEqual([{ id: "x", label: "x" }]);
  });

  it("has no sources when the host gave none, and only the names it gave", () => {
    expect(withMetadata(undefined, () => 1)).toBeUndefined();
    const wrapped = withMetadata({ pages: { search: async () => [] } }, () => 1) as object;
    expect(Object.hasOwn(wrapped, "pages")).toBe(true);
    expect(Object.hasOwn(wrapped, "constructor")).toBe(false);
  });

  it("gives the same wrapper for the same source, and reads the metadata when it is asked", async () => {
    const search = vi.fn(async () => []);
    const source: ExternalSource = { search };
    const cache = new WeakMap();
    let metadata: number | undefined = 1;
    const read = () => metadata;
    const first = withMetadata({ pages: source }, read, cache);
    // The host built its `config` again: a new object around the same source.
    const second = withMetadata({ pages: source }, read, cache);
    expect(second?.pages).toBe(first?.pages);
    metadata = 2;
    await first?.pages?.search("", signal);
    expect(search).toHaveBeenCalledWith("", signal, { metadata: 2 });
  });
});
