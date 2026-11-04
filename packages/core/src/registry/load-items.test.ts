import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalItem, ExternalSource } from "./external-source";
import { GET_CONCURRENCY, GET_MANY_CHUNK, loadItems, SOURCE_TIMEOUT_MS } from "./load-items";

const ctx = { metadata: undefined };
const item = (id: string): ExternalItem => ({ id, label: id.toUpperCase() });
const none = () => new AbortController().signal;
const ids = (count: number) => Array.from({ length: count }, (_, at) => `id${at}`);

afterEach(() => {
  vi.useRealTimers();
});

describe("loading the items of a source", () => {
  it("asks equal ids once", async () => {
    const get = vi.fn(async (id: string) => item(id));
    const answers = await loadItems({ search: async () => [], get }, ["a", "a", "b"], none(), ctx);
    expect(get).toHaveBeenCalledTimes(2);
    expect([...answers.keys()]).toEqual(["a", "b"]);
  });

  it("asks getMany in chunks of 100, in parallel", async () => {
    const getMany = vi.fn(async (chunk: readonly string[]) =>
      Object.fromEntries(chunk.map((id) => [id, item(id)])),
    );
    const answers = await loadItems({ search: async () => [], getMany }, ids(250), none(), ctx);
    expect(GET_MANY_CHUNK).toBe(100);
    expect(getMany.mock.calls.map((call) => call[0].length)).toEqual([100, 100, 50]);
    expect(answers.size).toBe(250);
    expect(answers.get("id7")).toEqual({ status: "found", item: item("id7") });
  });

  it("prefers getMany to get when both are given", async () => {
    const get = vi.fn(async (id: string) => item(id));
    const getMany = vi.fn(async () => ({}));
    await loadItems({ search: async () => [], get, getMany }, ["a"], none(), ctx);
    expect(get).not.toHaveBeenCalled();
    expect(getMany).toHaveBeenCalledTimes(1);
  });

  it("calls a key with null gone, and a key left out could not be checked", async () => {
    const source: ExternalSource = {
      search: async () => [],
      getMany: async () => ({ a: item("a"), b: null }),
    };
    const answers = await loadItems(source, ["a", "b", "c"], none(), ctx);
    expect(answers.get("a")?.status).toBe("found");
    expect(answers.get("b")).toEqual({ status: "gone" });
    expect(answers.get("c")).toEqual({ status: "failed" });
  });

  it("keeps the chunks that answered when another chunk fails", async () => {
    let call = 0;
    const getMany = async (chunk: readonly string[]) => {
      call += 1;
      if (call === 2) throw new Error("down");
      return Object.fromEntries(chunk.map((id) => [id, item(id)]));
    };
    const answers = await loadItems({ search: async () => [], getMany }, ids(250), none(), ctx);
    const states = [...answers.values()].map((answer) => answer.status);
    expect(states.filter((state) => state === "found")).toHaveLength(150);
    expect(states.filter((state) => state === "failed")).toHaveLength(100);
  });

  it("with get alone never has more than 5 in flight", async () => {
    let inFlight = 0;
    let most = 0;
    const get = async (id: string) => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item(id);
    };
    const answers = await loadItems({ search: async () => [], get }, ids(12), none(), ctx);
    expect(GET_CONCURRENCY).toBe(5);
    expect(most).toBe(5);
    expect(answers.size).toBe(12);
  });

  it("makes a get that rejects or returns null failed or gone, not both the same", async () => {
    const get = async (id: string) => {
      if (id === "boom") throw new Error("down");
      return id === "lost" ? null : item(id);
    };
    const answers = await loadItems(
      { search: async () => [], get },
      ["boom", "lost", "ok"],
      none(),
      ctx,
    );
    expect(answers.get("boom")).toEqual({ status: "failed" });
    expect(answers.get("lost")).toEqual({ status: "gone" });
    expect(answers.get("ok")?.status).toBe("found");
  });

  it("takes an AbortError thrown by the host's own code for a failed call, not for the editor aborting", async () => {
    const get = async (id: string) => {
      if (id === "x") throw new DOMException("host aborted", "AbortError");
      return item(id);
    };
    const answers = await loadItems({ search: async () => [], get }, ["x", "y"], none(), ctx);
    expect(answers.get("x")).toEqual({ status: "failed" });
    expect(answers.get("y")?.status).toBe("found");
    const getMany = async () => {
      throw new DOMException("host aborted", "AbortError");
    };
    const many = await loadItems({ search: async () => [], getMany }, ["x"], none(), ctx);
    expect(many.get("x")).toEqual({ status: "failed" });
  });

  it("does not take a malformed item for an answer: no object, another id, a number for an id, no label", async () => {
    const getMany = async () =>
      ({
        a: "oops",
        b: { id: "zzz", label: "Z" },
        c: { id: 3, label: "C" },
        d: { id: "d" },
        e: { id: "e", label: "E" },
      }) as never;
    const answers = await loadItems(
      { search: async () => [], getMany },
      ["a", "b", "c", "d", "e"],
      none(),
      ctx,
    );
    for (const id of ["a", "b", "c", "d"]) expect(answers.get(id)).toEqual({ status: "failed" });
    expect(answers.get("e")?.status).toBe("found");
  });

  it("gives up on a call that never settles after the timeout", async () => {
    vi.useFakeTimers();
    const get = () => new Promise<ExternalItem | null>(() => {});
    const pending = loadItems({ search: async () => [], get }, ["a"], none(), ctx);
    await vi.advanceTimersByTimeAsync(SOURCE_TIMEOUT_MS + 1);
    expect((await pending).get("a")).toEqual({ status: "failed" });
  });

  it("says every id could not be checked for a source with neither get nor getMany", async () => {
    const answers = await loadItems({ search: async () => [] }, ["a"], none(), ctx);
    expect(answers.get("a")).toEqual({ status: "failed" });
  });

  it("rejects when it is aborted, and tells the calls to stop", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const get = (_id: string, signal: AbortSignal) => {
      seen = signal;
      return new Promise<ExternalItem | null>(() => {});
    };
    const pending = loadItems({ search: async () => [], get }, ["a"], controller.signal, ctx);
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(seen?.aborted).toBe(true);
  });
});
