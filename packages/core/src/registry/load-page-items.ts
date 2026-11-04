import type { PageData } from "../tree/types";
import { type ExternalRef, externalRefs } from "./external-refs";
import type { ExternalSource, SourceContext } from "./external-source";
import { type Answer, loadItems } from "./load-items";
import type { Registry } from "./types";

/** The key of one id of one source in the answers of `loadPageItems`. */
export const answerKey = (source: string, id: string) => `${source}\u0000${id}`;

/** Whether a source can be asked for the items a page holds: it has a `get` or a `getMany`. */
export const canCheckSource = (source: ExternalSource | undefined): boolean =>
  source !== undefined && (source.get !== undefined || source.getMany !== undefined);

/**
 * Asks each source the host gave, once, for the ids that the `external` fields of the page hold (equal ids
 * once, see `loadItems`), and gives the answers by `answerKey`. A source with no `get` or `getMany` is left
 * out, and so is every item `include` refuses. Rejects with an `AbortError` when `signal` aborts.
 */
export async function loadPageItems(
  page: PageData,
  registry: Registry,
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  signal: AbortSignal,
  ctx: SourceContext,
  include?: (ref: ExternalRef) => boolean,
): Promise<ReadonlyMap<string, Answer>> {
  const wanted = new Map<string, string[]>();
  for (const ref of externalRefs(registry, page)) {
    const source = sources && Object.hasOwn(sources, ref.source) ? sources[ref.source] : undefined;
    if (!canCheckSource(source) || (include && !include(ref))) continue;
    const ids = wanted.get(ref.source) ?? [];
    ids.push(ref.value.id);
    wanted.set(ref.source, ids);
  }
  const answers = new Map<string, Answer>();
  await Promise.all(
    [...wanted].map(async ([name, ids]) => {
      const loaded = await loadItems(
        (sources as Record<string, ExternalSource>)[name] as ExternalSource,
        ids,
        signal,
        ctx,
      );
      for (const [id, answer] of loaded) answers.set(answerKey(name, id), answer);
    }),
  );
  return answers;
}
