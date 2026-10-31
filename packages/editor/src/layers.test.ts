import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { nextLayer } from "./layers";

describe("nextLayer", () => {
  it("is the topmost when nothing, or something that is not there, is selected", () => {
    expect(nextLayer(["a", "b", "c"], null)).toBe("a");
    expect(nextLayer(["a", "b", "c"], "z")).toBe("a");
  });
  it("is the one under the selected block, and the topmost again after the last", () => {
    expect(nextLayer(["a", "b", "c"], "a")).toBe("b");
    expect(nextLayer(["a", "b", "c"], "b")).toBe("c");
    expect(nextLayer(["a", "b", "c"], "c")).toBe("a");
  });
  it("is nothing for an empty stack and the same block for a stack of one", () => {
    expect(nextLayer([], "a")).toBeUndefined();
    expect(nextLayer(["a"], "a")).toBe("a");
  });
  it("visits every block once before it comes back", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 12 }),
        (stack) => {
          const seen: string[] = [];
          let at: string | null = null;
          for (let i = 0; i < stack.length; i++) {
            at = nextLayer(stack, at) ?? null;
            seen.push(at as string);
          }
          return new Set(seen).size === stack.length && nextLayer(stack, at) === stack[0];
        },
      ),
    );
  });
});
