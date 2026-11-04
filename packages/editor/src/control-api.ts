import type { NewNodeOverrides, PageData } from "@miditor/core";
import { parseHistory } from "./open-history";
import { type ArgsOf, type CommandName, canRun, type EditorState, type Run } from "./store";

/** The commands a host can give the editor from code. Each says whether it did something. */
export interface EditorApi {
  /** @stable Undo the last change, like the button. */
  undo(): boolean;
  /** @stable Redo the change that was undone. */
  redo(): boolean;
  /** @stable Save like the Save button: `true` once `onSave` has settled, `false` when it could not run. */
  save(): Promise<boolean>;
  /** @stable Select a block by id; `false` for an id that is not in the page. */
  select(id: string): boolean;
  /** @experimental Let go of the selection. */
  clearSelection(): boolean;
  /** @stable Show the page for the desktop or the phone. */
  setFrame(frame: "desktop" | "phone"): boolean;
  /** @experimental Zoom the canvas; a value outside the ladder is clamped. */
  setZoom(zoom: number): boolean;
  /** @experimental Zoom so the page fits the room. */
  fit(): boolean;
  /** @experimental A new block of `kind`, selected. Its id, or `null` when nothing was added. */
  addBlock(kind: string, overrides?: NewNodeOverrides): string | null;
  /** @experimental Delete the selected block. */
  remove(): boolean;
  /** @experimental Duplicate the selected block. */
  duplicate(): boolean;
  /** @experimental Group the picked blocks. */
  group(): boolean;
  /** @experimental Ungroup the selected group. */
  ungroup(): boolean;
  /**
   * @experimental Check the items the page stores from the host's sources again, like when the page opens;
   * settled once the answers are in. What changed is shown, not applied.
   */
  checkSources(): Promise<void>;
  /**
   * @experimental The steps of the history, to keep them (with the page) and open them again as
   * `initialHistory`. `past` has the oldest step first, `future` the nearest first; `index` is the step the
   * page shown is, counted in `[...past, page, ...future]` (it is `past.length`). Arrays of their own: the
   * pages are the ones the history holds. Every step is a whole page, so keep only the last few.
   */
  getHistory(): { past: PageData[]; future: PageData[]; index: number };
  /**
   * @experimental Go to the step at `index` of `[...past, page, ...future]` in one move: nothing is drawn in
   * between, and undo and redo go on from there. `false` for a step that is not there or the one shown.
   */
  jumpTo(index: number): boolean;
  /**
   * @experimental Put these steps before and after the page shown, in place of the ones there are. The page
   * itself does not change. Pages are opened like `data` is; if one cannot be opened nothing changes and
   * the answer is `false`. The newest `historyLimit` steps of `past` are kept.
   */
  setHistory(history: { past?: readonly PageData[]; future?: readonly PageData[] }): boolean;
}

/** What the editor gives to make the object: its own code, so a button and the host share it. */
export type ApiDeps = {
  run: Run;
  getState(): EditorState;
  /** The editor's own save, `false` when it cannot run. */
  save(): Promise<boolean>;
  /** The editor's own add (it measures the screen). */
  addBlock(kind: string, overrides?: NewNodeOverrides): void;
  fit(): void;
  /** The editor's own check of the stored items. */
  checkSources(): Promise<void>;
  /** How many steps of history are kept (`historyLimit`). */
  historyLimit(): unknown;
  /** False once the editor has unmounted. */
  alive(): boolean;
};

export function createApi(deps: ApiDeps): EditorApi {
  let warned = false;
  const live = (): boolean => {
    if (deps.alive()) return true;
    if (!warned) {
      warned = true;
      console.warn("[miditor] an editor command was called after the editor went away: ignored");
    }
    return false;
  };
  // A command that cannot do anything now (nothing to undo, no block selected) says `false`, like the
  // button that would be off.
  const go = <N extends CommandName>(name: N, ...args: ArgsOf<N>): boolean =>
    live() && canRun(deps.getState(), name, ...args) && deps.run(name, ...args);
  return {
    undo: () => go("history.undo"),
    redo: () => go("history.redo"),
    save: async () => (live() ? await deps.save() : false),
    select: (id) => go("selection.select", id),
    clearSelection: () => go("selection.clear"),
    setFrame: (frame) => go("view.frame", frame),
    setZoom: (zoom) => go("view.zoomTo", zoom),
    fit: () => {
      if (!live()) return false;
      deps.fit();
      return true;
    },
    addBlock: (kind, overrides) => {
      if (!live()) return null;
      const before = deps.getState().history.present;
      deps.addBlock(kind, overrides);
      const after = deps.getState();
      return after.history.present !== before ? after.selectedId : null;
    },
    remove: () => go("block.delete"),
    duplicate: () => go("block.duplicate"),
    group: () => go("block.group"),
    ungroup: () => go("block.ungroup"),
    getHistory: () => {
      const { past, future } = deps.getState().history;
      return { past: [...past], future: [...future], index: past.length };
    },
    jumpTo: (index) => go("history.jump", index),
    setHistory: (history) => {
      if (!live()) return false;
      const steps = parseHistory(history, deps.getState().history.present, deps.historyLimit());
      return steps !== null && go("history.set", steps);
    },
    checkSources: async () => {
      if (live()) await deps.checkSources();
    },
  };
}
