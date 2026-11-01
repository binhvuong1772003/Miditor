import { useEffect } from "react";

/**
 * `?perf` in the address counts how often each part of the editor commits, so a refactor can show
 * it did not make the editor redraw more. The counts sit in `window.__midito_perf`; without the
 * flag the hook does nothing.
 */
type Counts = Record<string, number>;

const enabled =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("perf");

declare global {
  interface Window {
    __midito_perf?: Counts;
  }
}

function count(id: string): void {
  const counts = window.__midito_perf ?? {};
  window.__midito_perf = counts;
  counts[id] = (counts[id] ?? 0) + 1;
}

/** Runs after every commit of the component that calls it, so a part skipped by `memo` is not counted. */
export const useRenders: (id: string) => void = enabled
  ? (id) => {
      useEffect(() => count(id));
    }
  : () => {};

/** For a part the editor does not own, such as the page renderer: pass this to a `<Profiler>`. */
export const countCommit = enabled ? count : () => {};
