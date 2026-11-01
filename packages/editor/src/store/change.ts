/**
 * The state with some keys set, or the very same state when every one is already what it is set to
 * (lists are compared by their members), so nobody is told about a change that did not happen.
 */
export function change<S extends object>(state: S, changes: Partial<S>): S {
  const keys = Object.keys(changes) as (keyof S)[];
  const same = (key: keyof S) => {
    const now = state[key];
    const next = changes[key];
    return Array.isArray(now) && Array.isArray(next)
      ? now.length === next.length && now.every((item, at) => item === next[at])
      : Object.is(now, next);
  };
  return keys.every(same) ? state : { ...state, ...changes };
}
