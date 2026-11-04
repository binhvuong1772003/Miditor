import { emptyPage, type PageData } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { viewOf } from "./control";
import { commit, undo } from "./history";
import {
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialSourcesState,
  initialViewState,
} from "./store";

function stateOf(page: PageData = emptyPage(), host = {}): EditorState {
  return {
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(page),
    ...initialHostState({ hostStatus: undefined, hasSave: true, ...host }),
    ...initialSourcesState(),
  };
}

const changed = (state: EditorState): EditorState => {
  const next: PageData = { ...state.history.present, meta: { title: "changed" } };
  return { ...state, history: commit(state.history, next, 100) };
};

describe("viewOf", () => {
  it("gives the page without the draft", () => {
    const state = {
      ...stateOf(),
      draft: { id: "t1", props: { text: "typing" } },
    } as unknown as EditorState;
    expect(viewOf(state).data).toBe(state.history.present);
  });

  it("canUndo and canRedo follow the history", () => {
    const start = stateOf();
    expect(viewOf(start)).toMatchObject({ canUndo: false, canRedo: false });
    const edited = changed(start);
    expect(viewOf(edited)).toMatchObject({ canUndo: true, canRedo: false });
    const back = { ...edited, history: undo(edited.history) };
    expect(viewOf(back)).toMatchObject({ canUndo: false, canRedo: true });
  });

  it("status is saved when the page is the saved one", () => {
    expect(viewOf(stateOf()).status).toBe("saved");
    expect(viewOf(stateOf(emptyPage(), { hasSave: false })).status).toBeUndefined();
  });

  it("status is unsaved after a change", () => {
    expect(viewOf(changed(stateOf())).status).toBe("unsaved");
  });

  it("selection reads the selected block and the picks", () => {
    const state = {
      ...stateOf(),
      selectedId: "b",
      picked: ["a"],
      frame: "phone",
      zoom: 0.5,
    } as const;
    const view = viewOf(state as unknown as EditorState);
    expect(view.selection).toEqual({ id: "b", picked: ["a"] });
    expect(view.frame).toBe("phone");
    expect(view.zoom).toBe(0.5);
  });
});
