import { createDebounce, type Debounced } from "../debounce";

/**
 * What tells the host about a change of the page, outside of React: the host is called for a change
 * and only once for it, after the delay it asked for, with the latest page. It does not know what a
 * page is; it takes values and compares them by identity, so a page that comes out of a change as the
 * very same object is no change.
 *
 * It is pushed from an effect on the page, after React has committed, and not from a subscription to
 * the store. A handler that stores two changes in a row (a pending value, then the edit that
 * follows) is one commit, so the host is given the final page once and never the one in between.
 */
export interface Notifier<T> {
  /** The delay and the longest wait of the host. What waited with the old ones is called first. */
  configure: (options: { wait: number; maxWait?: number | undefined }) => void;
  /** The page as it is now. */
  push: (value: T) => void;
  /** Call now with the latest page, if one waits. */
  flush: () => void;
}

/**
 * `initial` is the page the host already has. `onWaiting` is told whether a change waits for its
 * call, so the header does not call the page saved while one does.
 */
export function createNotifier<T>(
  initial: T,
  call: (value: T) => void,
  onWaiting: (waiting: boolean) => void,
): Notifier<T> {
  let known = initial;
  let debounced: Debounced<T> | undefined;
  const make = (wait: number, maxWait?: number) =>
    createDebounce<T>(
      (value) => {
        onWaiting(false);
        call(value);
      },
      wait,
      maxWait,
    );
  debounced = make(0);
  return {
    configure({ wait, maxWait }) {
      debounced?.flush();
      debounced = make(wait, maxWait);
    },
    push(value) {
      if (value === known) return;
      known = value;
      debounced?.push(value);
      onWaiting(debounced?.pending() ?? false);
    },
    flush() {
      debounced?.flush();
    },
  };
}
