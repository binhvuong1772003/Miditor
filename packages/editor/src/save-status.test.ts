import { describe, expect, it } from "vitest";
import { resolveStatus, STATUS_TEXT } from "./save-status";

const none = { hasSave: false, clean: true, waiting: false };

describe("resolveStatus", () => {
  it("shows nothing when there is no Save button and the host says nothing", () => {
    expect(resolveStatus(undefined, none)).toBeUndefined();
  });

  it("follows the Save button when the host says nothing", () => {
    expect(resolveStatus(undefined, { ...none, hasSave: true, clean: true })).toBe("saved");
    expect(resolveStatus(undefined, { ...none, hasSave: true, clean: false })).toBe("unsaved");
  });

  it("shows the word of the host, with or without a Save button", () => {
    for (const host of ["saved", "unsaved", "saving", "error"] as const) {
      expect(resolveStatus(host, none)).toBe(host);
      expect(resolveStatus(host, { hasSave: true, clean: false, waiting: false })).toBe(host);
    }
  });

  it("does not say saved while a change waits for its delayed call", () => {
    expect(resolveStatus("saved", { ...none, waiting: true })).toBe("unsaved");
  });

  it("keeps saving and error even when a change waits", () => {
    expect(resolveStatus("saving", { ...none, waiting: true })).toBe("saving");
    expect(resolveStatus("error", { ...none, waiting: true })).toBe("error");
  });

  it("has a text for every state", () => {
    expect(Object.keys(STATUS_TEXT).sort()).toEqual(["error", "saved", "saving", "unsaved"]);
  });
});
