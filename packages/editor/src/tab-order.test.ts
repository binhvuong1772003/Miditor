import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { stepSelection } from "./tab-order";

const order = ["a", "b", "c"];

describe("stepSelection", () => {
  it("takes the first with Tab, and the last with Shift+Tab, when nothing is selected", () => {
    expect(stepSelection(order, null, false)).toBe("a");
    expect(stepSelection(order, null, true)).toBe("c");
    expect(stepSelection(order, "z", false)).toBe("a");
  });
  it("goes to the next or the previous block", () => {
    expect(stepSelection(order, "a", false)).toBe("b");
    expect(stepSelection(order, "c", true)).toBe("b");
  });
  it("lets the key leave at the end, and says nothing for no blocks", () => {
    expect(stepSelection(order, "c", false)).toBeNull();
    expect(stepSelection(order, "a", true)).toBeNull();
    expect(stepSelection([], "a", false)).toBeUndefined();
  });
  it("visits every block once going forward and then lets the key leave", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 12 }),
        (list) => {
          const seen: string[] = [];
          let at: string | null = null;
          for (;;) {
            const next = stepSelection(list, at, false);
            if (next === null || next === undefined) break;
            seen.push(next);
            at = next;
          }
          return seen.length === list.length && seen.every((id, i) => id === list[i]);
        },
      ),
    );
  });
});
