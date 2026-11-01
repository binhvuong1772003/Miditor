import { emptyPage, type PageData } from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { redo, undo } from "../history";
import { createEditorStore } from "./create-editor-store";
import {
  documentCommands,
  edit,
  editAndEndDraft,
  editInLastStep,
  initialDocumentState,
  markSaved,
  saveWith,
  setDraft,
  step,
} from "./document";
import { initialSelectionState } from "./selection";
import type { DocumentState, Draft, SelectionState } from "./state";

type State = DocumentState & SelectionState;

const page = emptyPage();
const titled =
  (title: string) =>
  (p: PageData): PageData => ({ ...p, meta: { title } });
const start = (): State => ({ ...initialDocumentState(page), ...initialSelectionState("root") });
const draft: Draft = { id: "root", key: "minHeight", value: 400 };
const LIMIT = 100;

describe("a page just opened", () => {
  it("has nothing to undo, no draft and counts as saved", () => {
    const state = initialDocumentState(page);
    expect(state.history).toEqual({ past: [], present: page, future: [] });
    expect(state.savedPage).toBe(page);
    expect(state.draft).toBeNull();
    expect(state.waiting).toBe(false);
  });
});

describe("edit", () => {
  it("stores a change as one step", () => {
    const next = edit(start(), titled("a"), LIMIT);
    expect(next.history.past).toEqual([page]);
    expect(next.history.present.meta?.title).toBe("a");
  });

  it("is no step, and gives back the very state, when the change leaves the page as it was", () => {
    const state = start();
    expect(edit(state, (p) => p, LIMIT)).toBe(state);
  });

  it("drops the steps that went before the limit", () => {
    let state = start();
    for (const title of ["a", "b", "c", "d"]) state = edit(state, titled(title), 2);
    expect(state.history.past).toHaveLength(2);
  });

  it("leaves the draft and the saved page alone", () => {
    const state = setDraft(start(), draft);
    const next = edit(state, titled("a"), LIMIT);
    expect(next.draft).toBe(draft);
    expect(next.savedPage).toBe(page);
  });

  it("is told the page of the present, not an older one", () => {
    const one = edit(start(), titled("a"), LIMIT);
    const seen = vi.fn((p: PageData) => p);
    edit(one, seen, LIMIT);
    expect(seen).toHaveBeenCalledWith(one.history.present);
  });
});

describe("editAndEndDraft", () => {
  it("stores the change and ends the draft in one go", () => {
    const next = editAndEndDraft(setDraft(start(), draft), titled("a"), LIMIT);
    expect(next.history.present.meta?.title).toBe("a");
    expect(next.draft).toBeNull();
  });

  it("ends the draft even when the change leaves the page as it was", () => {
    const next = editAndEndDraft(setDraft(start(), draft), (p) => p, LIMIT);
    expect(next.draft).toBeNull();
    expect(next.history.past).toHaveLength(0);
  });
});

describe("editInLastStep", () => {
  it("adds to the step before it instead of making a new one", () => {
    const once = edit(start(), titled("a"), LIMIT);
    const twice = editInLastStep(once, titled("b"), LIMIT);
    expect(twice.history.past).toHaveLength(1);
    expect(twice.history.present.meta?.title).toBe("b");
  });
});

describe("step", () => {
  it("goes back and forward, and drops the draft", () => {
    const state = setDraft(edit(start(), titled("a"), LIMIT), draft);
    const back = step(state, undo);
    expect(back.history.present).toBe(page);
    expect(back.draft).toBeNull();
    expect(step(back, redo).history.present.meta?.title).toBe("a");
  });

  it("keeps the selection while its block is there and lets go of it when it is not", () => {
    const node = {
      id: "n1",
      type: "Container",
      props: {},
      styles: {},
      position: { mode: "flow" as const },
      children: [],
    };
    const withBlock = edit(
      start(),
      (p) => ({ ...p, root: { ...p.root, children: [node] } }),
      LIMIT,
    );
    const selected = { ...withBlock, selectedId: "n1", picked: ["x"] };
    const kept = step(edit(selected, titled("a"), LIMIT), undo);
    expect(kept.selectedId).toBe("n1");
    expect(kept.picked).toEqual([]);
    expect(step(selected, undo).selectedId).toBeNull();
  });

  it("changes the history and the selection in one change", () => {
    const store = createEditorStore(start());
    const commands = documentCommands(store, { limit: LIMIT });
    commands.edit(titled("a"));
    const listener = vi.fn();
    store.subscribe(listener);
    commands.step(undo);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("markSaved and saveWith", () => {
  it("counts the page as it is as saved", () => {
    const edited = edit(start(), titled("a"), LIMIT);
    expect(edited.savedPage).toBe(page);
    expect(markSaved(edited).savedPage).toBe(edited.history.present);
  });

  it("is clean again when undo brings back the page that was saved", () => {
    const saved = markSaved(edit(start(), titled("a"), LIMIT));
    const away = step(edit(saved, titled("b"), LIMIT), undo);
    expect(away.history.present).toBe(saved.savedPage);
  });

  it("stores what is pending first, and that page is the one counted as saved", () => {
    const state = setDraft(start(), draft);
    const next = saveWith(state, titled("a"), LIMIT);
    expect(next.history.present.meta?.title).toBe("a");
    expect(next.savedPage).toBe(next.history.present);
    expect(next.draft).toBeNull();
  });

  it("counts the page as saved when there is nothing pending", () => {
    const edited = edit(start(), titled("a"), LIMIT);
    const next = saveWith(edited, null, LIMIT);
    expect(next.savedPage).toBe(edited.history.present);
    expect(next.history).toBe(edited.history);
  });
});

describe("the history, whatever is done", () => {
  it("never keeps more steps than the limit and comes back to the same page by undo and redo", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 4 }), { minLength: 1, maxLength: 12 }),
        fc.integer({ min: 1, max: 6 }),
        (titles, limit) => {
          let state = start();
          for (const title of titles) state = edit(state, titled(title), limit);
          expect(state.history.past.length).toBeLessThanOrEqual(limit);
          const end = state.history.present;
          let back = state;
          for (let i = 0; i < titles.length; i++) back = step(back, undo);
          let forth = back;
          for (let i = 0; i < titles.length; i++) forth = step(forth, redo);
          // Going back as far as the limit allows and forward again ends on the page we left.
          expect(forth.history.present).toBe(end);
        },
      ),
    );
  });
});

describe("documentCommands", () => {
  it("run the commands on the store and read the limit when they run", () => {
    const env = { limit: 1 };
    const store = createEditorStore(start());
    const commands = documentCommands(store, env);
    commands.edit(titled("a"));
    commands.edit(titled("b"));
    expect(store.getState().history.past).toHaveLength(1);
    env.limit = 5;
    commands.edit(titled("c"));
    expect(store.getState().history.past).toHaveLength(2);
  });

  it("tell nobody when the change leaves the page as it was", () => {
    const store = createEditorStore(start());
    const listener = vi.fn();
    store.subscribe(listener);
    const commands = documentCommands(store, { limit: LIMIT });
    commands.edit((p) => p);
    commands.setDraft(null);
    commands.setWaiting(false);
    commands.saveWith(null);
    expect(listener).not.toHaveBeenCalled();
  });
});
