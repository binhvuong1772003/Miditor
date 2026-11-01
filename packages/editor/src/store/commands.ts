import { type Device, findNode, type Reorder } from "@midito-kitchen/core";
import { canRedo, canUndo, redo, undo } from "../history";
import { MAX_ZOOM, MIN_ZOOM, stepZoom } from "../zoom";
import type { EditorStore } from "./create-editor-store";
import { type Env, step } from "./document";
import type { EditorState, Tool } from "./state";
import {
  deleteSelected,
  duplicateSelected,
  groupSelected,
  reorderSelected,
  type Size,
  ungroupSelected,
} from "./structure";
import { pickTool, setFrame, setZoom } from "./view";

// The commands a person can give the editor, each under a name. A key, a menu line and a button name
// the command, and `run` is the one door they all go through: that is where a rule about who may do
// what, or a message to the host, is put once instead of at every place that gives the command.

/** Zoom by one step of the ladder, or back to 100 %. */
export type ZoomMove = "in" | "out" | "reset";

/** The value each command takes. `undefined`: it takes none. */
export type CommandArgs = {
  "history.undo": undefined;
  "history.redo": undefined;
  "block.duplicate": undefined;
  "block.delete": undefined;
  "block.group": undefined;
  "block.ungroup": undefined;
  "block.reorder": Reorder;
  "view.zoom": ZoomMove;
  "view.frame": Device;
  "tool.pick": Tool;
};

export type CommandName = keyof CommandArgs;

/** The arguments of `run` after the name: none for a command that takes none. */
export type ArgsOf<N extends CommandName> = CommandArgs[N] extends undefined
  ? []
  : [args: CommandArgs[N]];

/** What a command needs from the screen, which the store does not know. */
export type CommandContext = {
  /** The size of the parent of the selected block, as it is drawn, or null when there is none. */
  parentSize(): Size | null;
  /** Words (an i18n key) for the screen reader, joined to the next announcement. */
  note(key: string): void;
};

/** What a button or a menu line looks at to be on or off: the part of the state a part already draws from. */
export type CanState = Pick<EditorState, "frame" | "selectedId" | "picked" | "history" | "zoom">;

type Spec<A> = {
  /** The new state; the very same one when there is nothing to do. */
  run(state: EditorState, args: A, env: Env, context: CommandContext): EditorState;
  /**
   * Whether a button or a line of a menu for it is on. `run` does not ask: a command that cannot do
   * anything gives the state back.
   */
  can(state: CanState, args: A): boolean;
};

const onPage = (state: CanState) => state.frame !== "phone";
const rootId = (state: CanState) => state.history.present.root.id;
/** A block other than the page is selected, on the screen where blocks can be changed. */
const hasBlock = (state: CanState) =>
  onPage(state) && state.selectedId !== null && state.selectedId !== rootId(state);

export const commandTable: { [N in CommandName]: Spec<CommandArgs[N]> } = {
  "history.undo": {
    run: (state) => step(state, undo),
    can: (state) => canUndo(state.history),
  },
  "history.redo": {
    run: (state) => step(state, redo),
    can: (state) => canRedo(state.history),
  },
  "block.duplicate": {
    run: (state, _, env, context) => {
      context.note("a11y.duplicated");
      return duplicateSelected(state, { container: context.parentSize() }, env);
    },
    can: hasBlock,
  },
  "block.delete": {
    run: (state, _, env, context) => {
      if (!onPage(state)) return state;
      context.note("a11y.deleted");
      return deleteSelected(state, env);
    },
    can: hasBlock,
  },
  "block.group": {
    run: (state, _, env, context) => groupSelected(state, { container: context.parentSize() }, env),
    can: (state) => onPage(state) && state.picked.length > 0,
  },
  "block.ungroup": {
    run: (state, _, env, context) =>
      ungroupSelected(state, { container: context.parentSize() }, env),
    can: (state) =>
      onPage(state) &&
      state.selectedId !== null &&
      findNode(state.history.present.root, state.selectedId)?.type === "Group",
  },
  "block.reorder": {
    run: (state, to, env) => reorderSelected(state, to, env),
    can: hasBlock,
  },
  "view.zoom": {
    run: (state, move) =>
      setZoom(state, (zoom) => (move === "reset" ? 1 : stepZoom(zoom, move === "in" ? 1 : -1))),
    can: (state, move) =>
      move === "in" ? state.zoom < MAX_ZOOM : move === "out" ? state.zoom > MIN_ZOOM : true,
  },
  "view.frame": {
    run: (state, frame) => setFrame(state, frame),
    can: () => true,
  },
  "tool.pick": {
    run: (state, tool) => pickTool(state, tool),
    can: () => true,
  },
};

/**
 * What a part can put in front of or behind a command. `before` is asked first and the command does
 * not run when it answers `false`; `after` is told once the command has run.
 */
export type CommandHooks = {
  before?: (name: CommandName, args: unknown, state: EditorState) => boolean | undefined;
  after?: (name: CommandName, args: unknown, state: EditorState) => void;
};

/** Whether a button or a menu line for a command is on in this state. */
export function canRun<N extends CommandName>(
  state: CanState,
  name: N,
  ...args: ArgsOf<N>
): boolean {
  const spec = commandTable[name] as Spec<CommandArgs[N]>;
  return spec.can(state, args[0] as CommandArgs[N]);
}

/**
 * The door for the commands of one store. `env`, `context` and `hooks` are read each time a command
 * runs, because the host can change the first and the screen the second. Gives back `false` for a
 * name that is not a command and for a command that `before` refused; otherwise the command ran.
 */
export function createRun(
  store: EditorStore<EditorState>,
  env: Env,
  context: () => CommandContext,
  hooks: () => CommandHooks = () => ({}),
) {
  return function run<N extends CommandName>(name: N, ...args: ArgsOf<N>): boolean {
    if (!Object.hasOwn(commandTable, name)) return false;
    const spec = commandTable[name] as Spec<CommandArgs[N]>;
    const value = args[0] as CommandArgs[N];
    const { before, after } = hooks();
    if (before?.(name, value, store.getState()) === false) return false;
    store.setState((state) => spec.run(state, value, env, context()));
    after?.(name, value, store.getState());
    return true;
  };
}

export type Run = ReturnType<typeof createRun>;
