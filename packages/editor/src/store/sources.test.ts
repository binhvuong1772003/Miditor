import type { Answer, ExternalItem, ExternalSource, PageData, Registry } from "@miditor/core";
import { describe, expect, it, vi } from "vitest";
import { undo } from "../history";
import { type Env, initialDocumentState, step } from "./document";
import { initialSelectionState } from "./selection";
import {
  answerKey,
  canCheck,
  checkPage,
  metadataKey,
  refreshSources,
  type SourcesState,
  sourceReport,
  withoutAnswer,
} from "./sources";
import type { DocumentState, SelectionState } from "./state";

const registry = {
  Card: {
    label: "Card",
    defaultProps: {},
    fields: { item: { type: "external", label: "Item", source: "items" } },
  },
} as unknown as Registry;

const node = (id: string, props: object, children: unknown[] = []) =>
  ({ id, type: id === "root" ? "Page" : "Card", props, children, styles: {} }) as never;
const pageOf = (...cards: unknown[]) => ({ root: node("root", {}, cards) }) as unknown as PageData;

const old = { id: "a", label: "A", data: { price: 1 }, at: "2026-11-01T00:00:00.000Z" };
const fresh: ExternalItem = { id: "a", label: "A", data: { price: 2 } };
const found = (item: ExternalItem): Answer => ({ status: "found", item });
const answersOf = (entries: [string, Answer][]) =>
  new Map(entries.map(([id, answer]) => [answerKey("items", id), answer]));
const checked = (source: string) => source === "items";
const env: Env = { limit: 100, registry };

const stateOf = (page: PageData, answers: ReadonlyMap<string, Answer>) =>
  ({
    ...initialDocumentState(page),
    ...initialSelectionState("root"),
    sourceAnswers: answers,
  }) as DocumentState & SelectionState & SourcesState;

describe("what the last check says about the page as it is now", () => {
  it("sorts the stored items by what the source said", () => {
    const page = pageOf(
      node("c", { item: old }),
      node("g", { item: { ...old, id: "g" } }),
      node("f", { item: { ...old, id: "f" } }),
      node("s", { item: { ...old, id: "s", label: "S", data: { price: 1 } } }),
    );
    const answers = answersOf([
      ["a", found(fresh)],
      ["g", { status: "gone" }],
      ["f", { status: "failed" }],
      ["s", found({ id: "s", label: "S", data: { price: 1 } })],
    ]);
    const report = sourceReport(page, answers, registry, checked, undefined);
    expect(report.changed.map((ref) => ref.nodeId)).toEqual(["c"]);
    expect(report.gone.map((ref) => ref.nodeId)).toEqual(["g"]);
    expect(report.failed.map((ref) => ref.nodeId)).toEqual(["f"]);
  });

  it("is worked out from the page now: an item edited to match leaves the changed list", () => {
    const answers = answersOf([["a", found(fresh)]]);
    const before = pageOf(node("c", { item: old }));
    expect(sourceReport(before, answers, registry, checked, undefined).changed).toHaveLength(1);
    const after = pageOf(node("c", { item: { id: "a", label: "A", data: { price: 2 } } }));
    expect(sourceReport(after, answers, registry, checked, undefined).changed).toHaveLength(0);
  });

  it("leaves out an item with no answer, a source that is not checked, and a block that may not be edited", () => {
    const page = pageOf(node("c", { item: old }), node("d", { item: { ...old, id: "d" } }));
    const answers = answersOf([
      ["a", found(fresh)],
      ["d", found({ id: "d", label: "D2" })],
    ]);
    expect(sourceReport(page, new Map(), registry, checked, undefined).changed).toEqual([]);
    expect(sourceReport(page, answers, registry, () => false, undefined).changed).toEqual([]);
    const report = sourceReport(page, answers, registry, checked, {
      canEdit: (target) => target.id !== "d",
    });
    expect(report.changed.map((ref) => ref.nodeId)).toEqual(["c"]);
  });
});

