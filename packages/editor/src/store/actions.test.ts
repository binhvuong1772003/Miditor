import {
  builtInRegistry,
  emptyPage,
  insertNode,
  newNode,
  type PageData,
  type TreeNode,
} from "@miditor/core";
import { describe, expect, it, vi } from "vitest";
import { createRun } from "./commands";
import { contentCommands } from "./content";
import { createEditorStore } from "./create-editor-store";
import { documentCommands, type Env, initialDocumentState } from "./document";
import { initialHostState } from "./host";
import { initialSelectionState } from "./selection";
import { initialSourcesState } from "./sources";
import type { EditorState } from "./state";
import { structureCommands } from "./structure";
import { initialViewState } from "./view";

const SIZE = { w: 680, h: 788 };
const text = newNode(builtInRegistry, "Text", "t1", SIZE) as TreeNode;
const start: PageData = { ...emptyPage(), root: insertNode(emptyPage().root, "root", text) };

function setup(over: Partial<Env> = {}) {
  const onAction = vi.fn();
  const env: Env = { limit: 100, registry: builtInRegistry, onAction, ...over };
  const store = createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(start),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
    ...initialSourcesState(),
  });
  return {
    store,
    env,
    onAction,
    documents: {
      ...documentCommands(store, env),
      ...structureCommands(store, env),
      ...contentCommands(store, env),
    },
  };
}

describe("onAction", () => {
  it("is told of a change once: what was done, the page after and the page before", () => {
    const { store, documents, onAction } = setup();
    const before = store.getState().history.present;
    documents.commitPatch("t1", { key: "prop", name: "text", value: "Hello" });
    expect(onAction).toHaveBeenCalledTimes(1);
    const [action, page, prev] = onAction.mock.calls[0] ?? [];
    expect(action).toEqual({ type: "block.edit", ids: ["t1"] });
    expect(prev).toBe(before);
    expect(page).toBe(store.getState().history.present);
    expect(page).not.toBe(prev);
  });

  it("says which block an add made", () => {
    const { store, documents, onAction } = setup();
    documents.addBlock({ kind: "Text", inside: SIZE, page: SIZE });
    const newId = store.getState().selectedId;
    expect(onAction.mock.calls[0]?.[0]).toEqual({ type: "block.add", ids: [newId] });
  });

  it("names what was selected when a command works on the selection", () => {
    const { store, documents, onAction } = setup();
    store.setState({ selectedId: "t1" });
    documents.deleteSelected();
    expect(onAction.mock.calls[0]?.[0]).toEqual({ type: "block.delete", ids: ["t1"] });
  });

  it("is told of undo and redo by the name of the command", () => {
    const { store, env, documents, onAction } = setup();
    documents.commitPatch("t1", { key: "prop", name: "text", value: "Hello" });
    onAction.mockClear();
    const run = createRun(store, env, () => ({ parentSize: () => SIZE, note: () => {} }));
    run("history.undo");
    expect(onAction.mock.calls[0]?.[0].type).toBe("history.undo");
    run("history.redo");
    expect(onAction.mock.calls[1]?.[0].type).toBe("history.redo");
  });

  it("is not told when nothing changed, when a draft is only drawn, or when the change is refused", () => {
    const { documents, onAction } = setup();
    const hello = { key: "prop", name: "text", value: "Hello" } as const;
    documents.commitPatch("t1", hello);
    onAction.mockClear();
    documents.commitPatch("t1", hello);
    documents.setDraft({ id: "t1", key: "prop", name: "text", value: "typing" });
    expect(onAction).not.toHaveBeenCalled();
    const refused = setup({ permissions: { canEdit: false } });
    refused.documents.commitPatch("t1", { key: "prop", name: "text", value: "Nope" });
    expect(refused.onAction).not.toHaveBeenCalled();
  });

  it("works without a listener", () => {
    const { documents } = setup({ onAction: undefined });
    expect(() =>
      documents.commitPatch("t1", { key: "prop", name: "text", value: "x" }),
    ).not.toThrow();
  });
});

describe("onAction and a change that was pending in a panel", () => {
  const draft = { id: "t1", key: "prop", name: "text", value: "typing" } as const;

  it("tells the pending edit as its own change when a command that did nothing settled it", () => {
    const { store, documents, onAction } = setup();
    documents.setDraft(draft);
    documents.addBlock({ kind: "Nope", inside: SIZE, page: SIZE });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction.mock.calls[0]?.[0]).toEqual({ type: "block.edit", ids: ["t1"] });
    expect(store.getState().history.present.root.children[0]?.props.text).toBe("typing");
  });

  it("tells the pending edit first and the command after it, each with the pages around it", () => {
    const { store, documents, onAction } = setup();
    const before = store.getState().history.present;
    documents.setDraft(draft);
    documents.addBlock({ kind: "Text", inside: SIZE, page: SIZE });
    expect(onAction).toHaveBeenCalledTimes(2);
    const [first, second] = onAction.mock.calls;
    expect(first?.[0]).toEqual({ type: "block.edit", ids: ["t1"] });
    expect(first?.[2]).toBe(before);
    expect(second?.[0].type).toBe("block.add");
    expect(second?.[2]).toBe(first?.[1]);
    expect(second?.[1]).toBe(store.getState().history.present);
  });

  it("calls settling a pending edit a block edit of that block, and saving too", () => {
    const { documents, onAction } = setup();
    documents.setDraft(draft);
    documents.settleDraft();
    expect(onAction.mock.calls[0]?.[0]).toEqual({ type: "block.edit", ids: ["t1"] });
    onAction.mockClear();
    documents.setDraft({ ...draft, value: "more" });
    documents.save();
    expect(onAction.mock.calls[0]?.[0]).toEqual({ type: "block.edit", ids: ["t1"] });
  });
});
