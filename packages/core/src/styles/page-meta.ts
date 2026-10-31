import { isImageUrl } from "./image-url";

/** The longest title and description a page may carry: what a search result and a share card show. */
export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 300;

/**
 * What the page says about itself outside the page: the title of its tab and of a search result,
 * the line under it, and the picture of a share card. All of it is optional text and an address.
 */
export interface PageMeta {
  title?: string;
  description?: string;
  /** A picture address `isImageUrl` accepts. */
  image?: string;
}

const hasControl = (text: string) =>
  [...text].some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });

const isText = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max && !hasControl(value);

/**
 * True only for page info stored the way the types say: text without control characters, at most
 * `MAX_TITLE` and `MAX_DESCRIPTION` long, a safe picture address, and no other key. Data comes
 * from outside, so this is the strict check.
 */
export function isPageMeta(value: unknown): value is PageMeta {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).every((key) => key === "title" || key === "description" || key === "image") &&
    (!("title" in v) || isText(v.title, MAX_TITLE)) &&
    (!("description" in v) || isText(v.description, MAX_DESCRIPTION)) &&
    (!("image" in v) || isImageUrl(v.image))
  );
}

/** The meta without an empty field, or `undefined` when nothing is left, so an empty box is not stored. */
export function tidyMeta(meta: PageMeta): PageMeta | undefined {
  const out: PageMeta = {};
  const title = meta.title?.trim();
  const description = meta.description?.trim();
  if (title) out.title = title;
  if (description) out.description = description;
  if (meta.image) out.image = meta.image;
  return Object.keys(out).length === 0 ? undefined : out;
}
