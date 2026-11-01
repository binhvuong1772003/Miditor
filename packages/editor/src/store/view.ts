import type { Device } from "@midito-kitchen/core";
import type { EditorStore } from "./create-editor-store";
import type { EditorState, Tool, ViewState } from "./state";

/**
 * The commands on the view are plain functions of the state: they give back the state they were
 * handed when there is nothing to change, so nobody is told about a change that did not happen.
 */
function change<S extends object>(state: S, changes: Partial<S>): S {
  const keys = Object.keys(changes) as (keyof S)[];
  return keys.every((key) => Object.is(state[key], changes[key]))
    ? state
    : { ...state, ...changes };
}

/** A narrow screen starts without the panel, to leave room for the page. */
export function initialViewState({ narrow }: { narrow: boolean }): ViewState {
  return { frame: "desktop", zoom: 1, tool: "blocks", panelOpen: !narrow, announcement: "" };
}

export const setFrame = <S extends ViewState>(state: S, frame: Device): S =>
  change(state, { frame } as Partial<S>);

export const setZoom = <S extends ViewState>(
  state: S,
  zoom: number | ((now: number) => number),
): S => change(state, { zoom: typeof zoom === "function" ? zoom(state.zoom) : zoom } as Partial<S>);

/** The panel of a tool, open. */
export const showTool = <S extends ViewState>(state: S, tool: Tool): S =>
  change(state, { tool, panelOpen: true } as Partial<S>);

/** A tool of the rail: the panel shows it, and pressing the one that is shown shuts the panel. */
export const pickTool = <S extends ViewState>(state: S, tool: Tool): S =>
  tool === state.tool && state.panelOpen
    ? change(state, { panelOpen: false } as Partial<S>)
    : showTool(state, tool);

/**
 * What a screen reader is told. The same words twice in a row would not be read again, so a space at
 * the end makes them new.
 */
export const announce = <S extends ViewState>(state: S, text: string): S =>
  change(state, {
    announcement: state.announcement === text ? `${text} ` : text,
  } as Partial<S>);

/** The commands tied to a store: each one is a call, so a part holds them without being drawn again. */
export function viewCommands(store: EditorStore<EditorState>) {
  const run = (command: (state: EditorState) => EditorState) => store.setState(command);
  return {
    setFrame: (frame: Device) => run((state) => setFrame(state, frame)),
    setZoom: (zoom: number | ((now: number) => number)) => run((state) => setZoom(state, zoom)),
    showTool: (tool: Tool) => run((state) => showTool(state, tool)),
    pickTool: (tool: Tool) => run((state) => pickTool(state, tool)),
    announce: (text: string) => run((state) => announce(state, text)),
  };
}

export type ViewCommands = ReturnType<typeof viewCommands>;
