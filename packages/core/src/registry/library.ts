import type { ComponentDef, Registry } from "./types";

/** One kind in the library: the `type` a block stores, and the definition it comes from. */
export interface LibraryItem {
  type: string;
  def: ComponentDef;
}

/** The kinds of one group of the library, in the order they are shown. */
export interface LibraryGroup {
  category: string;
  items: LibraryItem[];
}

/** The group of a kind that names none, and the group the editor lists first when nothing is searched. */
export const BASIC_CATEGORY = "Basic";
export const DEFAULT_CATEGORY = "Custom";

/**
 * Text as it is compared in a search: lowercase, without accents and without the stroke of a
 * Vietnamese `đ`, so that "nut" finds "Nút" and "dong" finds "Đồng".
 */
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

/** How well a kind matches a folded query: lower is better, `undefined` for no match. */
function scoreOf(
  { type, def }: LibraryItem,
  query: string,
  words: readonly string[],
): number | undefined {
  const label = fold(def.label);
  const name = fold(type);
  const keywords = (def.keywords ?? []).map(fold);
  const about = fold(def.description ?? "");
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  if (keywords.includes(query)) return 3;
  if (name.includes(query)) return 4;
  if (keywords.some((word) => word.startsWith(query))) return 5;
  if (keywords.some((word) => word.includes(query))) return 6;
  if (about.includes(query)) return 7;
  // Several words: each of them has to be somewhere in the kind.
  const all = [label, name, ...keywords, about];
  return words.every((word) => all.some((text) => text.includes(word))) ? 8 : undefined;
}

/**
 * The kinds of the registry that a query finds, best first and in the order of the registry among
 * equals: the label first (the whole of it, the start, then anywhere in it), then a keyword that is
 * the query, the type, a keyword that starts with it or has it inside, the description. Case and
 * accents are ignored. A query with nothing in it finds every kind. A kind that is `hidden` is never found.
 */
export function searchRegistry(registry: Registry, query: string): LibraryItem[] {
  const folded = fold(query);
  const words = folded.split(/\s+/).filter(Boolean);
  const scored = Object.entries(registry)
    .filter(
      ([, def]) =>
        typeof def === "object" &&
        def !== null &&
        typeof def.label === "string" &&
        def.hidden !== true,
    )
    .map(([type, def], order) => ({ item: { type, def }, order }))
    .flatMap(({ item, order }) => {
      const score = folded === "" ? 0 : scoreOf(item, folded, words);
      return score === undefined ? [] : [{ item, order, score }];
    });
  return scored.sort((a, b) => a.score - b.score || a.order - b.order).map(({ item }) => item);
}

/**
 * The library the editor shows: the kinds a query finds, in groups by `category` (a kind with none is
 * in "Custom"). With no query "Basic" comes first and the other groups follow in the order of the
 * registry; with a query the groups follow the best match.
 */
export function libraryOf(registry: Registry, query = ""): LibraryGroup[] {
  const groups: LibraryGroup[] = [];
  for (const item of searchRegistry(registry, query)) {
    const named = typeof item.def.category === "string" ? item.def.category.trim() : "";
    const category = named === "" ? DEFAULT_CATEGORY : named;
    const group = groups.find((g) => g.category === category);
    if (group) group.items.push(item);
    else groups.push({ category, items: [item] });
  }
  if (fold(query) !== "") return groups;
  const basic = groups.find((g) => g.category === BASIC_CATEGORY);
  return basic ? [basic, ...groups.filter((g) => g !== basic)] : groups;
}
