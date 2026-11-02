import { describe, expect, it } from "vitest";
import { shallowEqual } from "./shallow";

describe("shallowEqual", () => {
  it("is true for the same value and for objects and arrays with the same members", () => {
    const member = { deep: 1 };
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual({ a: member, b: 2 }, { a: member, b: 2 })).toBe(true);
    expect(shallowEqual([member, 2], [member, 2])).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
  });

  it("is false when a member differs, a key is missing, or the kinds differ", () => {
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: undefined }, { b: undefined })).toBe(false);
    expect(shallowEqual([1], { 0: 1 })).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(1, 2)).toBe(false);
  });
});
