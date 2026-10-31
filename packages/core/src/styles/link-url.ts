/** The longest a link may be. */
const MAX_LINK = 2048;

const PLAIN = /^[^\s"'<>\\]+$/;
const PATH = /^\/(?!\/)[^\s"'<>\\]*$/;
const ANCHOR = /^#[^\s"'<>\\]*$/;
const MAILTO = /^mailto:[^\s"'<>\\]+$/i;
const TEL = /^tel:[+(]?[0-9][0-9 ()./-]{0,30}$/i;

const isWebUrl = (value: string) => {
  if (!PLAIN.test(value)) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};

/**
 * True only for an address `render` may put in the `href` of a link: a web address (`https:` or
 * `http:`), a `mailto:` or `tel:` address, a `#anchor` on the same page, or a path on the host's own
 * site that starts with one `/`. `javascript:`, `data:`, a protocol-relative `//host` and anything
 * with a space, quote, angle bracket or backslash are refused, as is an address that is too long.
 * An empty string is refused too: it means no link yet, which the caller checks for itself.
 */
export function isLinkUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_LINK) return false;
  return (
    isWebUrl(value) ||
    PATH.test(value) ||
    (value.length > 1 && ANCHOR.test(value)) ||
    MAILTO.test(value) ||
    TEL.test(value)
  );
}
