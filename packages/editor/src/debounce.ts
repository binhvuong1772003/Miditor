/** A call that waits for the changes to stop before it is made. */
export interface Debounced<T> {
  /** A new value: the call is made with the latest one `wait` ms after the last push. */
  push: (value: T) => void;
  /** Make the call now with the latest value, if one is waiting. */
  flush: () => void;
  /** Drop the waiting value without calling. */
  cancel: () => void;
  /** Whether a value is waiting. */
  pending: () => boolean;
}

/**
 * Calls `call` with the latest pushed value once `wait` ms have passed with no new one. With
 * `maxWait` a value that keeps being replaced is still called at least that often. A `wait` of 0
 * or less calls at once, on every push.
 */
export function createDebounce<T>(
  call: (value: T) => void,
  wait: number,
  maxWait?: number,
): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let longest: ReturnType<typeof setTimeout> | undefined;
  let waiting = false;
  let latest: T;

  const clear = () => {
    clearTimeout(timer);
    clearTimeout(longest);
    timer = undefined;
    longest = undefined;
  };
  const fire = () => {
    if (!waiting) return;
    waiting = false;
    clear();
    call(latest);
  };

  return {
    push(value) {
      latest = value;
      if (!(wait > 0)) {
        waiting = true;
        fire();
        return;
      }
      waiting = true;
      clearTimeout(timer);
      timer = setTimeout(fire, wait);
      if (longest === undefined && maxWait !== undefined && maxWait > 0) {
        longest = setTimeout(fire, maxWait);
      }
    },
    flush: fire,
    cancel() {
      waiting = false;
      clear();
    },
    pending: () => waiting,
  };
}
