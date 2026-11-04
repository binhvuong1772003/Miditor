import { emptyPage } from "@miditor/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorApi } from "./control-api";
import { attachController, controllerState, createEditor, idleView } from "./controller";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialSourcesState,
  initialViewState,
} from "./store";

const makeStore = () =>
  createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(emptyPage()),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
    ...initialSourcesState(),
  });

function stubApi() {
  const calls: string[] = [];
  const done = <R>(call: string, answer: R): R => {
    calls.push(call);
    return answer;
  };
  const api: EditorApi = {
    undo: () => done("undo", true),
    redo: () => done("redo", true),
    save: async () => done("save", true),
    select: (id) => done(`select ${id}`, true),
    clearSelection: () => done("clearSelection", true),
    setFrame: (frame) => done(`setFrame ${frame}`, true),
    setZoom: (zoom) => done(`setZoom ${zoom}`, true),
    fit: () => done("fit", true),
    addBlock: (kind) => done(`addBlock ${kind}`, "n1"),
    remove: () => done("remove", true),
    duplicate: () => done("duplicate", true),
    group: () => done("group", true),
    ungroup: () => done("ungroup", true),
    checkSources: async () => {
      done("checkSources", true);
    },
    getHistory: () => ({ past: [], future: [], index: 0 }),
    jumpTo: (index) => done(`jumpTo ${index}`, true),
    setHistory: () => done("setHistory", true),
  };
  return { api, calls };
}

afterEach(() => vi.restoreAllMocks());

describe("a controller with no editor attached", () => {
  it("does nothing, says so, and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const editor = createEditor();
    expect(editor.undo()).toBe(false);
    expect(editor.select("a")).toBe(false);
    expect(editor.addBlock("Text")).toBeNull();
    expect(await editor.save()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("has no state and an idle view", () => {
    const editor = createEditor();
    expect(controllerState(editor).snapshot()).toBeNull();
    expect(idleView).toMatchObject({
      selection: { id: null, picked: [] },
      frame: "desktop",
      zoom: 1,
      canUndo: false,
      canRedo: false,
      status: undefined,
    });
    expect(idleView.data.root.children).toEqual([]);
  });
});

describe("a controller with an editor attached", () => {
  it("hands every command to the editor", async () => {
    const editor = createEditor();
    const { api, calls } = stubApi();
    attachController(editor, { api, store: makeStore() });
    editor.undo();
    editor.select("b");
    editor.setFrame("phone");
    expect(editor.addBlock("Text")).toBe("n1");
    expect(await editor.save()).toBe(true);
    expect(calls).toEqual(["undo", "select b", "setFrame phone", "addBlock Text", "save"]);
  });

  it("refuses a second editor with an error and lets the first keep it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = createEditor();
    const first = stubApi();
    const second = stubApi();
    expect(attachController(editor, { api: first.api, store: makeStore() })).toBeTypeOf("function");
    expect(attachController(editor, { api: second.api, store: makeStore() })).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    editor.undo();
    expect(first.calls).toEqual(["undo"]);
    expect(second.calls).toEqual([]);
  });

  it("lets another editor attach after the first let go", () => {
    const editor = createEditor();
    const first = stubApi();
    const second = stubApi();
    const release = attachController(editor, { api: first.api, store: makeStore() });
    release?.();
    expect(attachController(editor, { api: second.api, store: makeStore() })).toBeTypeOf(
      "function",
    );
    editor.redo();
    expect(second.calls).toEqual(["redo"]);
  });

  it("ignores a release from an editor that no longer holds it", () => {
    const editor = createEditor();
    const first = stubApi();
    const second = stubApi();
    const releaseFirst = attachController(editor, { api: first.api, store: makeStore() });
    releaseFirst?.();
    attachController(editor, { api: second.api, store: makeStore() });
    releaseFirst?.();
    editor.undo();
    expect(second.calls).toEqual(["undo"]);
  });

  it("tells the ones listening on attach, on a change of the state and on release", () => {
    const editor = createEditor();
    const store = makeStore();
    const listener = vi.fn();
    const state = controllerState(editor);
    const stop = state.subscribe(listener);
    const release = attachController(editor, { api: stubApi().api, store });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(state.snapshot()).toBe(store.getState());
    store.setState({ zoom: 2 });
    expect(listener).toHaveBeenCalledTimes(2);
    release?.();
    expect(listener).toHaveBeenCalledTimes(3);
    expect(state.snapshot()).toBeNull();
    store.setState({ zoom: 3 });
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    attachController(editor, { api: stubApi().api, store: makeStore() });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
