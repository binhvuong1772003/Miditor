import { afterEach, describe, expect, it, vi } from "vitest";
import { usableThemes } from "./themes";

const sea = { id: "sea", name: "Sea", colors: { primary: "#0e7490" }, font: "Lora, serif" };

afterEach(() => vi.restoreAllMocks());

describe("usableThemes", () => {
  it("is empty without a list", () => {
    expect(usableThemes(undefined)).toEqual([]);
  });

  it("keeps a good theme and its readonly mark", () => {
    expect(usableThemes([{ ...sea, readonly: true }])).toEqual([{ ...sea, readonly: true }]);
  });

  it("leaves the fields of a database row behind", () => {
    const row = { ...sea, ownerId: 7, createdAt: "2026-01-01" };
    expect(usableThemes([row])).toEqual([sea]);
  });

  it.each(["0b5e2f1a-9c4d-4d6e-8f10-aa11bb22cc33", "Brand_Blue", "42"])(
    "accepts the id %s",
    (id) => {
      expect(usableThemes([{ ...sea, id }])).toHaveLength(1);
    },
  );

  it("leaves out, and says why, a row that is bad or repeated", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = [
      { ...sea, id: "a", colors: { primary: "red" } },
      { ...sea, id: "" },
      { ...sea, id: "x".repeat(101) },
      { ...sea, id: "b", name: " " },
      { ...sea, id: "c", font: "a;b" },
      null,
      sea,
      sea,
    ];
    expect(usableThemes(bad)).toEqual([sea]);
    expect(warn).toHaveBeenCalledTimes(7);
  });
});
