import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isActionName, isPayload, MAX_PAYLOAD_KEYS, MAX_PAYLOAD_TEXT } from "./action";

describe("isActionName", () => {
  it("accepts a lowercase name and refuses code, spaces and capitals", () => {
    for (const ok of ["add-to-cart", "open-modal2", "a"]) expect(isActionName(ok)).toBe(true);
    for (const bad of ["", "Add", "a b", "alert(1)", "1a", "a".repeat(33), 5, null]) {
      expect(isActionName(bad)).toBe(false);
    }
  });
});

describe("isPayload", () => {
  const value = fc.oneof(
    fc.string({ maxLength: MAX_PAYLOAD_TEXT }),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.boolean(),
  );
  it("accepts named text, numbers and booleans, as they come back from JSON", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.constantFrom("sku", "qty", "gift", "note"), value, { maxKeys: 4 }),
        (payload) => isPayload(JSON.parse(JSON.stringify(payload))),
      ),
    );
  });
  it("refuses nesting, long text, too many keys, bad names and non-objects", () => {
    expect(isPayload({ a: { b: 1 } })).toBe(false);
    expect(isPayload({ a: [1] })).toBe(false);
    expect(isPayload({ a: null })).toBe(false);
    expect(isPayload({ a: "x".repeat(MAX_PAYLOAD_TEXT + 1) })).toBe(false);
    expect(isPayload({ A: 1 })).toBe(false);
    expect(isPayload({ "a b": 1 })).toBe(false);
    const many = Object.fromEntries(
      Array.from({ length: MAX_PAYLOAD_KEYS + 1 }, (_, i) => [`k${i}`, i]),
    );
    expect(isPayload(many)).toBe(false);
    for (const bad of [null, undefined, 1, "x", [], [{ a: 1 }]]) expect(isPayload(bad)).toBe(false);
  });
  it("accepts an empty payload and refuses a number that is not finite", () => {
    expect(isPayload({})).toBe(true);
    expect(isPayload({ a: Number.POSITIVE_INFINITY })).toBe(false);
  });
});
