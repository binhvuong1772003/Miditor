import type { CommandArgs, CommandName } from "./store";

// The keys of the editor that give a command. Which key is which command is here as data; what the
// command does is in the store. Tab, Esc, Enter and the arrows stay with the canvas, which knows the
// level the person is working in.

/** The part of a keyboard event that decides the command. */
export type KeyLike = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/** A command and the value it takes, as a key gives them. */
export type KeyCommand = {
  [N in CommandName]: CommandArgs[N] extends undefined
    ? { name: N; args?: undefined }
    : { name: N; args: CommandArgs[N] };
}[CommandName];

/**
 * The command a key gives, or null. The caller stops the browser's own action on any match, also when
 * the command then has nothing to do: Ctrl+D with nothing selected must not bookmark the page.
 * `selectedId` is needed because Delete and Backspace are only ours with a block selected (Backspace
 * is "back" in some browsers). The order of the tests is the one the editor always had.
 */
export function matchKey(event: KeyLike, selectedId: string | null): KeyCommand | null {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && ["=", "+", "-", "0"].includes(event.key)) {
    return {
      name: "view.zoom",
      args: event.key === "0" ? "reset" : event.key === "-" ? "out" : "in",
    };
  }
  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    !mod &&
    !event.altKey &&
    selectedId !== null
  ) {
    return { name: "block.delete" };
  }
  const key = event.key.toLowerCase();
  if (key === "d" && mod) return { name: "block.duplicate" };
  if (key === "g" && mod) {
    return event.shiftKey ? { name: "block.ungroup" } : { name: "block.group" };
  }
  // Shift+Z redoes with or without Ctrl, and Ctrl+Y redoes where Cmd+Y does not: as it always did.
  const redoing = (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey);
  if (redoing) return { name: "history.redo" };
  if (key === "z" && mod) return { name: "history.undo" };
  return null;
}

/** The words next to a menu line or a button for the keys that give the command. */
export const KEY_HINTS = {
  "block.duplicate": "Ctrl+D",
  "block.delete": "Del",
  "block.group": "Ctrl+G",
  "block.ungroup": "Ctrl+Shift+G",
} as const satisfies Partial<Record<CommandName, string>>;
