import { builtInRegistry, emptyPage, insertNode, newNode, type TreeNode } from "@miditor/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiDeps, createApi } from "./control-api";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialSourcesState,
  initialViewState,
} from "./store";
import { createRun } from "./store/commands";
import { addBlock } from "./store/structure";

const env = { limit: 100, registry: builtInRegistry };
const SIZE = { w: 680, h: 788 };

function initial(): EditorState {
  const start = emptyPage();
  const root = insertNode(
    start.root,
    "root",
    newNode(builtInRegistry, "Text", "t1", SIZE) as TreeNode,
  );
  return {
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState({ ...start, root }),
    ...initialHostState({ hostStatus: undefined, hasSave: true }),
    ...initialSourcesState(),
  };
}

function setup(over: Partial<ApiDeps> = {}) {
  const store = createEditorStore<EditorState>(initial());
  const run = createRun(store, env, () => ({ parentSize: () => SIZE, note: () => {} }));
  const deps: ApiDeps = {
    run,
    getState: store.getState,
    save: async () => true,
    addBlock: (kind, overrides) =>
      store.setState((state) =>
        addBlock(state, { kind, overrides, inside: SIZE, page: SIZE }, env),
      ),
    fit: () => {},
    checkSources: async () => {},
    historyLimit: () => 100,
    alive: () => true,
    ...over,
  };
  return { store, run, deps, api: createApi(deps) };
}

afterEach(() => vi.restoreAllMocks());

describe("createApi", () => {
  it("undo undoes like the button", async () => {
    const a = setup();
    a.api.addBlock("Text");
    const viaApi = a.store.getState();
    expect(a.api.undo()).toBe(true);
    const b = setup();
    b.api.addBlock("Text");
    b.run("history.undo");
    expect(a.store.getState().history.present).toEqual(b.store.getState().history.present);
    expect(a.store.getState()).not.toBe(viaApi);
  });

  it("undo with nothing to undo returns false and the same state", () => {
    const { api, store } = setup();
    const before = store.getState();
    expect(api.undo()).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("addBlock returns the id of the block it made and selects it", () => {
    const { api, store } = setup();
    const id = api.addBlock("Text");
    expect(id).not.toBeNull();
    expect(store.getState().selectedId).toBe(id);
  });

  it("addBlock with an unknown kind returns null and changes nothing", () => {
    const { api, store } = setup();
    const before = store.getState();
    expect(api.addBlock("Nope")).toBeNull();
    expect(store.getState()).toBe(before);
  });

  it("a command after alive() is false returns false and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { api, store } = setup({ alive: () => false });
    const before = store.getState();
    expect(api.undo()).toBe(false);
    expect(api.select("t1")).toBe(false);
    expect(api.addBlock("Text")).toBeNull();
    expect(await api.save()).toBe(false);
    expect(store.getState()).toBe(before);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("save while the status is saving returns false", async () => {
    const save = vi.fn(async () => false);
    const { api } = setup({ save });
    expect(await api.save()).toBe(false);
  });

  it("checkSources runs the editor's check, and does nothing once the editor has closed", async () => {
    const checkSources = vi.fn(async () => {});
    let open = true;
    const { api } = setup({ checkSources, alive: () => open });
    await api.checkSources();
    expect(checkSources).toHaveBeenCalledTimes(1);
    open = false;
    await api.checkSources();
    expect(checkSources).toHaveBeenCalledTimes(1);
  });

  it("save gives what the editor's save gives", async () => {
    const { api } = setup({ save: async () => true });
    expect(await api.save()).toBe(true);
  });

  it("select of an id not in the page returns false and changes nothing", () => {
    const { api, store } = setup();
    const before = store.getState();
    expect(api.select("nope")).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("remove with nothing selected returns false", () => {
    const { api } = setup();
    expect(api.remove()).toBe(false);
  });

  describe("the steps of the history", () => {
    const blocksOf = (store: ReturnType<typeof setup>["store"]) =>
      store.getState().history.present.root.children.length;

    it("getHistory gives the steps before and after, and the index of the page that is shown", () => {
      const a = setup();
      expect(a.api.getHistory()).toEqual({ past: [], future: [], index: 0 });
      a.api.addBlock("Text");
      a.api.addBlock("Text");
      a.api.undo();
      const h = a.api.getHistory();
      expect(h.past).toHaveLength(1);
      expect(h.future).toHaveLength(1);
      expect(h.index).toBe(1);
      expect(h.past[0]).toBe(a.store.getState().history.past[0]);
    });

    it("getHistory gives arrays of its own, so changing them does not change the history", () => {
      const a = setup();
      a.api.addBlock("Text");
      a.api.getHistory().past.length = 0;
      expect(a.store.getState().history.past).toHaveLength(1);
    });

    it("jumpTo goes to a step in one move, and says false for a step that is not there or the one shown", () => {
      const a = setup();
      for (let i = 0; i < 3; i++) a.api.addBlock("Text");
      expect(blocksOf(a.store)).toBe(4);
      expect(a.api.jumpTo(1)).toBe(true);
      expect(blocksOf(a.store)).toBe(2);
      expect(a.api.getHistory().index).toBe(1);
      expect(a.api.getHistory().future).toHaveLength(2);
      expect(a.api.jumpTo(1)).toBe(false);
      expect(a.api.jumpTo(9)).toBe(false);
      expect(a.api.jumpTo(-1)).toBe(false);
      expect(a.api.jumpTo(1.5)).toBe(false);
      expect(a.api.jumpTo(3)).toBe(true);
      expect(blocksOf(a.store)).toBe(4);
    });

    it("setHistory puts other steps around the page that is shown, and leaves the page alone", () => {
      const a = setup();
      a.api.addBlock("Text");
      a.api.addBlock("Text");
      const shown = a.store.getState().history.present;
      const earlier = a.store.getState().history.past[0] as never;
      expect(a.api.setHistory({ past: [earlier], future: [] })).toBe(true);
      const h = a.store.getState().history;
      expect(h.present).toBe(shown);
      expect(h.past).toHaveLength(1);
      expect(h.future).toHaveLength(0);
    });

    it("setHistory leaves a change that is pending in a panel as it is", () => {
      const a = setup();
      a.api.addBlock("Text");
      const draft = { id: "t1", key: "prop", name: "text", value: "typing" } as const;
      a.store.setState({ draft });
      const earlier = a.store.getState().history.past[0] as never;
      expect(a.api.setHistory({ past: [earlier], future: [] })).toBe(true);
      expect(a.store.getState().draft).toEqual(draft);
    });

    it("setHistory says false, and changes nothing, for steps that are not pages", () => {
      const a = setup();
      a.api.addBlock("Text");
      const before = a.store.getState().history;
      expect(a.api.setHistory({ past: [{ nope: 1 } as never], future: [] })).toBe(false);
      expect(a.api.setHistory(null as never)).toBe(false);
      expect(a.store.getState().history).toBe(before);
    });
  });
});
