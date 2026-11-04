import { describe, expect, it } from "vitest";
import { judge, updateValue } from "./judge-sources";

const stored = { id: "a", label: "A", data: { price: 1 }, at: "2026-11-01T00:00:00.000Z" };
const found = (item: object) => ({ status: "found", item }) as never;
const now = new Date("2026-11-03T10:00:00.000Z");

describe("judging an answer against what is stored", () => {
  it("is failed for no answer or a failed one, and gone for gone", () => {
    expect(judge(stored, undefined)).toBe("failed");
    expect(judge(stored, { status: "failed" })).toBe("failed");
    expect(judge(stored, { status: "gone" })).toBe("gone");
  });

  it("is same when label and data are equal, whatever `at` says", () => {
    expect(judge(stored, found({ id: "a", label: "A", data: { price: 1 } }))).toBe("same");
    expect(
      judge(
        { ...stored, at: "1999-01-01T00:00:00.000Z" },
        found({ id: "a", label: "A", data: { price: 1 } }),
      ),
    ).toBe("same");
  });

  it("is changed when the label or the data differ", () => {
    expect(judge(stored, found({ id: "a", label: "B", data: { price: 1 } }))).toBe("changed");
    expect(judge(stored, found({ id: "a", label: "A", data: { price: 2 } }))).toBe("changed");
  });

  it("is changed when the item has data and the page has none, and same when neither has", () => {
    expect(judge({ id: "a", label: "A" }, found({ id: "a", label: "A", data: { price: 1 } }))).toBe(
      "changed",
    );
    expect(judge({ id: "a", label: "A" }, found({ id: "a", label: "A" }))).toBe("same");
  });

  it("is changed when the page has data and the item no longer has any", () => {
    expect(judge(stored, found({ id: "a", label: "A" }))).toBe("changed");
  });
});

describe("updating a stored item", () => {
  it("writes the label, the data and the time", () => {
    expect(updateValue(stored, { id: "a", label: "A2", data: { price: 2 } }, now)).toEqual({
      id: "a",
      label: "A2",
      data: { price: 2 },
      at: "2026-11-03T10:00:00.000Z",
    });
  });

  it("keeps the stored value when the new data cannot be kept in a page", () => {
    expect(
      updateValue(stored, { id: "a", label: "A2", data: { s: "x".repeat(9000) } }, now),
    ).toEqual(stored);
  });

  it("writes just the id and the label when the item has no data", () => {
    expect(updateValue(stored, { id: "a", label: "A2" }, now)).toEqual({ id: "a", label: "A2" });
  });
});
