import {
  applyTheme,
  colorRef,
  type PageData,
  type PageMeta,
  replaceColor,
  type SavedTheme,
  type Theme,
  tidyMeta,
} from "@miditor/core";
import type { PanelPatch } from "../patch";
import { patchChange } from "./apply-patch";
import type { EditorStore } from "./create-editor-store";
import { type Env, edit, editAndEndDraft, runner, saveWith } from "./document";
import type { State } from "./structure";

// The commands that change what a page says, not where its blocks are: the properties of a block, the
// page info, and the colours and fonts of the theme. Each is one step of history.

/** The theme without what is empty in it, or `undefined` when nothing is left. */
export function tidyTheme(theme: Theme): Theme | undefined {
  const colors = theme.colors && Object.keys(theme.colors).length > 0 ? theme.colors : undefined;
  const fonts = theme.fonts && Object.keys(theme.fonts).length > 0 ? theme.fonts : undefined;
  return colors || fonts
    ? { ...(colors ? { colors } : {}), ...(fonts ? { fonts } : {}) }
    : undefined;
}

/** The page with this theme, or without one when it is empty. */
export function withTheme(data: PageData, theme: Theme): PageData {
  const { theme: _old, ...rest } = data;
  const next = tidyTheme(theme);
  return next ? { ...rest, theme: next } : rest;
}

/** One change on one block, once. What was pending in a panel is over. */
export const commitPatch = <S extends State>(
  state: S,
  args: { id: string; patch: PanelPatch },
  env: Env,
): S => editAndEndDraft(state, patchChange(args.id, args.patch, state.frame, env.registry), env);

/** Save with what is pending in a panel stored first; it is part of what is saved. */
export const saveDraft = <S extends State>(state: S, env: Env): S => {
  const pending = state.draft;
  return saveWith(
    state,
    pending ? patchChange(pending.id, pending, state.frame, env.registry) : null,
    env,
  );
};

/** One field of the page info changed. An emptied field is removed. */
export const changeMeta = <S extends State>(
  state: S,
  patch: Partial<Record<keyof PageMeta, string | undefined>>,
  env: Env,
): S =>
  edit(
    state,
    (prev) => {
      const merged: PageMeta = { ...prev.meta };
      for (const [key, value] of Object.entries(patch) as [keyof PageMeta, string | undefined][]) {
        if (value === undefined) delete merged[key];
        else merged[key] = value;
      }
      const { meta: _old, ...rest } = prev;
      const next = tidyMeta(merged);
      return next ? { ...rest, meta: next } : rest;
    },
    env,
  );

export const setThemeColor = <S extends State>(
  state: S,
  args: { name: string; color: string },
  env: Env,
): S =>
  edit(
    state,
    (prev) =>
      withTheme(prev, {
        ...prev.theme,
        colors: { ...prev.theme?.colors, [args.name]: args.color },
      }),
    env,
  );

/** A colour renamed is followed by the blocks that used it. */
export const renameThemeColor = <S extends State>(
  state: S,
  args: { from: string; to: string },
  env: Env,
): S =>
  edit(
    state,
    (prev) => {
      const colors = Object.fromEntries(
        Object.entries(prev.theme?.colors ?? {}).map(([key, value]) => [
          key === args.from ? args.to : key,
          value,
        ]),
      );
      const renamed = withTheme(prev, { ...prev.theme, colors });
      return {
        ...renamed,
        root: replaceColor(renamed.root, env.registry, args.from, colorRef(args.to)),
      };
    },
    env,
  );

/** A colour that goes is baked into the blocks that used it. */
export const deleteThemeColor = <S extends State>(state: S, name: string, env: Env): S =>
  edit(
    state,
    (prev) => {
      const { [name]: gone, ...colors } = prev.theme?.colors ?? {};
      const kept = withTheme(prev, { ...prev.theme, colors });
      return gone === undefined
        ? kept
        : { ...kept, root: replaceColor(kept.root, env.registry, name, gone) };
    },
    env,
  );

export const setThemeFont = <S extends State>(
  state: S,
  args: { which: "body" | "heading"; stack: string | undefined },
  env: Env,
): S =>
  edit(
    state,
    (prev) => {
      const { [args.which]: _old, ...others } = prev.theme?.fonts ?? {};
      return withTheme(prev, {
        ...prev.theme,
        fonts: args.stack === undefined ? others : { ...others, [args.which]: args.stack },
      });
    },
    env,
  );

/** The colours and fonts of a theme put on the page, and the blocks that used the old ones follow. */
export const putTheme = <S extends State>(
  state: S,
  theme: Pick<SavedTheme, "colors" | "font">,
  env: Env,
): S => edit(state, (prev) => applyTheme(prev, env.registry, theme), env);

/** The commands tied to a store. */
export function contentCommands<S extends State>(store: EditorStore<S>, env: Env) {
  const run = runner(store, env);
  return {
    commitPatch: (id: string, patch: PanelPatch) =>
      run((state) => commitPatch(state, { id, patch }, env), { type: "block.edit", ids: [id] }),
    save: () => {
      const pending = store.getState().draft;
      return run((state) => saveDraft(state, env), {
        type: "block.edit",
        ids: pending ? [pending.id] : [],
      });
    },
    changeMeta: (patch: Parameters<typeof changeMeta>[1]) =>
      run((state) => changeMeta(state, patch, env), { type: "page.info", ids: [] }),
    setThemeColor: (name: string, color: string) =>
      run((state) => setThemeColor(state, { name, color }, env), { type: "page.theme", ids: [] }),
    renameThemeColor: (from: string, to: string) =>
      run((state) => renameThemeColor(state, { from, to }, env), { type: "page.theme", ids: [] }),
    deleteThemeColor: (name: string) =>
      run((state) => deleteThemeColor(state, name, env), { type: "page.theme", ids: [] }),
    setThemeFont: (which: "body" | "heading", stack: string | undefined) =>
      run((state) => setThemeFont(state, { which, stack }, env), { type: "page.theme", ids: [] }),
    putTheme: (theme: Pick<SavedTheme, "colors" | "font">) =>
      run((state) => putTheme(state, theme, env), { type: "page.theme", ids: [] }),
  };
}

export type ContentCommands = ReturnType<typeof contentCommands<State>>;
