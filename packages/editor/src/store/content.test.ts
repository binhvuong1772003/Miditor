import {
  builtInRegistry,
  colorRef,
  emptyPage,
  findNode,
  insertNode,
  newNode,
  type PageData,
  type TreeNode,
} from "@midito-kitchen/core";
import { describe, expect, it, vi } from "vitest";
import {
  changeMeta,
  commitPatch,
  contentCommands,
  deleteThemeColor,
  putTheme,
  renameThemeColor,
  saveDraft,
  setThemeColor,
  setThemeFont,
  tidyTheme,
  withTheme,
} from "./content";
import { createEditorStore } from "./create-editor-store";
import { type Env, initialDocumentState, setDraft } from "./document";
import { initialSelectionState } from "./selection";
import type { State } from "./structure";
import { initialViewState } from "./view";

const env: Env = { limit: 100, registry: builtInRegistry };
const SIZE = { w: 680, h: 788 };

/** A page with a theme of two colours and a Text block `t1` that uses the colour `primary`. */
function themed(): State {
  const text = newNode(builtInRegistry, "Text", "t1", SIZE) as TreeNode;
  const root = insertNode(emptyPage().root, "root", {
    ...text,
    props: { ...text.props, color: colorRef("primary") },
  });
  const page: PageData = {
    ...emptyPage(),
    root,
    theme: { colors: { primary: "#2563eb", accent: "#e11d48" }, fonts: { body: "Inter" } },
  };
  return {
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(page),
  };
}

const pageOf = (state: State) => state.history.present;
const colourOf = (state: State) => findNode(pageOf(state).root, "t1")?.props.color;

describe("tidyTheme and withTheme", () => {
  it("leave out what is empty, and the whole theme when nothing is left", () => {
    expect(tidyTheme({ colors: {}, fonts: {} })).toBeUndefined();
    expect(tidyTheme({ colors: { a: "#fff" }, fonts: {} })).toEqual({ colors: { a: "#fff" } });
    expect(withTheme(emptyPage(), {}).theme).toBeUndefined();
  });
});

describe("changeMeta", () => {
  it("sets a field of the page info and removes an emptied one", () => {
    const state = themed();
    const titled = changeMeta(state, { title: "Hello", description: "Words" }, env);
    expect(pageOf(titled).meta).toEqual({ title: "Hello", description: "Words" });
    const cleared = changeMeta(titled, { description: undefined }, env);
    expect(pageOf(cleared).meta).toEqual({ title: "Hello" });
    expect(pageOf(changeMeta(cleared, { title: undefined }, env)).meta).toBeUndefined();
  });

  it("is one step", () => {
    const titled = changeMeta(themed(), { title: "Hello" }, env);
    expect(titled.history.past).toHaveLength(1);
  });
});

describe("the colours of the theme", () => {
  it("sets a colour", () => {
    const next = setThemeColor(themed(), { name: "paper", color: "#ffffff" }, env);
    expect(pageOf(next).theme?.colors).toMatchObject({ paper: "#ffffff", primary: "#2563eb" });
  });

  it("follows a renamed colour in the blocks that used it", () => {
    const next = renameThemeColor(themed(), { from: "primary", to: "brand" }, env);
    expect(pageOf(next).theme?.colors).toEqual({ brand: "#2563eb", accent: "#e11d48" });
    expect(colourOf(next)).toBe(colorRef("brand"));
  });

  it("bakes a deleted colour into the blocks that used it", () => {
    const next = deleteThemeColor(themed(), "primary", env);
    expect(pageOf(next).theme?.colors).toEqual({ accent: "#e11d48" });
    expect(colourOf(next)).toBe("#2563eb");
  });

  it("takes the theme away when the last colour and font are gone", () => {
    let state = deleteThemeColor(themed(), "primary", env);
    state = deleteThemeColor(state, "accent", env);
    state = setThemeFont(state, { which: "body", stack: undefined }, env);
    expect(pageOf(state).theme).toBeUndefined();
  });

  it("stores nothing for a colour that is not there", () => {
    const state = themed();
    const next = deleteThemeColor(state, "nope", env);
    expect(pageOf(next)).toEqual(pageOf(state));
  });
});

describe("the fonts of the theme", () => {
  it("sets a font and takes it back", () => {
    const state = themed();
    const set = setThemeFont(state, { which: "heading", stack: "Lora" }, env);
    expect(pageOf(set).theme?.fonts).toEqual({ body: "Inter", heading: "Lora" });
    const off = setThemeFont(set, { which: "body", stack: undefined }, env);
    expect(pageOf(off).theme?.fonts).toEqual({ heading: "Lora" });
  });
});

describe("putTheme", () => {
  it("puts the colours and the font of a theme on the page", () => {
    const next = putTheme(
      themed(),
      { colors: { primary: "#000000", paper: "#eeeeee" }, font: "Lora" },
      env,
    );
    expect(pageOf(next).theme?.colors).toMatchObject({ primary: "#000000", paper: "#eeeeee" });
    expect(next.history.past).toHaveLength(1);
  });
});

describe("commitPatch and saveDraft", () => {
  const patch = { key: "prop", name: "text", value: "Hello" } as const;

  it("stores a patch on a block and ends what was pending", () => {
    const state = setDraft(themed(), { id: "t1", ...patch });
    const next = commitPatch(state, { id: "t1", patch }, env);
    expect(findNode(pageOf(next).root, "t1")?.props.text).toBe("Hello");
    expect(next.draft).toBeNull();
  });

  it("ends what was pending even when the patch changes nothing", () => {
    const state = setDraft(themed(), {
      id: "t1",
      key: "prop",
      name: "color",
      value: colorRef("primary"),
    });
    const next = commitPatch(
      state,
      { id: "t1", patch: { key: "prop", name: "color", value: colorRef("primary") } },
      env,
    );
    expect(next.draft).toBeNull();
    expect(next.history.past).toHaveLength(0);
  });

  it("saves the pending patch with the page, and the page counts as saved", () => {
    const state = setDraft(themed(), { id: "t1", ...patch });
    const saved = saveDraft(state, env);
    expect(findNode(pageOf(saved).root, "t1")?.props.text).toBe("Hello");
    expect(saved.savedPage).toBe(pageOf(saved));
    expect(saved.draft).toBeNull();
  });

  it("saves the page as it is when nothing is pending", () => {
    const state = themed();
    const saved = saveDraft(setThemeColor(state, { name: "x", color: "#111111" }, env), env);
    expect(saved.savedPage).toBe(pageOf(saved));
  });
});

describe("contentCommands", () => {
  it("run on a store, one change each", () => {
    const store = createEditorStore(themed());
    const commands = contentCommands(store, env);
    const listener = vi.fn();
    store.subscribe(listener);
    commands.renameThemeColor("primary", "brand");
    expect(listener).toHaveBeenCalledTimes(1);
    commands.deleteThemeColor("nope");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
