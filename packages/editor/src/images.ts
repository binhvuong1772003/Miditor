import { isImageUrl } from "@miditor/core";

/** One picture of the host's library, to add to the page from the Images panel. */
export interface LibraryImage {
  /** The address of the picture; it is what the Image block stores. Must be one `render` can draw. */
  url: string;
  /** What a search finds it by, and what a screen reader says. */
  name?: string;
  /** A smaller copy to show in the list, so a long list stays light. Without it `url` is shown. */
  thumb?: string;
  /** The natural size in px. With both, the list is laid out at once; without them it settles as the pictures load. */
  width?: number;
  height?: number;
  /** The folder it is in. Pictures with the same folder are grouped under Folders. */
  folder?: string;
  /** Extra words a search finds it by. */
  tags?: readonly string[];
}

const MAX_NAME = 100;
const MAX_TAGS = 10;
const MAX_TAG = 30;

const text = (value: unknown, max: number): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed !== "" && trimmed.length <= max ? trimmed : undefined;
};

const size = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

/**
 * The host's pictures that can be used. A row may come straight from a database, so only the known
 * fields are taken from it. A row without an address that `render` can draw, or with an address
 * seen before, is left out and said so once in the console; a bad extra field (a name that is too
 * long, one size without the other) is dropped and the picture stays.
 */
export function usableImages(rows: readonly unknown[] | undefined): LibraryImage[] {
  const seen = new Set<string>();
  const out: LibraryImage[] = [];
  for (const row of rows ?? []) {
    const r = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {};
    if (!isImageUrl(r.url)) {
      console.warn("[miditor] a picture in `config.images` is left out: its url cannot be used");
      continue;
    }
    if (seen.has(r.url)) {
      console.warn("[miditor] a picture in `config.images` is left out: its url is used twice");
      continue;
    }
    seen.add(r.url);
    const name = text(r.name, MAX_NAME);
    const folder = text(r.folder, MAX_NAME);
    const width = size(r.width);
    const height = size(r.height);
    const tags = Array.isArray(r.tags)
      ? r.tags.slice(0, MAX_TAGS).flatMap((tag) => text(tag, MAX_TAG) ?? [])
      : [];
    out.push({
      url: r.url,
      ...(name ? { name } : {}),
      ...(isImageUrl(r.thumb) ? { thumb: r.thumb } : {}),
      ...(width && height ? { width, height } : {}),
      ...(folder ? { folder } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    });
  }
  return out;
}

/** Lower case without accents, so `hoa` finds `Hòa` and `dong` finds `Đông`. */
const plain = (value: string): string =>
  value.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/** The pictures whose name, folder or tags hold every word of the query. An empty query keeps them all. */
export function searchImages(
  images: readonly LibraryImage[],
  query: string,
): readonly LibraryImage[] {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return images;
  return images.filter((image) => {
    const haystack = plain([image.name, image.folder, ...(image.tags ?? [])].join(" "));
    return words.every((word) => haystack.includes(word));
  });
}

/** The folders of the pictures, in the order they first appear, each with how many it holds and its first picture. */
export function foldersOf(
  images: readonly LibraryImage[],
): { name: string; count: number; cover: LibraryImage }[] {
  const folders = new Map<string, { name: string; count: number; cover: LibraryImage }>();
  for (const image of images) {
    if (!image.folder) continue;
    const known = folders.get(image.folder);
    if (known) known.count += 1;
    else folders.set(image.folder, { name: image.folder, count: 1, cover: image });
  }
  return [...folders.values()];
}
