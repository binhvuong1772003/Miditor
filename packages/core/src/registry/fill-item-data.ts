import type { PageData } from "../tree/types";
import { type ExternalRef, externalRefs, withExternalValues } from "./external-refs";
import type { ExternalItem } from "./external-source";
import { pickValue } from "./pick-value";
import type { Registry } from "./types";

/**
 * A copy of the page with the data of items put into the `external` values that hold them: the label and
 * the `data` the page can keep (no time, nothing is stored). `itemOf` says which item each value stands for;
 * a value it has no item for, or an item whose data the page cannot keep, is left as it is. `only` limits it
 * to the fields that keep a `"reference"`. Gives back the very page when nothing is filled.
 */
export function fillItemData(
  page: PageData,
  registry: Registry,
  itemOf: (ref: ExternalRef) => ExternalItem | undefined,
  only?: "reference",
): PageData {
  const changes = externalRefs(registry, page).flatMap((ref) => {
    if (only && ref.store !== only) return [];
    const item = itemOf(ref);
    if (!item || item.data === undefined) return [];
    const kept = pickValue(item, new Date(0)) as { data?: unknown; label: string } | null;
    if (kept === null || kept.data === undefined) return [];
    return [
      {
        nodeId: ref.nodeId,
        layer: ref.layer,
        path: ref.path,
        value: { id: ref.value.id, label: kept.label, data: kept.data } as never,
      },
    ];
  });
  return withExternalValues(page, changes);
}
