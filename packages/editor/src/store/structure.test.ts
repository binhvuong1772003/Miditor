import {
  builtInRegistry,
  emptyPage,
  findNode,
  insertNode,
  newNode,
  parentOf,
  type TreeNode,
} from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { undo } from "../history";
import { createEditorStore } from "./create-editor-store";
import { type Env, initialDocumentState, setDraft, step } from "./document";
import { initialSelectionState, reconcile, selectManyLast, selectOnly } from "./selection";
import type { DocumentState, SelectionState, ViewState } from "./state";
import {
  addBlock,
  deleteSelected,
  dropBlock,
  duplicateSelected,
  groupSelected,
  pasteBlocks,
  reorderSelected,
  structureCommands,
  ungroupSelected,
} from "./structure";
import { initialViewState } from "./view";

type State = DocumentState & SelectionState & ViewState;

const env: Env = { limit: 100, registry: builtInRegistry };
const SIZE = { w: 680, h: 788 };
const START: State = {
  ...initialViewState({ narrow: false }),
  ...initialSelectionState("root"),
  ...initialDocumentState(emptyPage()),
};

const rootOf = (state: State) => state.history.present.root;
const idsOf = (state: State) => rootOf(state).children.map((child) => child.id);

/** A page with Text blocks `t1`, `t2`, `t3` on it, nothing selected. */
function withTexts(count = 3): State {
  let root = rootOf(START);
  for (let i = 1; i <= count; i++) {
    const node = newNode(builtInRegistry, "Text", `t${i}`, SIZE) as TreeNode;
    root = insertNode(root, "root", node);
  }
  return { ...START, ...initialDocumentState({ ...START.history.present, root }) };
}

const pick = (state: State, id: string, ...more: string[]): State =>
  more.length > 0 ? selectManyLast(state, [...more, id], "root") : selectOnly(state, id, "root");

describe("addBlock", () => {
  it("adds a block to the page and selects it", () => {
    const next = addBlock(START, { kind: "Text", inside: SIZE, page: SIZE }, env);
    expect(idsOf(next)).toHaveLength(1);
    expect(next.selectedId).toBe(idsOf(next)[0]);
    expect(next.scopeId).toBe("root");
    expect(next.history.past).toHaveLength(1);
  });

  it("puts the block in the selected one when that kind lets blocks in", () => {
    const box = addBlock(START, { kind: "Container", inside: SIZE, page: SIZE }, env);
    const into = addBlock(box, { kind: "Text", inside: SIZE, page: SIZE }, env);
    const containerId = box.selectedId as string;
    expect(parentOf(rootOf(into), into.selectedId as string)?.id).toBe(containerId);
    expect(into.scopeId).toBe(containerId);
  });

  it("puts the block on the page when the selected one does not take blocks", () => {
    const text = addBlock(START, { kind: "Text", inside: SIZE, page: SIZE }, env);
    const next = addBlock(text, { kind: "Text", inside: SIZE, page: SIZE }, env);
    expect(parentOf(rootOf(next), next.selectedId as string)?.id).toBe("root");
  });

  it("does nothing on the phone, and for a kind nobody registered it only stores what is pending", () => {
    const phone = { ...START, frame: "phone" as const };
    expect(addBlock(phone, { kind: "Text", inside: SIZE, page: SIZE }, env)).toBe(phone);
    expect(addBlock(START, { kind: "Nope", inside: SIZE, page: SIZE }, env)).toBe(START);
  });

  it("stores what is pending in a panel first", () => {
    const state = setDraft(withTexts(1), { id: "t1", key: "prop", name: "text", value: "Hi" });
    const next = addBlock(state, { kind: "Text", inside: SIZE, page: SIZE }, env);
    expect(next.draft).toBeNull();
    expect(findNode(rootOf(next), "t1")?.props.text).toBe("Hi");
    expect(next.history.past).toHaveLength(2);
  });
});

describe("dropBlock", () => {
  it("adds a block where the pointer was let go, inside the page", () => {
    const next = dropBlock(
      START,
      { kind: "Text", parentId: "root", container: SIZE, at: { x: 200, y: 300 } },
      env,
    );
    expect(idsOf(next)).toHaveLength(1);
    expect(next.selectedId).toBe(idsOf(next)[0]);
    const placed = dropBlock(
      START,
      { kind: "Text", parentId: "root", container: SIZE, at: null },
      env,
    );
    expect(JSON.stringify(rootOf(next).children[0]?.position)).not.toBe(
      JSON.stringify(rootOf(placed).children[0]?.position),
    );
  });

  it("does nothing for a kind nobody registered", () => {
    expect(
      dropBlock(START, { kind: "Nope", parentId: "root", container: SIZE, at: null }, env),
    ).toBe(START);
  });
});

