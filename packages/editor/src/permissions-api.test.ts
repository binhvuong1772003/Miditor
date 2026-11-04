import { builtInRegistry, emptyPage, insertNode, newNode, type TreeNode } from "@miditor/core";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "./control-api";
import {
  canRun,
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialSourcesState,
  initialViewState,
  type Permissions,
} from "./store";
import { createRun } from "./store/commands";
import type { Env } from "./store/document";
import type { Denial } from "./store/permissions";
import { structureCommands } from "./store/structure";

const SIZE = { w: 680, h: 788 };

function setup(permissions?: Permissions) {
  const start = emptyPage();
  let root = start.root;
  for (const id of ["t1", "t2"]) {
    root = insertNode(root, "root", newNode(builtInRegistry, "Text", id, SIZE) as TreeNode);
  }
  const denied: Denial[] = [];
  const env: Env = {
    limit: 100,
    registry: builtInRegistry,
    permissions,
    denied: (denial) => denied.push(denial),
  };
  const store = createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState({ ...start, root }),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
    ...initialSourcesState(),
    selectedId: "t1",
  });
  const run = createRun(store, env, () => ({ parentSize: () => SIZE, note: () => {} }));
  const structure = structureCommands(store, env);
  const api = createApi({
    run,
    getState: store.getState,
    save: async () => true,
    addBlock: (kind, overrides) =>
      structure.addBlock({ kind, overrides, inside: SIZE, page: SIZE }),
    fit: () => {},
    checkSources: async () => {},
    alive: () => true,
  });
  return { store, env, api, denied, run };
}

describe("the control API under permissions", () => {
  it("editor.remove() is refused for a block that cannot be deleted and says false", () => {
    const { api, store, denied } = setup({ canDelete: false });
    expect(api.remove()).toBe(false);
    expect(store.getState().history.present.root.children).toHaveLength(2);
    expect(denied).toEqual([{ action: "delete", nodeId: "t1" }]);
  });

  it("editor.addBlock() returns null when blocks cannot be added", () => {
    const { api, store } = setup({ canAdd: false });
    expect(api.addBlock("Text")).toBeNull();
    expect(store.getState().history.present.root.children).toHaveLength(2);
  });

  it("run says false for a command the permissions refuse", () => {
    const { run } = setup({ canDuplicate: false });
    expect(run("block.duplicate")).toBe(false);
  });

  it("canRun is off for a command the permissions would refuse", () => {
    const { store } = setup({ canDelete: false, canDrag: (node) => node.id !== "t1" });
    const state = { ...store.getState(), permissions: setup({ canDelete: false }).env.permissions };
    expect(canRun(state, "block.delete")).toBe(false);
    expect(canRun({ ...state, permissions: { canDrag: false } }, "block.reorder", "front")).toBe(
      false,
    );
    expect(canRun({ ...state, permissions: undefined }, "block.delete")).toBe(true);
  });

  it("applies changed permissions to the next change", () => {
    const { api, env, store } = setup({ canDelete: false });
    expect(api.remove()).toBe(false);
    env.permissions = undefined;
    expect(api.remove()).toBe(true);
    expect(store.getState().history.present.root.children).toHaveLength(1);
  });

  it("tells the host the action and the block, once per refusal", () => {
    const told = vi.fn();
    const { api, env } = setup({ canDelete: false });
    env.denied = told;
    api.remove();
    expect(told).toHaveBeenCalledTimes(1);
    expect(told).toHaveBeenCalledWith({ action: "delete", nodeId: "t1" });
  });

  it("behaves as before with no permissions", () => {
    const { api, store, denied } = setup(undefined);
    expect(api.remove()).toBe(true);
    expect(store.getState().history.present.root.children).toHaveLength(1);
    expect(denied).toEqual([]);
  });
});
