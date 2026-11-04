import { migratePage, type PageData } from "@miditor/core";
import { historyLimit } from "./history";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasId = (value: unknown): value is { id: string } =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof (value as { id?: unknown }).id === "string";

/** A property of `value` that it has itself, and not one it takes from its prototype. */
const own = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null && Object.hasOwn(value, key)
    ? (value as Record<string, unknown>)[key]
    : undefined;

/** `out[key] = part` that also holds for the key `__proto__`, which is a key like any other in JSON. */
function put(out: Record<string, unknown>, key: string, part: unknown): void {
  Object.defineProperty(out, key, {
    value: part,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * `next` with every part that is the same as in `known` taken from `known`, so the two share those objects:
 * what the steps of a session do on their own, and what a load from JSON loses (each page comes out with
 * objects of its own, many times the memory). The items of a list of blocks (which have an `id`) are matched
 * by that id, so a block taken out or put in does not make the ones after it lose what they share.
 */
function share<T>(known: T, next: T): T {
  if (known === next) return next;
  if (typeof known !== "object" || typeof next !== "object" || known === null || next === null) {
    return next;
  }
  if (Array.isArray(known) !== Array.isArray(next)) return next;
  if (Array.isArray(next)) {
    const before = known as unknown[];
    const byId = new Map<string, unknown>();
    for (const item of before) if (hasId(item)) byId.set(item.id, item);
    const out = next.map((item, at) => {
      const match = hasId(item) && byId.has(item.id) ? byId.get(item.id) : before[at];
      return share(match, item);
    });
    const whole = out.length === before.length && out.every((item, at) => item === before[at]);
    return (whole ? known : out) as T;
  }
  const keys = Object.keys(next);
  let whole = keys.length === Object.keys(known).length;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const part = share(own(known, key), (next as Record<string, unknown>)[key]);
    put(out, key, part);
    if (part !== own(known, key)) whole = false;
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
  const kept = historyLimit(limit);
  // The steps the limit cuts off are not looked at: one that is not a page does not spoil the ones kept.
  const cut = (list: unknown, newest: boolean): unknown => {
    if (!Array.isArray(list) || list.length <= kept) return list;
    return newest ? list.slice(list.length - kept) : list.slice(0, kept);
  };
  const newest = pagesOf(cut(raw.past, true));
  const nearest = pagesOf(cut(raw.future, false));
  if (!newest || !nearest) return null;
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

/** The histories that were told about, so React's StrictMode opening one twice tells once. */
const told = new WeakSet<object>();

/**
 * What the editor opens with for `initialHistory`: the steps (see `parseHistory`), or nothing when the host
 * gave none. A history that cannot be opened is told once in the console, and the editor opens without it.
 */
export function openSteps(
  raw: unknown,
  present: PageData,
  limit: unknown,
): { past: PageData[]; future: PageData[] } | undefined {
  if (raw === undefined) return undefined;
  const steps = parseHistory(raw, present, limit);
  if (steps) return steps;
  // React's StrictMode opens a page twice in development: the same history is told once.
  if (typeof raw === "object" && raw !== null) {
    if (told.has(raw)) return undefined;
    told.add(raw);
  }
  console.warn(
    "[miditor] `initialHistory` is not a history this editor can open (an object with `past` and `future`, each a list of pages it can open): the editor opens without it",
  );
  return undefined;
}
