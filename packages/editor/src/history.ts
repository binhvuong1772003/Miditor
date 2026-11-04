/**
 * The steps of one editing session, as plain data: what came before, what is shown, and what undo
 * took away. Nothing here knows about pages, so it is tested on its own. Every step is a whole value,
 * not a difference: the page shares every node a change did not touch, so a step costs little.
 */
export interface History<T> {
  /** Oldest first. The last one is what `undo` brings back. */
  readonly past: readonly T[];
  readonly present: T;
  /** Nearest first. The first one is what `redo` brings back. */
  readonly future: readonly T[];
}

/** How many steps are kept when the host does not say. */
export const DEFAULT_HISTORY_LIMIT = 100;

/**
 * The limit to use for what a host passed: a whole number from 1 up, or `Infinity` for no limit.
 * Anything else (0, a negative, a fraction, `NaN`, a string, nothing) is the default, not an error.
 */
export function historyLimit(value: unknown): number {
  if (value === Number.POSITIVE_INFINITY) return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) return value;
  return DEFAULT_HISTORY_LIMIT;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/**
 * Makes `next` the present. The old present becomes a step, redo is gone, and the oldest steps fall
 * away when there are more than `limit`. The very same value changes nothing and is no step.
 */
export function commit<T>(history: History<T>, next: T, limit: unknown): History<T> {
  if (next === history.present) return history;
  const kept = historyLimit(limit);
  const past = [...history.past, history.present];
  return {
    past: past.length > kept ? past.slice(past.length - kept) : past,
    present: next,
    future: [],
  };
}

/**
 * Makes `next` the present without a step of its own: what was there before is dropped, and the step
 * before it stays the one `undo` goes back to. For a run of small changes that are one thing to a
 * person, such as holding an arrow key. With nothing to amend onto, it is an ordinary `commit`.
 */
export function amend<T>(history: History<T>, next: T, limit: unknown): History<T> {
  if (next === history.present) return history;
  if (history.past.length === 0) return commit(history, next, limit);
  return { past: history.past, present: next, future: [] };
}

export const canUndo = (history: History<unknown>) => history.past.length > 0;
export const canRedo = (history: History<unknown>) => history.future.length > 0;

/** One step back. With nothing to undo the same history comes back. */
export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (!canUndo(history)) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous as T,
    future: [history.present, ...history.future],
  };
}

/** One step forward. With nothing to redo the same history comes back. */
export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (!canRedo(history)) return history;
  return {
    past: [...history.past, history.present],
    present: next as T,
    future: rest,
  };
}

/**
 * Goes to the step at `index` of all the steps in order, `[...past, present, ...future]`, in one move:
 * nothing is drawn in between. The step the history is at is `past.length`. For an index that is not a
 * step, or the one it is at, the same history comes back.
 */
export function jumpTo<T>(history: History<T>, index: number): History<T> {
  const at = history.past.length;
  const total = at + 1 + history.future.length;
  if (!Number.isInteger(index) || index < 0 || index >= total || index === at) return history;
  const all = [...history.past, history.present, ...history.future];
  return { past: all.slice(0, index), present: all[index] as T, future: all.slice(index + 1) };
}

/**
 * The same present with other steps before and after it: the newest `limit` of `past` and the nearest
 * `limit` of `future`. For what a host kept of an earlier session.
 */
export function withSteps<T>(
  history: History<T>,
  past: readonly T[],
  future: readonly T[],
  limit: unknown,
): History<T> {
  const kept = historyLimit(limit);
  return {
    past: past.length > kept ? past.slice(past.length - kept) : past,
    present: history.present,
    future: future.length > kept ? future.slice(0, kept) : future,
  };
}
