import type { JsonValue } from "../tree/types";
import type { ExternalRef } from "./external-refs";
import type { ExternalItem } from "./external-source";
import type { Answer } from "./load-items";
import { pickValue, sameJson } from "./pick-value";

/** What a source's answer means for a stored item: nothing new, newer data, lost, or not known. */
export type Verdict = "same" | "changed" | "gone" | "failed";

/**
 * Compares what the page holds with what the source said. `label` and `data` are compared as JSON; the
 * time `at` is not part of it. A page that holds no `data` while the item has some is `changed`.
 */
export function judge(stored: ExternalRef["value"], answer: Answer | undefined): Verdict {
  if (!answer || answer.status === "failed") return "failed";
  if (answer.status === "gone") return "gone";
  // What the page would keep of the item, so data it cannot keep (too big, not plain JSON) never counts
  // as newer: Update would write the same value back and the message would never go.
  const kept = pickValue(answer.item, new Date(0)) as { label: string; data?: JsonValue } | null;
  if (kept === null) return "same";
  return stored.label === kept.label && sameJson(stored.data, kept.data) ? "same" : "changed";
}

/**
 * The stored value for an item that has changed: what picking it would store now. When the item's data
 * cannot be kept in a page the stored value stays as it is.
 */
export function updateValue(
  stored: ExternalRef["value"],
  item: ExternalItem,
  now: Date,
): JsonValue {
  return pickValue(item, now) ?? (stored as JsonValue);
}