describe("deleteSelected", () => {
  it("takes the selected block and the ones picked with it, and selects nothing", () => {
    const state = pick(withTexts(), "t1", "t2");
    const next = deleteSelected(state, env);
    expect(idsOf(next)).toEqual(["t3"]);
    expect(next.selectedId).toBeNull();
    expect(next.picked).toEqual([]);
  });

  it("drops what is pending without storing it", () => {
    const state = setDraft(pick(withTexts(), "t1"), {
      id: "t1",
      key: "prop",
      name: "text",
      value: "Hi",
    });
    const next = deleteSelected(state, env);
    expect(next.draft).toBeNull();
    expect(next.history.past).toHaveLength(state.history.past.length + 1);
  });

  it("does nothing for the page, for nothing selected and on the phone", () => {
    const state = withTexts();
    expect(deleteSelected(state, env)).toBe(state);
    expect(deleteSelected(selectOnly(state, "root", "root"), env)).toEqual(
      selectOnly(state, "root", "root"),
    );
    const phone = { ...pick(state, "t1"), frame: "phone" as const };
    expect(deleteSelected(phone, env)).toBe(phone);
  });

  it("brings the scope back to the page when the group that was the scope is gone", () => {
    const grouped = groupSelected(pick(withTexts(), "t1", "t2"), { container: SIZE }, env);
    const groupId = grouped.selectedId as string;
    const entered = { ...selectOnly(grouped, groupId, groupId) };
    expect(deleteSelected(entered, env).scopeId).toBe("root");
  });
});

describe("duplicateSelected", () => {
  it("copies each selected block and selects the copies, the last one as the main", () => {
    const next = duplicateSelected(pick(withTexts(), "t1", "t2"), { container: SIZE }, env);
    expect(idsOf(next)).toHaveLength(5);
    expect(next.picked).toHaveLength(1);
    expect(idsOf(next)).toContain(next.selectedId as string);
    expect(["t1", "t2"]).not.toContain(next.selectedId);
  });

  it("does nothing without a measure of the parent, for the page and on the phone", () => {
    const state = pick(withTexts(), "t1");
    expect(duplicateSelected(state, { container: null }, env)).toBe(state);
    const phone = { ...state, frame: "phone" as const };
    expect(duplicateSelected(phone, { container: SIZE }, env)).toBe(phone);
    const page = selectOnly(state, "root", "root");
    expect(duplicateSelected(page, { container: SIZE }, env)).toBe(page);
  });
});

describe("groupSelected and ungroupSelected", () => {
  it("make one group of the selected blocks, and take the blocks out again", () => {
    const grouped = groupSelected(pick(withTexts(), "t1", "t2"), { container: SIZE }, env);
    const groupId = grouped.selectedId as string;
    expect(findNode(rootOf(grouped), groupId)?.type).toBe("Group");
    expect(idsOf(grouped)).toEqual([groupId, "t3"]);
    expect(grouped.picked).toEqual([]);

    const apart = ungroupSelected(grouped, { container: SIZE }, env);
    expect(idsOf(apart).sort()).toEqual(["t1", "t2", "t3"]);
    expect(new Set([apart.selectedId, ...apart.picked])).toEqual(new Set(["t1", "t2"]));
  });

  it("need more than one block to group, and a group to ungroup", () => {
    const one = pick(withTexts(), "t1");
    expect(groupSelected(one, { container: SIZE }, env)).toBe(one);
    expect(ungroupSelected(one, { container: SIZE }, env)).toBe(one);
    const two = pick(withTexts(), "t1", "t2");
    expect(groupSelected(two, { container: null }, env)).toBe(two);
  });
});

describe("reorderSelected", () => {
  it("moves the block among its brothers", () => {
    const next = reorderSelected(pick(withTexts(), "t1"), "front", env);
    expect(idsOf(next)).toEqual(["t2", "t3", "t1"]);
  });

  it("gives back the very state when the block is already there", () => {
    const state = pick(withTexts(), "t3");
    expect(reorderSelected(state, "front", env)).toBe(state);
  });
});

