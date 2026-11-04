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
  const { item } = answer;
  return stored.label === item.label && sameJson(stored.data, item.data) ? "same" : "changed";
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
