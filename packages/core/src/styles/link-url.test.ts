import { describe, expect, it } from "vitest";
import { isLinkUrl } from "./link-url";

describe("isLinkUrl", () => {
  it.each([
    "https://example.com",
    "https://example.com/a/b?x=1&y=2#top",
    "http://example.com",
    "HTTPS://EXAMPLE.COM/A",
    "https://localhost:5173/x",
    "/",
    "/contact",
    "/a/b?x=1#y",
    "#top",
    "#section-2",
    "mailto:me@example.com",
    "mailto:me@example.com?subject=Hi",
    "MAILTO:me@example.com",
    "tel:+84901234567",
    "tel:0901 234 567",
    "tel:(028) 123-4567",
  ])("accepts %s", (value) => {
    expect(isLinkUrl(value)).toBe(true);
  });

  it.each([
    "",
    "#",
    "contact",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html;base64,PGgxPg==",
    "vbscript:x",
    "file:///etc/passwd",
    "ftp://example.com",
    "//evil.com",
    "//evil.com/x",
    "https://",
    "https:// example.com",
    "https://example.com/a b",
    'https://example.com/a"b',
    "https://example.com/<a>",
    "https://example.com\\a",
    "/a b",
    "/a\\b",
    "#a b",
    '#a"b',
    "mailto:",
    "mailto:a b@example.com",
    "tel:",
    "tel:abc",
    "tel:+",
    "tel:12345678901234567890123456789012",
    "tel:12;34",
  ])("refuses %j", (value) => {
    expect(isLinkUrl(value)).toBe(false);
  });

  it("refuses what is not a string", () => {
    for (const value of [undefined, null, 5, {}, [], true]) expect(isLinkUrl(value)).toBe(false);
  });

  it("allows up to 2048 characters and no more", () => {
    const web = (n: number) => `https://e.co/${"a".repeat(n - "https://e.co/".length)}`;
    expect(isLinkUrl(web(2048))).toBe(true);
    expect(isLinkUrl(web(2049))).toBe(false);
    expect(isLinkUrl(`/${"a".repeat(2047)}`)).toBe(true);
    expect(isLinkUrl(`/${"a".repeat(2048)}`)).toBe(false);
  });
});
