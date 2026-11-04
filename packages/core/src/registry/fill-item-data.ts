import type { PageData } from "../tree/types";
import { type ExternalRef, externalRefs, withExternalValues } from "./external-refs";
import type { ExternalItem } from "./external-source";
import { plainJsonCopy } from "./pick-value";
import type { Registry } from "./types";

/**
 * A copy of the page with the data of items put into the `external` values that hold them: the label and
 * the `data` of the item (no time: nothing is stored, so it may be more than a page keeps). `itemOf` says
 * which item each value stands for. A snapshot is left as it is when `itemOf` has no item for it or the
 * item's data is not plain JSON. A reference with no item has the old `data` and `at` taken out, so a page
 * whose item is gone, or could not be loaded, never draws what an earlier snapshot held. `only` limits it to
 * the fields that keep a `"reference"`. Gives back the very page when nothing changes.
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
    const data = item?.data === undefined ? undefined : plainJsonCopy(item.data);
    const id = ref.value.id;
    if (item && data !== undefined) {
      return [
        {
          nodeId: ref.nodeId,
          layer: ref.layer,
          path: ref.path,
          value: { id, label: item.label, data },
        },
      ];
    }
    if (ref.store !== "reference") return [];
    const label = item ? item.label : ref.value.label;
    return [{ nodeId: ref.nodeId, layer: ref.layer, path: ref.path, value: { id, label } }];
  });
  return withExternalValues(page, changes);
}
