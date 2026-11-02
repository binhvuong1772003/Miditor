import {
  builtInRegistry,
  emptyPage,
  insertNode,
  newNode,
  type TreeNode,
} from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { MAX_ZOOM, MIN_ZOOM } from "../zoom";
import { type CommandContext, type CommandName, canRun, commandTable, createRun } from "./commands";
import { createEditorStore } from "./create-editor-store";
import { type Env, initialDocumentState } from "./document";
import { initialHostState } from "./host";
import { initialSelectionState, selectManyLast, selectOnly } from "./selection";
import type { EditorState } from "./state";
import { initialViewState } from "./view";

const env: Env = { limit: 100, registry: builtInRegistry };
const SIZE = { w: 680, h: 788 };

function withTexts(count = 3): EditorState {
  const start = emptyPage();
  let root = start.root;
  for (let i = 1; i <= count; i++) {
    root = insertNode(root, "root", newNode(builtInRegistry, "Text", `t${i}`, SIZE) as TreeNode);
  }
  return {
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState({ ...start, root }),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
  };
}

const pick = (state: EditorState, id: string, ...more: string[]) =>
  more.length > 0 ? selectManyLast(state, [...more, id], "root") : selectOnly(state, id, "root");

function setup(initial: EditorState, hooks = {}) {
  const store = createEditorStore<EditorState>(initial);
  const context: CommandContext = { parentSize: () => SIZE, note: vi.fn() };
  const run = createRun(
    store,
    env,
    () => context,
    () => hooks,
  );
  return { store, run, context };
}

const idsOf = (state: EditorState) => state.history.present.root.children.map((c) => c.id);

describe("run", () => {
  it("gives back false and changes nothing for a name that is not a command", () => {
    const { store, run } = setup(pick(withTexts(), "t1"));
    const before = store.getState();
    const loose = run as (name: string) => boolean;
    expect(loose("block.nothing")).toBe(false);
    expect(loose("toString")).toBe(false);
    expect(store.getState()).toBe(before);
  });

  it("runs a command with the measure and the note the screen gives", () => {
    const { store, run, context } = setup(pick(withTexts(), "t1"));
    expect(run("block.duplicate")).toBe(true);
    expect(idsOf(store.getState())).toHaveLength(4);
    expect(context.note).toHaveBeenCalledWith("duplicated");
  });

  it("deletes, and does not touch the note on the phone", () => {
    const phone = { ...pick(withTexts(), "t1"), frame: "phone" as const };
    const { store, run, context } = setup(phone);
    run("block.delete");
    expect(idsOf(store.getState())).toHaveLength(3);
    expect(context.note).not.toHaveBeenCalled();
    store.setState({ frame: "desktop" });
    run("block.delete");
    expect(idsOf(store.getState())).toEqual(["t2", "t3"]);
    expect(context.note).toHaveBeenCalledWith("deleted");
  });

  it("does not run a command that `before` refuses, and says so", () => {
    const before = vi.fn(() => false);
    const after = vi.fn();
    const { store, run } = setup(pick(withTexts(), "t1"), { before, after });
    const state = store.getState();
    expect(run("block.delete")).toBe(false);
    expect(store.getState()).toBe(state);
    expect(before).toHaveBeenCalledWith("block.delete", undefined, state);
    expect(after).not.toHaveBeenCalled();
  });

  it("asks `before` with the arguments and tells `after` with the new state", () => {
    const before = vi.fn();
    const after = vi.fn();
    const { store, run } = setup(pick(withTexts(), "t1"), { before, after });
    expect(run("block.reorder", "front")).toBe(true);
    expect(before).toHaveBeenCalledWith("block.reorder", "front", expect.anything());
    expect(after).toHaveBeenCalledWith("block.reorder", "front", store.getState());
    expect(idsOf(store.getState())).toEqual(["t2", "t3", "t1"]);
  });

  it("takes the hooks and the measure at the time it runs, not when it was made", () => {
    const { store, run } = setup(pick(withTexts(), "t1"));
    let refuse = false;
    const hooks = { before: () => !refuse };
    const door = createRun(
      store,
      env,
      () => ({ parentSize: () => SIZE, note: () => {} }),
      () => hooks,
    );
    expect(door("view.zoom", "in")).toBe(true);
    refuse = true;
    expect(door("view.zoom", "in")).toBe(false);
    expect(run("view.zoom", "reset")).toBe(true);
  });

  it("gives back the very same state for a command that has nothing to do", () => {
    const { store, run } = setup(withTexts());
    const state = store.getState();
    run("block.delete");
    run("block.group");
    run("block.ungroup");
    run("block.reorder", "front");
    run("view.zoom", "reset");
    run("history.undo");
    expect(store.getState()).toBe(state);
  });
});

