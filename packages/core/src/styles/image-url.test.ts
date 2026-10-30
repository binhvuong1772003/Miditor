import { describe, expect, it } from "vitest";
import { isImageUrl } from "./image-url";

const png = "data:image/png;base64,iVBORw0KGgo=";

describe("isImageUrl", () => {
  it.each([
    "https://example.com/a.jpg",
    "http://example.com/a.png?x=1&y=2#top",
    "HTTPS://EXAMPLE.COM/A.JPG",
    "https://localhost:5173/cat.webp",
    "/images/cat.png",
    "/",
    png,
    "data:image/jpeg;base64,/9j/4AAQ+==",
    "data:image/gif;base64,R0lGODlh",
    "data:image/webp;base64,UklGRg==",
    "data:image/avif;base64,AAAA",
  ])("accepts %s", (value) => {
    expect(isImageUrl(value)).toBe(true);
  });

  it.each([
    "",
    "cat.png",
    "ftp://example.com/a.png",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "file:///etc/passwd",
    "//evil.com/a.png",
    "https://",
    "https:// example.com/a.png",
    "https://example.com/a b.png",
    'https://example.com/a".png',
    "https://example.com/a'.png",
    "https://example.com/<a>.png",
    "https://example.com\\a.png",
    "/a b.png",
    "/a\\b.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:text/html;base64,PGgxPg==",
    "data:image/png;base64,",
    "data:image/png,rawbytes",
    "data:image/png;base64,abc def",
    "data:image/png;base64,AAAA===",
    "data:image/pngx;base64,AAAA",
  ])("refuses %j", (value) => {
    expect(isImageUrl(value)).toBe(false);
  });

  it("refuses what is not a string", () => {
    for (const value of [undefined, null, 5, {}, [], true]) expect(isImageUrl(value)).toBe(false);
  });

  it("allows an address up to 2048 characters, a data address up to 200000, and no more", () => {
    const web = (n: number) => `https://e.co/${"a".repeat(n - "https://e.co/".length)}`;
    expect(isImageUrl(web(2048))).toBe(true);
    expect(isImageUrl(web(2049))).toBe(false);
    const path = (n: number) => `/${"a".repeat(n - 1)}`;
    expect(isImageUrl(path(2048))).toBe(true);
    expect(isImageUrl(path(2049))).toBe(false);
    const head = "data:image/png;base64,";
    const data = (n: number) => `${head}${"A".repeat(n - head.length)}`;
    expect(isImageUrl(data(200_000))).toBe(true);
    expect(isImageUrl(data(200_001))).toBe(false);
  });
});