describe("updating from the sources", () => {
  const now = new Date("2026-11-03T10:00:00.000Z");

  it("updates every changed item in one step, and undo brings the old ones back", () => {
    const page = pageOf(node("c", { item: old }), node("d", { item: { ...old, id: "d" } }));
    const answers = answersOf([
      ["a", found(fresh)],
      ["d", found({ id: "d", label: "D", data: { price: 5 } })],
    ]);
    const state = stateOf(page, answers);
    const next = refreshSources(state, { checked, now }, env);
    const items = next.history.present.root.children.map((child) => child.props.item);
    expect(items).toEqual([
      { id: "a", label: "A", data: { price: 2 }, at: now.toISOString() },
      { id: "d", label: "D", data: { price: 5 }, at: now.toISOString() },
    ]);
    expect(next.history.past).toHaveLength(1);
    const back = step(next, undo);
    expect(back.history.present.root.children[0]?.props.item).toEqual(old);
    expect(
      sourceReport(back.history.present, answers, registry, checked, undefined).changed,
    ).toHaveLength(2);
  });

  it("gives back the very state when nothing has changed", () => {
    const state = stateOf(
      pageOf(node("c", { item: old })),
      answersOf([["a", found({ id: "a", label: "A", data: { price: 1 } })]]),
    );
    expect(refreshSources(state, { checked, now }, env)).toBe(state);
  });

  it("leaves a block it may not edit as it was, and does not touch a gone item", () => {
    const page = pageOf(node("c", { item: old }), node("g", { item: { ...old, id: "g" } }));
    const answers = answersOf([
      ["a", found(fresh)],
      ["g", { status: "gone" }],
    ]);
    const blocked = refreshSources(
      stateOf(page, answers),
      { checked, now },
      {
        ...env,
        permissions: { canEdit: false },
      },
    );
    expect(blocked.history.present).toBe(page);
    const state = refreshSources(stateOf(page, answers), { checked, now }, env);
    expect(state.history.present.root.children[1]?.props.item).toEqual({ ...old, id: "g" });
  });
});

describe("checking the page against its sources", () => {
  const signal = new AbortController().signal;
  const ctx = { metadata: undefined };

  it("asks each source once, for the ids of the page with no repeats", async () => {
    const getMany = vi.fn(async (ids: readonly string[]) =>
      Object.fromEntries(ids.map((id) => [id, { id, label: id.toUpperCase() }])),
    );
    const page = pageOf(
      node("c", { item: { id: "a", label: "A" } }),
      node("d", { item: { id: "a", label: "A" } }),
      node("e", { item: { id: "b", label: "B" } }),
    );
    const answers = await checkPage(
      page,
      registry,
      { items: { search: async () => [], getMany } },
      signal,
      ctx,
    );
    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany.mock.calls[0]?.[0]).toEqual(["a", "b"]);
    expect(answers.get(answerKey("items", "b"))).toEqual({
      status: "found",
      item: { id: "b", label: "B" },
    });
  });

  it("leaves out a source the host did not give, and one that cannot be asked for an id", async () => {
    const page = pageOf(node("c", { item: { id: "a", label: "A" } }));
    expect((await checkPage(page, registry, undefined, signal, ctx)).size).toBe(0);
    expect((await checkPage(page, registry, {}, signal, ctx)).size).toBe(0);
    const searchOnly: ExternalSource = { search: async () => [] };
    expect((await checkPage(page, registry, { items: searchOnly }, signal, ctx)).size).toBe(0);
    expect(canCheck(searchOnly)).toBe(false);
    expect(canCheck({ search: async () => [], get: async () => null })).toBe(true);
    expect(canCheck({ search: async () => [], getMany: async () => ({}) })).toBe(true);
  });

  it("gives the metadata to the source", async () => {
    const getMany = vi.fn(async () => ({}));
    const page = pageOf(node("c", { item: { id: "a", label: "A" } }));
    await checkPage(page, registry, { items: { search: async () => [], getMany } }, signal, {
      metadata: { shop: 1 },
    });
    expect(getMany).toHaveBeenCalledWith(["a"], expect.anything(), { metadata: { shop: 1 } });
  });
});

describe("the check leaves out blocks the person may not edit", () => {
  it("asks only for the ids of blocks that may be edited", async () => {
    const getMany = vi.fn(async (ids: readonly string[]) =>
      Object.fromEntries(ids.map((id) => [id, { id, label: id }])),
    );
    const page = pageOf(
      node("c", { item: { id: "a", label: "A" } }),
      node("d", { item: { id: "locked", label: "L" } }),
    );
    await checkPage(
      page,
      registry,
      { items: { search: async () => [], getMany } },
      new AbortController().signal,
      { metadata: undefined },
      { canEdit: (target) => target.id !== "d" },
    );
    expect(getMany.mock.calls[0]?.[0]).toEqual(["a"]);
  });
});

describe("the key that says the metadata changed", () => {
  it("is the same for equal metadata, and never throws for metadata that is not JSON", () => {
    expect(metadataKey({ a: 1, b: [2] })).toBe(metadataKey({ a: 1, b: [2] }));
    expect(metadataKey({ a: 1 })).not.toBe(metadataKey({ a: 2 }));
    expect(metadataKey(undefined)).toBe("");
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => metadataKey(cycle as never)).not.toThrow();
    expect(() => metadataKey(10n as never)).not.toThrow();
  });
});

describe("an answer is dropped when its item is picked again", () => {
  it("removes the answer of that source and id, and only that one", () => {
    const answers = answersOf([
      ["a", { status: "gone" }],
      ["b", { status: "gone" }],
    ]);
    const next = withoutAnswer(answers, "items", "a");
    expect([...next.keys()]).toEqual([answerKey("items", "b")]);
    expect(withoutAnswer(next, "items", "zzz")).toBe(next);
  });
});
