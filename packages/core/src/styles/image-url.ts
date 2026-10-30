/** The longest an ordinary address may be, and the longest a `data:` address (a picture inside the page) may be. */
const MAX_URL = 2048;
const MAX_DATA_URL = 200_000;

const PLAIN = /^[^\s"'<>\\]+$/;
const PATH = /^\/(?!\/)[^\s"'<>\\]*$/;
const DATA = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/;

const isWebUrl = (value: string) => {
  if (value.length > MAX_URL || !PLAIN.test(value)) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};

/**
 * True only for an address `render` may put in the `src` of a picture: a web address (`https:` or
 * `http:`), a path on the host's own site that starts with one `/`, or a `data:` address of a PNG,
 * JPEG, GIF, WebP or AVIF in base64. An SVG, `javascript:`, a protocol-relative `//host` and anything
 * with a space, quote, angle bracket or backslash are refused, as is an address that is too long. An
 * empty string is refused too: it means no picture yet, which the caller checks for itself.
 */
export function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.startsWith("data:")) return value.length <= MAX_DATA_URL && DATA.test(value);
  if (value.startsWith("/")) return value.length <= MAX_URL && PATH.test(value);
  return isWebUrl(value);
}
