import {
  builtInRegistry,
  emptyPage,
  insertNode,
  newNode,
  type TreeNode,
} from "@midito-kitchen/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ApiDeps, createApi } from "./control-api";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
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

  it("undo with nothing to undo returns the same state", () => {
    const { api, store } = setup();
    const before = store.getState();
    api.undo();
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

  it("save gives what the editor's save gives", async () => {
    const { api } = setup({ save: async () => true });
    expect(await api.save()).toBe(true);
  });

  it("select of an id not in the page returns the answer of the table and changes nothing", () => {
    const { api, store } = setup();
    const before = store.getState();
    api.select("nope");
    expect(store.getState().selectedId).toBe(before.selectedId);
  });
});