describe("the view commands", () => {
  it("zoom on the ladder and back to 100 %", () => {
    const { store, run } = setup(withTexts());
    run("view.zoom", "in");
    expect(store.getState().zoom).toBe(1.25);
    run("view.zoom", "out");
    run("view.zoom", "out");
    expect(store.getState().zoom).toBe(0.75);
    run("view.zoom", "reset");
    expect(store.getState().zoom).toBe(1);
  });

  it("change the frame and the tool, and a second press on the shown tool shuts the panel", () => {
    const { store, run } = setup(withTexts());
    run("view.frame", "phone");
    expect(store.getState().frame).toBe("phone");
    run("tool.pick", "layers");
    expect(store.getState()).toMatchObject({ tool: "layers", panelOpen: true });
    run("tool.pick", "layers");
    expect(store.getState().panelOpen).toBe(false);
  });
});

describe("history", () => {
  it("steps back and forward", () => {
    const { store, run } = setup(pick(withTexts(), "t1"));
    run("block.delete");
    expect(idsOf(store.getState())).toEqual(["t2", "t3"]);
    run("history.undo");
    expect(idsOf(store.getState())).toEqual(["t1", "t2", "t3"]);
    run("history.redo");
    expect(idsOf(store.getState())).toEqual(["t2", "t3"]);
  });

  it("drops what is pending even with nothing to undo, as the key always did", () => {
    const start = pick(withTexts(), "t1");
    const { store, run } = setup({
      ...start,
      draft: { id: "t1", key: "prop", name: "text", value: "x" },
    });
    expect(canRun(store.getState(), "history.undo")).toBe(false);
    run("history.undo");
    expect(store.getState().draft).toBeNull();
  });
});

describe("select, clear and zoom to", () => {
  it("selects a block alone, with its parent as the scope", () => {
    const { store, run } = setup(pick(withTexts(), "t1", "t2"));
    expect(run("selection.select", "t3")).toBe(true);
    const state = store.getState();
    expect(state.selectedId).toBe("t3");
    expect(state.picked).toEqual([]);
    expect(state.scopeId).toBe("root");
  });

  it("gives the same state for an id that is not in the page", () => {
    const { store, run } = setup(withTexts());
    const before = store.getState();
    run("selection.select", "nope");
    expect(store.getState()).toBe(before);
    expect(canRun(before, "selection.select", "nope")).toBe(false);
  });

  it("lets go of the selection and the picks, and the scope stays", () => {
    const { store, run } = setup(pick(withTexts(), "t1", "t2"));
    run("selection.clear");
    const state = store.getState();
    expect(state.selectedId).toBeNull();
    expect(state.picked).toEqual([]);
    expect(state.scopeId).toBe("root");
  });

  it("zooms to a value and keeps it inside the ladder", () => {
    const { store, run } = setup(withTexts());
    run("view.zoomTo", 0.8);
    expect(store.getState().zoom).toBe(0.8);
    run("view.zoomTo", 99);
    expect(store.getState().zoom).toBe(MAX_ZOOM);
    run("view.zoomTo", 0);
    expect(store.getState().zoom).toBe(MIN_ZOOM);
    const before = store.getState();
    run("view.zoomTo", Number.NaN);
    expect(store.getState()).toBe(before);
  });
});

// A button or a menu line that is off must be one that could do nothing.
describe("canRun and the command agree", () => {
  const states = fc
    .record({
      frame: fc.constantFrom("desktop" as const, "phone" as const),
      selected: fc.constantFrom(null, "root", "t1", "t2", "t3"),
      more: fc.boolean(),
      zoom: fc.constantFrom(0.25, 1, 2),
    })
    .map(({ frame, selected, more, zoom }) => {
      const base = { ...withTexts(), frame, zoom };
      if (selected === null) return base;
      return more && selected !== "root" && selected !== "t3"
        ? pick(base, selected, "t3")
        : selectOnly(base, selected, "root");
    });

  const calls: [CommandName, unknown][] = [
    ["block.duplicate", undefined],
    ["block.delete", undefined],
    ["block.group", undefined],
    ["block.ungroup", undefined],
    ["block.reorder", "front"],
    ["block.reorder", "backward"],
    ["view.zoom", "in"],
    ["view.zoom", "out"],
    ["selection.select", "nope"],
    ["selection.clear", undefined],
    ["view.zoomTo", 1],
  ];

  it.each(calls)("%s %s: when it is off, the state comes back as it was", (name, args) => {
    fc.assert(
      fc.property(states, (state) => {
        const spec = commandTable[name] as {
          can(s: EditorState, a: unknown): boolean;
          run(s: EditorState, a: unknown, e: Env, c: CommandContext): EditorState;
        };
        if (spec.can(state, args)) return true;
        const context: CommandContext = { parentSize: () => SIZE, note: () => {} };
        // The note of duplicate is no state; the state is what has to stay.
        return spec.run(state, args, env, context) === state;
      }),
    );
  });
});
