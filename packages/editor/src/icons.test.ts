import { describe, expect, it } from "vitest";
import { ICON_NAMES, isIconName, usableIcons } from "./icons";

const Mine = () => null;

describe("usableIcons", () => {
  it("is empty without a set", () => {
    expect(usableIcons(undefined)).toEqual({});
  });

  it("keeps a component under a name the editor has", () => {
    expect(usableIcons({ undo: Mine, img: Mine })).toEqual({ undo: Mine, img: Mine });
  });

  it("keeps a memo or forwardRef component, which is an object", () => {
    const wrapped = { $$typeof: Symbol.for("react.memo"), type: Mine };
    expect(usableIcons({ redo: wrapped }).redo).toBe(wrapped);
  });

  it("leaves out an unknown name and a value that is not a component", () => {
    expect(usableIcons({ nope: Mine, undo: "x", redo: 3, trash: null, plus: undefined })).toEqual(
      {},
    );
  });
});

describe("ICON_NAMES", () => {
  it("lists the names that isIconName accepts", () => {
    expect(ICON_NAMES.length).toBeGreaterThan(20);
    expect(ICON_NAMES.every(isIconName)).toBe(true);
    expect(isIconName("nope")).toBe(false);
  });
});
