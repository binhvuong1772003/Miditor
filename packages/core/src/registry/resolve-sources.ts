import type { JsonValue, PageData } from "../tree/types";
import { externalRefs } from "./external-refs";
import type { ExternalSource } from "./external-source";
import { fillItemData } from "./fill-item-data";
import { answerKey, canCheckSource, loadPageItems } from "./load-page-items";
import type { Registry } from "./types";

/** An item that `resolveSources` could not load: its block, its source and its id. */
export interface FailedItem {
  nodeId: string;
  source: string;
  id: string;
}

/**
 * Fills the `data` of the `external` values that keep a reference from the host's sources, for the host to
 * draw a page whose fields keep references: the page it gives to `<Render>`. Each id is asked once, a source with
 * `getMany` in chunks (see `loadItems`). It does not throw for a source: an item that is gone, or that
 * could not be loaded (a rejected or slow call, an id left out), stays as it was and is listed in `failed`.
 * Snapshots are left as the page holds them unless `options.snapshots` is true. Rejects only with an `AbortError` when `options.signal` aborts.
 */
export async function resolveSources(
  page: PageData,
  registry: Registry,
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  options: { signal?: AbortSignal; metadata?: JsonValue; snapshots?: boolean } = {},
): Promise<{ page: PageData; failed: FailedItem[] }> {
  const answers = await loadPageItems(
    page,
    registry,
    sources,
    options.signal ?? new AbortController().signal,
    { metadata: options.metadata },
  );
  const answerOf = (source: string, id: string) => answers.get(answerKey(source, id));
  const only = options.snapshots ? undefined : "reference";
  const filled = fillItemData(
    page,
    registry,
    (ref) => {
      const answer = answerOf(ref.source, ref.value.id);
      return answer?.status === "found" ? answer.item : undefined;
    },
    only,
  );
  const failed: FailedItem[] = [];
  for (const ref of externalRefs(registry, page)) {
    if (only && ref.store !== only) continue;
    const source = sources && Object.hasOwn(sources, ref.source) ? sources[ref.source] : undefined;
    if (!canCheckSource(source)) continue;
    if (answerOf(ref.source, ref.value.id)?.status !== "found") {
      failed.push({ nodeId: ref.nodeId, source: ref.source, id: ref.value.id });
    }
  }
  return { page: filled, failed };
}
