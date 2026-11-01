import type { TreeNode } from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { createEditorStore } from "./create-editor-store";
import {
  addPicks,
  afterStep,
  clearPicked,
  clearSelection,
  initialSelectionState,
  reconcile,
  selectInside,
  selectionCommands,
  selectMany,
  selectManyLast,
  selectOnly,
  selectPage,
  setEditing,
  setHover,
  togglePick,
} from "./selection";
import type { SelectionState, ViewState } from "./state";
import { initialViewState } from "./view";

function node(id: string, children: TreeNode[] = []): TreeNode {
  return { id, type: "Container", props: {}, styles: {}, position: { mode: "flow" }, children };
}

// root
// ├─ a ── a1, a2
// ├─ b
// └─ c ── g ── g1
const root = node("root", [
  node("a", [node("a1"), node("a2")]),
  node("b"),
  node("c", [node("g", [node("g1")])]),
]);

const none = initialSelectionState("root");
const with_ = (changes: Partial<SelectionState>): SelectionState => ({ ...none, ...changes });

describe("selecting", () => {
  it("starts with nothing selected, working on the page", () => {
    expect(none).toEqual({
      selectedId: null,
      picked: [],
      scopeId: "root",
      hoverId: null,
      editing: null,
    });
  });

  it("selectOnly selects one block, drops the others and sets the scope", () => {
    const state = with_({ selectedId: "a", picked: ["b"], scopeId: "root" });
    expect(selectOnly(state, "g1", "g")).toMatchObject({
      selectedId: "g1",
      picked: [],
      scopeId: "g",
    });
  });

  it("selectInside sets the block and the scope without letting go of the blocks picked", () => {
    const state = with_({ selectedId: "a", picked: ["b"] });
    expect(selectInside(state, "g1", "g")).toMatchObject({
      selectedId: "g1",
      picked: ["b"],
      scopeId: "g",
    });
  });

  it("selectMany makes the first the selected one and the rest picked, keeping the scope", () => {
    const state = with_({ scopeId: "c" });
    expect(selectMany(state, ["a", "b", "c"])).toMatchObject({
      selectedId: "a",
      picked: ["b", "c"],
      scopeId: "c",
    });
    expect(selectMany(state, ["a"], "root").scopeId).toBe("root");
    expect(selectMany(state, [])).toMatchObject({ selectedId: null, picked: [] });
  });

  it("selectManyLast makes the last the selected one", () => {
    expect(selectManyLast(none, ["a", "b", "c"])).toMatchObject({
      selectedId: "c",
      picked: ["a", "b"],
    });
  });

  it("clearSelection keeps the scope and selectPage goes back to the page", () => {
    const state = with_({ selectedId: "g1", picked: [], scopeId: "g" });
    expect(clearSelection(state)).toMatchObject({ selectedId: null, scopeId: "g" });
    expect(selectPage(state, "root")).toMatchObject({ selectedId: null, scopeId: "root" });
  });

  it("addPicks leaves out the selected block, those picked already and repeats", () => {
    const state = with_({ selectedId: "a", picked: ["b"] });
    expect(addPicks(state, ["a", "b", "c", "c"]).picked).toEqual(["b", "c"]);
  });

  it("togglePick picks a block and puts it back", () => {
    const once = togglePick(with_({ selectedId: "a" }), "b");
    expect(once.picked).toEqual(["b"]);
    expect(togglePick(once, "b").picked).toEqual([]);
  });

  it("setHover and setEditing set what they are given", () => {
    expect(setHover(none, "b").hoverId).toBe("b");
    const editing = { id: "a1", prop: "text", multiline: true };
    expect(setEditing(none, editing).editing).toBe(editing);
  });

  it("every command gives back the very state when nothing changes", () => {
    const state = with_({ selectedId: "a", picked: ["b"], scopeId: "root", hoverId: "c" });
    expect(selectOnly(none, "a", "root")).not.toBe(none);
    expect(selectOnly(selectOnly(none, "a", "root"), "a", "root")).toEqual(
      selectOnly(none, "a", "root"),
    );
    const only = selectOnly(none, "a", "root");
    expect(selectOnly(only, "a", "root")).toBe(only);
    expect(selectMany(state, ["a", "b"])).toBe(state);
    expect(selectManyLast(with_({ selectedId: "b", picked: ["a"] }), ["a", "b"])).toEqual(
      with_({ selectedId: "b", picked: ["a"] }),
    );
    expect(clearSelection(none)).toBe(none);
    expect(selectPage(none, "root")).toBe(none);
    expect(addPicks(state, ["b"])).toBe(state);
    expect(clearPicked(none)).toBe(none);
    expect(setHover(state, "c")).toBe(state);
    expect(setEditing(none, null)).toBe(none);
  });
});

