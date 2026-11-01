import { describe, expect, it } from "vitest";
import { type KeyLike, matchKey } from "./keymap";
import { commandTable } from "./store/commands";

const press = (key: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});
const ctrl = { ctrlKey: true };
const cmd = { metaKey: true };

describe("matchKey", () => {
  it("duplicates and groups with Ctrl or Cmd, and ungroups with Shift", () => {
    expect(matchKey(press("d", ctrl), null)).toEqual({ name: "block.duplicate" });
    expect(matchKey(press("D", cmd), null)).toEqual({ name: "block.duplicate" });
    expect(matchKey(press("g", ctrl), null)).toEqual({ name: "block.group" });
    expect(matchKey(press("G", { ...cmd, shiftKey: true }), null)).toEqual({
      name: "block.ungroup",
    });
    expect(matchKey(press("d"), null)).toBeNull();
  });

  it("undoes with Ctrl or Cmd+Z and redoes with Shift+Ctrl+Z or Ctrl+Y", () => {
    expect(matchKey(press("z", ctrl), null)).toEqual({ name: "history.undo" });
    expect(matchKey(press("z", cmd), null)).toEqual({ name: "history.undo" });
    expect(matchKey(press("Z", { ...ctrl, shiftKey: true }), null)).toEqual({
      name: "history.redo",
    });
    expect(matchKey(press("y", ctrl), null)).toEqual({ name: "history.redo" });
    expect(matchKey(press("y", cmd), null)).toBeNull();
  });

  it("keeps the old reading of Shift+Z, which redoes without Ctrl", () => {
    expect(matchKey(press("Z", { shiftKey: true }), null)).toEqual({ name: "history.redo" });
  });

  it("zooms with Ctrl or Cmd and = + - 0", () => {
    expect(matchKey(press("=", ctrl), null)).toEqual({ name: "view.zoom", args: "in" });
    expect(matchKey(press("+", cmd), null)).toEqual({ name: "view.zoom", args: "in" });
    expect(matchKey(press("-", ctrl), null)).toEqual({ name: "view.zoom", args: "out" });
    expect(matchKey(press("0", ctrl), null)).toEqual({ name: "view.zoom", args: "reset" });
    expect(matchKey(press("-"), null)).toBeNull();
  });

  it("deletes with Delete or Backspace only with a block selected and no modifier", () => {
    expect(matchKey(press("Delete"), "a")).toEqual({ name: "block.delete" });
    expect(matchKey(press("Backspace"), "a")).toEqual({ name: "block.delete" });
    expect(matchKey(press("Delete"), null)).toBeNull();
    expect(matchKey(press("Delete", ctrl), "a")).toBeNull();
    expect(matchKey(press("Backspace", { altKey: true }), "a")).toBeNull();
    expect(matchKey(press("Delete", { shiftKey: true }), "a")).toEqual({ name: "block.delete" });
  });

  it("gives nothing for the keys that stay with the canvas", () => {
    for (const key of ["Tab", "Escape", "Enter", "ArrowLeft", "a", " "]) {
      expect(matchKey(press(key), "a")).toBeNull();
    }
  });

  it("only names commands that are in the table", () => {
    const keys: [string, Partial<KeyLike>][] = [
      ["d", ctrl],
      ["g", ctrl],
      ["g", { ...ctrl, shiftKey: true }],
      ["z", ctrl],
      ["y", ctrl],
      ["=", ctrl],
      ["Delete", {}],
    ];
    for (const [key, mods] of keys) {
      const match = matchKey(press(key, mods), "a");
      expect(match).not.toBeNull();
      expect(Object.hasOwn(commandTable, (match as { name: string }).name)).toBe(true);
    }
  });
});
