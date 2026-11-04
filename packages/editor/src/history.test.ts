import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  amend,
  canRedo,
  canUndo,
  commit,
  createHistory,
  DEFAULT_HISTORY_LIMIT,
  type History,
  historyLimit,
  jumpTo,
  redo,
  undo,
  withSteps,
} from "./history";

/** A history that went through the values in order. */
const through = (values: number[], limit: unknown = 100): History<number> =>
  values.slice(1).reduce((h, v) => commit(h, v, limit), createHistory(values[0] as number));

describe("historyLimit", () => {
  it("accepts a whole number from 1 up and Infinity", () => {
    for (const ok of [1, 2, 50, 100, 5000, Number.POSITIVE_INFINITY])
      expect(historyLimit(ok)).toBe(ok);
  });

  it("is the default for anything else, and never throws", () => {
    for (const bad of [
      0,
      -1,
      -100,
      1.5,
      0.99,
      Number.NaN,
      Number.NEGATIVE_INFINITY,
      "50",
      null,
      undefined,
      {},
      [],
      true,
    ]) {
      expect(historyLimit(bad)).toBe(DEFAULT_HISTORY_LIMIT);
    }
    expect(DEFAULT_HISTORY_LIMIT).toBe(100);
  });
});

describe("commit", () => {
  it("makes the old present a step and the new value the present", () => {
    const h = commit(createHistory(1), 2, 100);
    expect(h).toEqual({ past: [1], present: 2, future: [] });
  });

  it("changes nothing, and makes no step, for the very same value", () => {
    const h = through([1, 2]);
    expect(commit(h, 2, 100)).toBe(h);
  });

  it("empties redo", () => {
    const h = commit(undo(through([1, 2, 3])), 9, 100);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(9);
    expect(h.past).toEqual([1, 2]);
  });

  it("drops the oldest steps beyond the limit", () => {
    const h = through([0, 1, 2, 3, 4, 5], 3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });

  it("keeps exactly one step with a limit of 1", () => {
    const h = through([0, 1, 2, 3], 1);
    expect(h.past).toEqual([2]);
    expect(undo(h).present).toBe(2);
    expect(canUndo(undo(h))).toBe(false);
  });

  it("never drops a step with Infinity", () => {
    const h = through(
      Array.from({ length: 500 }, (_, i) => i),
      Number.POSITIVE_INFINITY,
    );
    expect(h.past).toHaveLength(499);
  });

  it("uses 100 for a limit that is not valid", () => {
    for (const bad of [0, -3, 2.5, Number.NaN, "7", undefined]) {
      const h = through(
        Array.from({ length: 150 }, (_, i) => i),
        bad,
      );
      expect(h.past).toHaveLength(100);
    }
  });

  it("keeps exactly the limit, not one more or less", () => {
    const h = through(
      Array.from({ length: 10 }, (_, i) => i),
      4,
    );
    expect(h.past).toHaveLength(4);
    expect(
      through(
        Array.from({ length: 5 }, (_, i) => i),
        4,
      ).past,
    ).toHaveLength(4);
    expect(
      through(
        Array.from({ length: 4 }, (_, i) => i),
        4,
      ).past,
    ).toHaveLength(3);
  });

  it("trims to a smaller limit on the next commit", () => {
    const big = through([0, 1, 2, 3, 4, 5], 100);
    const trimmed = commit(big, 6, 2);
    expect(trimmed.past).toEqual([4, 5]);
  });

  it("does not modify the history it was given", () => {
    const h = through([1, 2, 3]);
    const snapshot = JSON.stringify(h);
    commit(h, 4, 100);
    undo(h);
    redo(undo(h));
    expect(JSON.stringify(h)).toBe(snapshot);
  });
});

describe("amend", () => {
  it("replaces the present and keeps the step before it", () => {
    const h = amend(through([1, 2]), 3, 100);
    expect(h.present).toBe(3);
    expect(h.past).toEqual([1]);
    expect(undo(h).present).toBe(1);
  });
  it("clears redo, like a commit", () => {
    const h = amend(undo(through([1, 2, 3])), 9, 100);
    expect(h.future).toEqual([]);
  });
  it("is a commit when there is no step to amend onto, and nothing for the same value", () => {
    const start = createHistory(1);
    expect(amend(start, 2, 100)).toEqual(commit(start, 2, 100));
    expect(amend(start, 1, 100)).toBe(start);
  });
  it("a run of amends is one step to undo", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (values) => {
        const h = values.reduce((acc, v) => amend(acc, v, 100), commit(createHistory(-1), 0, 100));
        return h.past.length === 1 && undo(h).present === -1;
      }),
    );
  });
});

