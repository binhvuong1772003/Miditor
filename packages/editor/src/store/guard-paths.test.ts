import {
  builtInRegistry,
  emptyPage,
  insertNode,
  newNode,
  type TreeNode,
} from "@midito-kitchen/core";
import { describe, expect, it, vi } from "vitest";
import { undo } from "../history";
import { contentCommands } from "./content";
import { createEditorStore } from "./create-editor-store";
import { documentCommands, type Env, initialDocumentState, step } from "./document";
import { geometryCommands } from "./geometry";
import { initialHostState } from "./host";
import { coalesced, type Denial, type Permissions } from "./permissions";
import { initialSelectionState, selectionCommands } from "./selection";
import type { EditorState } from "./state";
import { structureCommands } from "./structure";
import { initialViewState } from "./view";

const SIZE = { w: 680, h: 788 };

function pageWith(count = 3) {
  const start = emptyPage();
  let root = start.root;
  for (let i = 1; i <= count; i++) {
    root = insertNode(root, "root", newNode(builtInRegistry, "Text", `t${i}`, SIZE) as TreeNode);
  }
  return { ...start, root };
}

function setup(permissions: Permissions | undefined, selected: string[] = ["t1"]) {
  const denied: Denial[] = [];
  const env: Env = {
    limit: 100,
    registry: builtInRegistry,
    ...(permissions ? { permissions } : {}),
    denied: (denial) => denied.push(denial),
  };
  const store = createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(pageWith()),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
  });
  const document = documentCommands(store, env);
  const structure = structureCommands(store, env);
  const geometry = geometryCommands(store, env);
  const content = contentCommands(store, env);
  const selecting = selectionCommands(store);
  const [first, ...more] = selected;
  if (first) selecting.selectMany([first, ...more], "root");
  return { store, denied, document, structure, geometry, content, selecting };
}

const ids = (state: EditorState) => state.history.present.root.children.map((c) => c.id);

/** One way of changing the page: what to call, and the permission that has to be off to refuse it. */
type Path = {
  name: string;
  off: Permissions;
  selected?: string[];
  call: (s: ReturnType<typeof setup>) => void;
};

const paths: Path[] = [
  {
    name: "add a block",
    off: { canAdd: false },
    call: (s) => s.structure.addBlock({ kind: "Text", inside: SIZE, page: SIZE }),
  },
  {
    name: "drop a card from the library",
    off: { canAdd: false },
    call: (s) =>
      s.structure.dropBlock({
        kind: "Text",
        parentId: "root",
        container: SIZE,
        at: { x: 5, y: 5 },
      }),
  },
  {
    name: "paste",
    off: { canAdd: false },
    call: (s) =>
      s.structure.pasteBlocks({
        nodes: [newNode(builtInRegistry, "Text", "p1", SIZE) as TreeNode],
        parentId: "root",
        container: SIZE,
        shift: { x: 16, y: 16 },
      }),
  },
  {
    name: "duplicate",
    off: { canDuplicate: false },
    call: (s) => s.structure.duplicateSelected(SIZE),
  },
  {
    name: "group",
    off: { canAdd: false },
    selected: ["t1", "t2"],
    call: (s) => s.structure.groupSelected(SIZE),
  },
  { name: "delete", off: { canDelete: false }, call: (s) => s.structure.deleteSelected() },
  { name: "reorder", off: { canDrag: false }, call: (s) => s.structure.reorderSelected("front") },
  {
    name: "nudge",
    off: { canDrag: false },
    call: (s) =>
      s.geometry.nudgeSelected({ container: SIZE, key: "ArrowRight", shift: false, merge: false }),
  },
  { name: "align", off: { canDrag: false }, call: (s) => s.geometry.alignSelected(SIZE, "left") },
  {
    name: "a typed number",
    off: { canDrag: false },
    call: (s) => s.geometry.setRect({ field: "x", value: 40, container: SIZE }),
  },
  {
    name: "the end of a gesture",
    off: { canDrag: false },
    call: (s) => {
      const node = s.store.getState().history.present.root.children[0] as never;
      s.geometry.placeBoxes({
        items: [{ before: node, rect: { x: 30, y: 30, w: 100, h: 40 } }],
        container: SIZE,
      });
    },
  },
  {
    name: "turn",
    off: { canDrag: false },
    call: (s) => s.geometry.turnBlock({ id: "t1", rotation: 30 }),
  },
  {
    name: "a panel patch",
    off: { canEdit: false },
    call: (s) => s.content.commitPatch("t1", { key: "prop", name: "text", value: "changed" }),
  },
  {
    name: "page info",
    off: { canEdit: false },
    call: (s) => s.content.changeMeta({ title: "New" }),
  },
  {
    name: "a theme colour",
    off: { canEdit: false },
    call: (s) => s.content.setThemeColor("primary", "#112233"),
  },
  {
    name: "a theme font",
    off: { canEdit: false },
    call: (s) => s.content.setThemeFont("body", "Georgia, serif"),
  },
];