describe("pasteBlocks", () => {
  const nodes = () => [newNode(builtInRegistry, "Text", "c1", SIZE) as TreeNode];

  it("adds the blocks to the parent, selects them, and says it did", () => {
    const done = pasteBlocks(
      withTexts(1),
      { nodes: nodes(), parentId: "root", container: SIZE, shift: { x: 16, y: 16 } },
      env,
    );
    expect(done.pasted).toBe(true);
    expect(idsOf(done.state)).toHaveLength(2);
    expect(idsOf(done.state)).toContain(done.state.selectedId as string);
  });

  it("says it did not when there is nothing to paste into", () => {
    const state = withTexts(1);
    const done = pasteBlocks(
      state,
      { nodes: nodes(), parentId: "gone", container: SIZE, shift: { x: 0, y: 0 } },
      env,
    );
    expect(done.pasted).toBe(false);
    expect(done.state).toBe(state);
  });
});

describe("structureCommands", () => {
  it("run on a store, in one change each", () => {
    const store = createEditorStore(withTexts());
    const commands = structureCommands(store, env);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((state) => pick(state, "t1", "t2"));
    listener.mockClear();
    commands.groupSelected(SIZE);
    expect(listener).toHaveBeenCalledTimes(1);
    commands.deleteSelected();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().selectedId).toBeNull();
  });
});

describe("the selection after any commands", () => {
  type Action =
    | { kind: "add"; type: "Text" | "Container" }
    | { kind: "duplicate" }
    | { kind: "delete" }
    | { kind: "group" }
    | { kind: "ungroup" }
    | { kind: "undo" }
    | { kind: "select"; at: number; more: number }
    | { kind: "reorder"; to: "front" | "back" | "forward" | "backward" };

  const action: fc.Arbitrary<Action> = fc.oneof(
    fc.record({
      kind: fc.constant("add" as const),
      type: fc.constantFrom("Text" as const, "Container" as const),
    }),
    fc.constant({ kind: "duplicate" as const }),
    fc.constant({ kind: "delete" as const }),
    fc.constant({ kind: "group" as const }),
    fc.constant({ kind: "ungroup" as const }),
    fc.constant({ kind: "undo" as const }),
    fc.record({ kind: fc.constant("select" as const), at: fc.nat(), more: fc.nat(2) }),
    fc.record({
      kind: fc.constant("reorder" as const),
      to: fc.constantFrom(
        "front" as const,
        "back" as const,
        "forward" as const,
        "backward" as const,
      ),
    }),
  );

  const allIds = (state: State) => {
    const found: string[] = [];
    const walk = (node: TreeNode) => {
      found.push(node.id);
      node.children.forEach(walk);
    };
    walk(rootOf(state));
    return found.filter((id) => id !== "root");
  };

  it("holds only blocks that are in the page, brothers of one parent", () => {
    fc.assert(
      fc.property(fc.array(action, { maxLength: 25 }), (actions) => {
        let state: State = START;
        for (const a of actions) {
          switch (a.kind) {
            case "add":
              state = addBlock(state, { kind: a.type, inside: SIZE, page: SIZE }, env);
              break;
            case "duplicate":
              state = duplicateSelected(state, { container: SIZE }, env);
              break;
            case "delete":
              state = deleteSelected(state, env);
              break;
            case "group":
              state = groupSelected(state, { container: SIZE }, env);
              break;
            case "ungroup":
              state = ungroupSelected(state, { container: SIZE }, env);
              break;
            case "undo":
              state = step(state, undo);
              break;
            case "reorder":
              state = reorderSelected(state, a.to, env);
              break;
            case "select": {
              const ids = allIds(state);
              const id = ids[a.at % Math.max(ids.length, 1)];
              if (id === undefined) break;
              const parent = parentOf(rootOf(state), id);
              const brothers = (parent?.children ?? [])
                .map((child) => child.id)
                .filter((other) => other !== id)
                .slice(0, a.more);
              state = selectManyLast(state, [...brothers, id], parent?.id ?? "root");
              break;
            }
          }
          // Settled means that reconciling finds nothing to let go of.
          expect(reconcile(state, rootOf(state))).toBe(state);
        }
      }),
      { numRuns: 200 },
    );
  });
});
