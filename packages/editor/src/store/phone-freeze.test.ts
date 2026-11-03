import {
  builtInRegistry,
  emptyPage,
  type FreeNode,
  insertNode,
  newNode,
  type TreeNode,
} from "@miditor/core";
import { describe, expect, it } from "vitest";
import { undo } from "../history";
import type { Measured } from "../phone-freeze";
import { createEditorStore } from "./create-editor-store";
import { documentCommands, type Env, initialDocumentState } from "./document";
import { geometryCommands } from "./geometry";
import { initialHostState } from "./host";
import type { Permissions } from "./permissions";
import { initialSelectionState, selectionCommands } from "./selection";
import type { EditorState } from "./state";
import { initialViewState, viewCommands } from "./view";

const SIZE = { w: 375, h: 812 };

const drawn = new Map<string, Measured>([
  ["t1", { x: 16, y: 16, w: 343, h: 60 }],
  ["t2", { x: 16, y: 92, w: 343, h: 60 }],
]);

function setup(
  options: { measure?: boolean; permissions?: Permissions; frame?: "phone" | "desktop" } = {},
) {
  const env: Env = {
    limit: 100,
    registry: builtInRegistry,
    ...(options.permissions ? { permissions: options.permissions } : {}),
    ...(options.measure === false ? {} : { measurePhone: () => drawn }),
  };
  let root = emptyPage().root;
  for (const id of ["t1", "t2"]) {
    root = insertNode(root, "root", newNode(builtInRegistry, "Text", id, SIZE) as TreeNode);
  }
  const store = createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState({ ...emptyPage(), root }),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
  });
  documentCommands(store, env);
  viewCommands(store).setFrame(options.frame ?? "phone");
  selectionCommands(store).selectMany(["t1"], "root");
  return { store, geometry: geometryCommands(store, env) };
}

const phoneBoxes = (state: EditorState) =>
  state.history.present.root.children.map((c) => (c as FreeNode).phone);
const move = (s: ReturnType<typeof setup>) =>
  s.geometry.nudgeSelected({ container: SIZE, key: "ArrowRight", shift: false, merge: false });

describe("the first change of the phone layout of a page drawn as a flow", () => {
  it("places every block where it is drawn, and then moves the block", () => {
    const s = setup();
    move(s);
    const [first, second] = phoneBoxes(s.store.getState());
    expect(second?.y).toEqual({ anchor: "start", offset: 92 });
    expect(first?.x).toEqual({ anchor: "start", offset: 17 });
  });

  it("is one step of history with the change: one undo goes back to the flow", () => {
    const s = setup();
    move(s);
    expect(s.store.getState().history.past).toHaveLength(1);
    s.store.setState((state) => ({ ...state, history: undo(state.history) }));
    expect(phoneBoxes(s.store.getState())).toEqual([undefined, undefined]);
  });

  it("is not done on the desktop", () => {
    const s = setup({ frame: "desktop" });
    move(s);
    expect(phoneBoxes(s.store.getState())).toEqual([undefined, undefined]);
  });

  it("is not done without a measure", () => {
    const s = setup({ measure: false });
    move(s);
    // Only the block that was moved has a place of its own; the other one is not placed.
    const [moved, other] = phoneBoxes(s.store.getState());
    expect(moved).toBeDefined();
    expect(other).toBeUndefined();
  });

  it("is not done once a block has a place of its own for the phone", () => {
    const s = setup();
    move(s);
    const before = s.store.getState().history.past.length;
    move(s);
    expect(s.store.getState().history.past).toHaveLength(before + 1);
  });

  it("leaves the page a flow when the change was refused", () => {
    const s = setup({ permissions: { canDrag: false } });
    move(s);
    expect(phoneBoxes(s.store.getState())).toEqual([undefined, undefined]);
    expect(s.store.getState().history.past).toHaveLength(0);
  });

  it("leaves the page a flow when the change did nothing", () => {
    const s = setup();
    s.geometry.setRect({ field: "x", value: Number.NaN, container: SIZE });
    expect(phoneBoxes(s.store.getState())).toEqual([undefined, undefined]);
  });
});
