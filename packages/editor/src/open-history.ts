import { migratePage, type PageData } from "@miditor/core";
import { historyLimit } from "./history";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether two JSON values are the same, key for key. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => sameValue((a as never)[key], (b as never)[key]))
  );
}

/**
 * `next` with every part that is the same as in `known` taken from `known`, so the two share those objects:
 * what the steps of a session do on their own, and what a load from JSON loses (each page comes out with
 * objects of its own, many times the memory).
 */
function share<T>(known: T, next: T): T {
  if (known === next) return next;
  if (typeof known !== "object" || typeof next !== "object" || known === null || next === null) {
    return next;
  }
  if (Array.isArray(known) !== Array.isArray(next)) return next;
  const keys = Object.keys(next);
  let whole = keys.length === Object.keys(known).length;
  const out: Record<string, unknown> = Array.isArray(next) ? ([] as never) : {};
  for (const key of keys) {
    const part = share((known as never)[key], (next as never)[key]);
    out[key] = part;
    if (part !== (known as never)[key]) whole = false;
  }
  return whole ? known : (out as T);
}

function pagesOf(raw: unknown): PageData[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  const pages: PageData[] = [];
  for (const item of raw) {
    const opened = migratePage(item);
    if (!opened.ok) return null;
    pages.push(opened.page);
  }
  return pages;
}

/**
 * The steps a host kept of an earlier session, ready for the history: `raw` is `{ past?, future? }`, pages in
 * the order of the history (the oldest of the past first, the nearest of the future first). Every page is
 * opened like `data` is, so an older version is upgraded. One that cannot be opened gives `null`, for the
 * whole history: the editor then opens with none, and never with half. The newest `limit` steps of the past
 * and the nearest of the future are kept, and every page shares what it has in common with its neighbour
 * towards `present`, which is left as it is.
 */
export function parseHistory(
  raw: unknown,
  present: PageData,
  limit: unknown,
): { past: PageData[]; future: PageData[] } | null {
  if (!isObject(raw)) return null;
  const past = pagesOf(raw.past);
  const future = pagesOf(raw.future);
  if (!past || !future) return null;
  const kept = historyLimit(limit);
  const newest = past.length > kept ? past.slice(past.length - kept) : past;
  const nearest = future.length > kept ? future.slice(0, kept) : future;
  // From the present outwards, each page takes what is the same from the one before it.
  let known = present;
  const sharedPast: PageData[] = [];
  for (let at = newest.length - 1; at >= 0; at--) {
    known = share(known, newest[at] as PageData);
    sharedPast.unshift(known);
  }
  known = present;
  const sharedFuture = nearest.map((page) => {
    known = share(known, page);
    return known;
  });
  return { past: sharedPast, future: sharedFuture };
}
