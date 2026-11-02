import { describe, expect, it } from "vitest";
import { initialHostState, setHost } from "./host";

describe("what the host says", () => {
  const start = initialHostState({ hostStatus: undefined, hasSave: false });

  it("gives the same state when the host says the same", () => {
    const state = { ...start, other: 1 };
    expect(setHost(state, { hostStatus: undefined, hasSave: false })).toBe(state);
  });

  it("gives a new state with what changed", () => {
    const state = { ...start, other: 1 };
    const next = setHost(state, { hostStatus: "saving", hasSave: true });
    expect(next).not.toBe(state);
    expect(next).toMatchObject({ hostStatus: "saving", hasSave: true, other: 1 });
  });
});