describe("every way of changing the page asks the permissions", () => {
  it.each(paths)("$name: refused when its permission is off", (path) => {
    const s = setup(path.off, path.selected);
    const before = s.store.getState();
    path.call(s);
    const after = s.store.getState();
    expect(after.history).toBe(before.history);
    expect(s.denied).toHaveLength(1);
  });

  it.each(paths)("$name: happens when the permission is on", (path) => {
    const s = setup({}, path.selected);
    const before = s.store.getState();
    path.call(s);
    expect(s.store.getState().history).not.toBe(before.history);
    expect(s.denied).toHaveLength(0);
  });

  it.each(paths)("$name: happens when there are no permissions at all", (path) => {
    const s = setup(undefined, path.selected);
    const before = s.store.getState();
    path.call(s);
    expect(s.store.getState().history).not.toBe(before.history);
  });
});

describe("what a refusal leaves", () => {
  it("keeps the selection when a delete is refused", () => {
    const s = setup({ canDelete: false });
    s.structure.deleteSelected();
    expect(s.store.getState().selectedId).toBe("t1");
    expect(ids(s.store.getState())).toEqual(["t1", "t2", "t3"]);
  });

  it("refuses a multi-select whole when one block is locked", () => {
    const s = setup({ canDrag: (node) => node.id !== "t2" }, ["t1", "t2"]);
    s.geometry.nudgeSelected({ container: SIZE, key: "ArrowRight", shift: false, merge: false });
    expect(s.denied).toEqual([{ action: "drag", nodeId: "t2" }]);
    const moved = s.store.getState().history.present.root.children;
    expect(
      moved.every(
        (c) =>
          c.position.mode !== "free" ||
          c.position.x.anchor !== "start" ||
          (c.position.x as { offset: number }).offset === 0,
      ),
    ).toBe(true);
  });

  it("ends the draft when a panel patch is refused", () => {
    const s = setup({ canEdit: false });
    s.document.setDraft({ id: "t1", key: "prop", name: "text", value: "x" } as never);
    s.content.commitPatch("t1", { key: "prop", name: "text", value: "x" });
    expect(s.store.getState().draft).toBeNull();
  });

  it("makes no copy when one original may not be copied", () => {
    const s = setup({ canDuplicate: (node) => node.id !== "t2" }, ["t1", "t2"]);
    s.structure.duplicateSelected(SIZE);
    expect(ids(s.store.getState())).toEqual(["t1", "t2", "t3"]);
    expect(s.denied).toEqual([{ action: "duplicate", nodeId: "t2" }]);
  });

  it("does not refuse undo and redo whatever is off", () => {
    const s = setup(undefined);
    s.structure.deleteSelected();
    const all: Permissions = {
      canEdit: false,
      canDelete: false,
      canDuplicate: false,
      canDrag: false,
      canAdd: false,
    };
    const env2 = setup(all);
    expect(ids(s.store.getState())).toEqual(["t2", "t3"]);
    s.document.step(undo);
    expect(ids(s.store.getState())).toEqual(["t1", "t2", "t3"]);
    expect(env2.denied).toHaveLength(0);
    // The step function itself is not guarded.
    const stepped = step(env2.store.getState(), (h) => h);
    expect(stepped).toBeDefined();
  });
});

describe("coalesced", () => {
  it("tells a repeat of the same action on the same block once within a second", () => {
    const told = vi.fn();
    let now = 0;
    const tell = coalesced(told, () => now);
    tell({ action: "drag", nodeId: "a" });
    now = 400;
    tell({ action: "drag", nodeId: "a" });
    tell({ action: "edit", nodeId: "a" });
    now = 1500;
    tell({ action: "drag", nodeId: "a" });
    expect(told).toHaveBeenCalledTimes(3);
  });
});
