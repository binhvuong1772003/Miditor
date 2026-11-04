import type { JsonValue } from "../tree/types";

/**
 * One thing the host's list holds. `data` is what a block shows of it (a title, a price, a picture): it is
 * stored in the page with the item, as plain JSON of at most 8000 bytes. `hint` and `image` are for the list
 * the person picks from and are not stored. @experimental
 */
export interface ExternalItem {
  id: string;
  label: string;
  data?: JsonValue;
  hint?: string;
  image?: string;
}

/** What the editor tells a source about the page it is asked for: the `metadata` of the `<Editor>`. @experimental */
export interface SourceContext {
  metadata: JsonValue | undefined;
}

/**
 * A list the host keeps (`config.sources`, by the `source` of an `external` field): products, articles,
 * pages. `search` is asked for what the person typed (an empty text at first) and may be asked again before
 * it answers, so it should stop when `signal` is aborted. `ctx` carries the `metadata` of the editor.
 *
 * `get` and `getMany` are for checking what a page stored: the editor asks them for the ids it holds when a
 * page opens, to say which have newer data. Give `getMany` when your API can answer many ids in one call
 * (the editor asks in chunks of 100): an id with `null` is gone, an id left out of the answer could not be
 * checked. With only `get` the editor asks for each id, five at a time. With neither, nothing is checked.
 * @experimental
 */
export interface ExternalSource {
  search(query: string, signal: AbortSignal, ctx: SourceContext): Promise<readonly ExternalItem[]>;
  get?(id: string, signal: AbortSignal, ctx: SourceContext): Promise<ExternalItem | null>;
  getMany?(
    ids: readonly string[],
    signal: AbortSignal,
    ctx: SourceContext,
  ): Promise<Readonly<Record<string, ExternalItem | null>>>;
}