describe("undo and redo", () => {
  it("go one step back and forward", () => {
    const h = through([1, 2, 3]);
    expect(undo(h)).toEqual({ past: [1], present: 2, future: [3] });
    expect(redo(undo(h))).toEqual(h);
  });

  it("do nothing, and return the same history, at the ends", () => {
    const fresh = createHistory(1);
    expect(undo(fresh)).toBe(fresh);
    expect(redo(fresh)).toBe(fresh);
    const h = through([1, 2]);
    expect(redo(h)).toBe(h);
  });

  it("say whether there is a step", () => {
    const h = through([1, 2]);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    expect(canUndo(undo(h))).toBe(false);
    expect(canRedo(undo(h))).toBe(true);
  });

  it("walk back to the first value and forward to the last", () => {
    const h = through([1, 2, 3, 4, 5]);
    const first = undo(undo(undo(undo(h))));
    expect(first.present).toBe(1);
    expect(redo(redo(redo(redo(first)))).present).toBe(5);
  });
});

describe("history, properties", () => {
  const values = fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 40 });

  it("keeps a past no longer than the limit, and the last value as the present", () => {
    fc.assert(
      fc.property(values, fc.integer({ min: 1, max: 20 }), (list, limit) => {
        const h = through(list, limit);
        return h.past.length <= limit && h.present === list[list.length - 1];
      }),
    );
  });

  it("undoes every step in the reverse order of the values that were committed", () => {
    fc.assert(
      fc.property(values, (list) => {
        // Consecutive equal values are no step, so compare with the list without them.
        const steps = list.filter((v, i) => i === 0 || v !== list[i - 1]);
        let h = through(list);
        const seen = [h.present];
        while (canUndo(h)) {
          h = undo(h);
          seen.push(h.present);
        }
        return JSON.stringify(seen) === JSON.stringify([...steps].reverse());
      }),
    );
  });

  it("returns to the same history after undo then redo", () => {
    fc.assert(
      fc.property(values, (list) => {
        const h = through(list);
        return !canUndo(h) || JSON.stringify(redo(undo(h))) === JSON.stringify(h);
      }),
    );
  });

  it("never has a future after a commit", () => {
    fc.assert(
      fc.property(values, fc.nat(10), fc.integer({ min: 6, max: 9 }), (list, back, value) => {
        let h = through(list);
        for (let i = 0; i < back; i++) h = undo(h);
        return commit(h, value, 100).future.length === 0;
      }),
    );
  });
});

describe("jumpTo", () => {
  /** [0..4] with 2 as the present: past [0,1], future [3,4]. */
  const middle = (): History<number> => ({ past: [0, 1], present: 2, future: [3, 4] });

  it("goes to a step in one move, keeping the order of every step", () => {
    expect(jumpTo(middle(), 0)).toEqual({ past: [], present: 0, future: [1, 2, 3, 4] });
    expect(jumpTo(middle(), 4)).toEqual({ past: [0, 1, 2, 3], present: 4, future: [] });
    expect(jumpTo(middle(), 3)).toEqual({ past: [0, 1, 2], present: 3, future: [4] });
  });

  it("gives back the very history for the step it is at, or for one that is not there", () => {
    const h = middle();
    for (const index of [2, -1, 5, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(jumpTo(h, index)).toBe(h);
    }
  });

  it("leaves undo and redo one step each way from where it landed", () => {
    const landed = jumpTo(middle(), 1);
    expect(undo(landed).present).toBe(0);
    expect(redo(landed).present).toBe(2);
  });

  it("keeps the list of steps the same, for any history and any step", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 30 }),
        fc.integer(),
        fc.array(fc.integer(), { maxLength: 30 }),
        fc.nat(70),
        (past, present, future, at) => {
          const h: History<number> = { past, present, future };
          const all = [...past, present, ...future];
          const next = jumpTo(h, at);
          expect([...next.past, next.present, ...next.future]).toEqual(all);
          if (at < all.length) expect(next.present).toBe(all[at]);
          expect(next.past.length).toBe(at < all.length ? at : past.length);
        },
      ),
    );
  });
});

describe("withSteps", () => {
  it("replaces what came before and after, and keeps the present", () => {
    const h = through([1, 2, 3]);
    expect(withSteps(h, [7, 8], [9], 100)).toEqual({ past: [7, 8], present: 3, future: [9] });
  });

  it("keeps the newest steps of the past and the nearest of the future when there are more than the limit", () => {
    const next = withSteps(createHistory(0), [1, 2, 3, 4, 5], [6, 7, 8, 9], 3);
    expect(next.past).toEqual([3, 4, 5]);
    expect(next.future).toEqual([6, 7, 8]);
  });

  it("takes the default limit for a limit that is not a limit", () => {
    const many = Array.from({ length: DEFAULT_HISTORY_LIMIT + 5 }, (_, i) => i);
    expect(withSteps(createHistory(0), many, [], "no").past).toHaveLength(DEFAULT_HISTORY_LIMIT);
  });
});
