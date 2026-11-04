import type { ExternalItem, ExternalSource, SourceContext } from "./external-source";

/** What a source said of one id: the item, that it is gone, or that it could not be checked. */
export type Answer =
  | { status: "found"; item: ExternalItem }
  | { status: "gone" }
  | { status: "failed" };

/** How many ids go in one `getMany` call. */
export const GET_MANY_CHUNK = 100;
/** How many `get` calls may be in flight at once. */
export const GET_CONCURRENCY = 5;
/** How long a call of the host may take before the editor stops waiting for it. */
export const SOURCE_TIMEOUT_MS = 15000;

const isItem = (item: unknown): item is ExternalItem =>
  typeof item === "object" &&
  item !== null &&
  typeof (item as ExternalItem).id === "string" &&
  typeof (item as ExternalItem).label === "string";

const FAILED: Answer = { status: "failed" };
const aborted = () => new DOMException("aborted", "AbortError");

/** Runs `call` with a signal that aborts on timeout or when `outer` aborts; rejects in both cases. */
function limited<T>(outer: AbortSignal, call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const inner = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const stop = (error: unknown) => {
      inner.abort();
      reject(error);
    };
    const timer = setTimeout(() => stop(new Error("timeout")), SOURCE_TIMEOUT_MS);
    const onAbort = () => {
      clearTimeout(timer);
      stop(aborted());
    };
    outer.addEventListener("abort", onAbort, { once: true });
    call(inner.signal).then(
      (value) => {
        clearTimeout(timer);
        outer.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        outer.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Asks a source for ids. Equal ids are asked once. With `getMany` the ids go in chunks of
 * `GET_MANY_CHUNK`, in parallel, and a chunk that fails only costs its own ids; with `get` at most
 * `GET_CONCURRENCY` calls run at once; with neither every id is `failed`. A call that rejects or takes
 * longer than `SOURCE_TIMEOUT_MS` is `failed`, never `gone`. Rejects with an `AbortError` when `signal`
 * aborts.
 */
export async function loadItems(
  source: ExternalSource,
  ids: readonly string[],
  signal: AbortSignal,
  ctx: SourceContext,
): Promise<ReadonlyMap<string, Answer>> {
  const unique = [...new Set(ids)];
  const answers = new Map<string, Answer>();
  if (signal.aborted) throw aborted();
  const settle = (id: string, item: ExternalItem | null | undefined) => {
    if (item === undefined) answers.set(id, FAILED);
    else if (item === null) answers.set(id, { status: "gone" });
    // An answer that is not the item asked for, or has no label, is not an answer.
    else if (!isItem(item) || item.id !== id) answers.set(id, FAILED);
    else answers.set(id, { status: "found", item });
  };
  // Only the editor's own signal ends the work: an AbortError thrown by the host's code is a failed call.
  const keep = () => {
    if (signal.aborted) throw aborted();
  };

  const { getMany, get } = source;
  if (getMany) {
    const chunks: string[][] = [];
    for (let at = 0; at < unique.length; at += GET_MANY_CHUNK) {
      chunks.push(unique.slice(at, at + GET_MANY_CHUNK));
    }
    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const found = await limited(signal, (s) => getMany.call(source, chunk, s, ctx));
          for (const id of chunk) {
            settle(id, Object.hasOwn(found, id) ? (found[id] as ExternalItem | null) : undefined);
          }
        } catch (error) {
          keep();
          for (const id of chunk) answers.set(id, FAILED);
        }
      }),
    );
  } else if (get) {
    let next = 0;
    const worker = async () => {
      while (next < unique.length) {
        const id = unique[next++] as string;
        try {
          settle(id, await limited(signal, (s) => get.call(source, id, s, ctx)));
        } catch (error) {
          keep();
          answers.set(id, FAILED);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(GET_CONCURRENCY, unique.length) }, worker));
  } else {
    for (const id of unique) answers.set(id, FAILED);
  }
  if (signal.aborted) throw aborted();
  return answers;
}
