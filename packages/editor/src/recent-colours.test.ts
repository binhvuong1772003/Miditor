import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_RECENT, remember } from "./recent-colours";

const hex = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 6, maxLength: 6 })
  .map((digits) => `#${digits.map((digit) => digit.toString(16)).join("")}`);

describe("remember", () => {
  it("puts the new colour first", () => {
    expect(remember(["#111111", "#222222"], "#333333")).toEqual(["#333333", "#111111", "#222222"]);
  });

  it("moves a colour that is already there to the front instead of repeating it", () => {
    expect(remember(["#111111", "#222222"], "#222222")).toEqual(["#222222", "#111111"]);
  });

  it("treats upper and lower case as the same colour", () => {
    expect(remember(["#abcdef"], "#ABCDEF")).toEqual(["#abcdef"]);
  });

  it("keeps at most MAX_RECENT colours and drops the oldest", () => {
    const full = Array.from({ length: MAX_RECENT }, (_, index) => `#00000${index}`);
    const next = remember(full, "#ffffff");
    expect(next).toHaveLength(MAX_RECENT);
    expect(next[0]).toBe("#ffffff");
    expect(next).not.toContain(full[MAX_RECENT - 1]);
  });

  it("never repeats a colour and never grows past the limit", () => {
    fc.assert(
      fc.property(fc.array(hex, { maxLength: 30 }), (picks) => {
        const list = picks.reduce<string[]>((acc, colour) => remember(acc, colour), []);
        expect(list.length).toBeLessThanOrEqual(MAX_RECENT);
        expect(new Set(list).size).toBe(list.length);
      }),
    );
  });
});