describe("reconcile", () => {
  it("keeps a selection whose blocks are there", () => {
    const state = with_({ selectedId: "a", picked: ["b", "c"], scopeId: "root", hoverId: "b" });
    expect(reconcile(state, root)).toBe(state);
  });

  it("lets go of a selected block that is gone, and of the blocks picked with it", () => {
    const state = with_({ selectedId: "gone", picked: ["b"] });
    expect(reconcile(state, root)).toMatchObject({ selectedId: null, picked: [] });
  });

  it("drops a picked block that is gone or that has another parent", () => {
    const state = with_({ selectedId: "a", picked: ["gone", "b", "a1"] });
    expect(reconcile(state, root).picked).toEqual(["b"]);
  });

  it("drops the selected block from the picked and a repeat", () => {
    const state = with_({ selectedId: "a", picked: ["a", "b", "b"] });
    expect(reconcile(state, root).picked).toEqual(["b"]);
  });

  it("takes the scope back to the page when its group is gone", () => {
    expect(reconcile(with_({ scopeId: "gone" }), root).scopeId).toBe("root");
    expect(reconcile(with_({ scopeId: "g" }), root).scopeId).toBe("g");
  });

  it("ends the typing, and the hover, over a block that is gone", () => {
    const state = with_({
      hoverId: "gone",
      editing: { id: "gone", prop: "text", multiline: false },
    });
    expect(reconcile(state, root)).toMatchObject({ hoverId: null, editing: null });
  });

  it("afterStep also drops the blocks picked, as the history does", () => {
    const state = with_({ selectedId: "a", picked: ["b"] });
    expect(afterStep(state, root)).toMatchObject({ selectedId: "a", picked: [] });
    expect(afterStep(with_({ selectedId: "gone" }), root).selectedId).toBeNull();
  });
});

// A tree from a list of numbers: block i + 1 is a child of the block that number picks among the
// blocks before it, the page included.
const treeOf = (parents: number[]): TreeNode => {
  const nodes = [node("root")];
  parents.forEach((pick, at) => {
    const child = node(`n${at + 1}`);
    nodes[pick % (at + 1)]?.children.push(child);
    nodes.push(child);
  });
  return nodes[0] as TreeNode;
};

const ids = fc.constantFrom("root", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "ghost");
const anyState = fc.record({
  selectedId: fc.option(ids, { nil: null }),
  picked: fc.array(ids, { maxLength: 6 }),
  scopeId: ids,
  hoverId: fc.option(ids, { nil: null }),
  editing: fc.option(
    ids.map((id) => ({ id, prop: "text", multiline: false })),
    { nil: null },
  ),
});

describe("reconcile, whatever the selection and the page", () => {
  const holds = (state: SelectionState, page: TreeNode) => {
    const exists = (id: string) => JSON.stringify(page).includes(`"id":"${id}"`);
    if (state.selectedId !== null) expect(exists(state.selectedId)).toBe(true);
    expect(exists(state.scopeId)).toBe(true);
    if (state.hoverId !== null) expect(exists(state.hoverId)).toBe(true);
    if (state.editing) expect(exists(state.editing.id)).toBe(true);
    if (state.picked.length > 0) expect(state.selectedId).not.toBeNull();
    expect(new Set(state.picked).size).toBe(state.picked.length);
    expect(state.picked).not.toContain(state.selectedId);
  };

  it("leaves a selection in which every block is in the page", () => {
    fc.assert(
      fc.property(anyState, fc.array(fc.nat(), { maxLength: 8 }), (state, parents) => {
        const page = treeOf(parents);
        holds(reconcile(state, page), page);
      }),
    );
  });

  it("keeps the blocks picked in one level, the one of the selected block", () => {
    fc.assert(
      fc.property(anyState, fc.array(fc.nat(), { maxLength: 8 }), (state, parents) => {
        const page = treeOf(parents);
        const settled = reconcile(state, page);
        const parentOfId = (id: string) => {
          const search = (at: TreeNode): string | undefined =>
            at.children.some((child) => child.id === id)
              ? at.id
              : at.children.map(search).find((found) => found !== undefined);
          return search(page);
        };
        for (const id of settled.picked) {
          expect(parentOfId(id)).toBe(parentOfId(settled.selectedId as string));
        }
      }),
    );
  });

  it("does nothing the second time", () => {
    fc.assert(
      fc.property(anyState, fc.array(fc.nat(), { maxLength: 8 }), (state, parents) => {
        const page = treeOf(parents);
        const once = reconcile(state, page);
        expect(reconcile(once, page)).toBe(once);
      }),
    );
  });

  it("holds after the page loses a block, wherever the selection was", () => {
    fc.assert(
      fc.property(
        anyState,
        fc.array(fc.nat(), { minLength: 1, maxLength: 8 }),
        fc.nat(),
        (state, parents, which) => {
          const full = treeOf(parents);
          const settled = reconcile(state, full);
          const removed = `n${(which % parents.length) + 1}`;
          const strip = (at: TreeNode): TreeNode => ({
            ...at,
            children: at.children.filter((child) => child.id !== removed).map(strip),
          });
          const smaller = strip(full);
          holds(afterStep(settled, smaller), smaller);
          holds(reconcile(settled, smaller), smaller);
        },
      ),
    );
  });
});

describe("selectionCommands", () => {
  const start = (): ViewState & SelectionState => ({
    ...initialViewState({ narrow: false }),
    ...none,
  });

  it("run the commands on the store", () => {
    const store = createEditorStore(start());
    const commands = selectionCommands(store);
    commands.selectOnly("a", "root");
    commands.addPicks(["b", "c"]);
    commands.setHover("c");
    expect(store.getState()).toMatchObject({
      selectedId: "a",
      picked: ["b", "c"],
      scopeId: "root",
      hoverId: "c",
    });
    commands.reconcile(node("root", [node("a")]));
    expect(store.getState()).toMatchObject({
      selectedId: "a",
      picked: [],
      hoverId: null,
    });
  });

  it("tell nobody when the command changes nothing", () => {
    const store = createEditorStore(start());
    const listener = vi.fn();
    store.subscribe(listener);
    const commands = selectionCommands(store);
    commands.clearSelection();
    commands.selectPage("root");
    commands.setHover(null);
    commands.reconcile(root);
    expect(listener).not.toHaveBeenCalled();
  });
});
