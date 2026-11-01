import { afterEach, describe, expect, it, vi } from "vitest";
import { foldersOf, searchImages, usableImages } from "./images";

const a = { url: "https://cdn.x/a.jpg", name: "Logo Hòa Minzy", folder: "Brand", tags: ["đông"] };
const b = { url: "https://cdn.x/b.jpg", name: "Banner", folder: "Brand" };
const c = { url: "/uploads/c.png" };

afterEach(() => vi.restoreAllMocks());

describe("usableImages", () => {
  it("is empty without a list", () => {
    expect(usableImages(undefined)).toEqual([]);
  });

  it("keeps good pictures and leaves the fields of a database row behind", () => {
    const rows = [{ ...a, ownerId: 3, createdAt: "2026" }, b, c];
    expect(usableImages(rows)).toEqual([a, b, c]);
  });

  it("leaves out, and says why, a row without a usable or a new url", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = [null, {}, { url: "javascript:alert(1)" }, { url: "https://x/a.svg x" }, a, a];
    expect(usableImages(rows)).toEqual([a]);
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it("drops a bad extra field and keeps the picture", () => {
    const row = {
      url: a.url,
      name: "x".repeat(101),
      thumb: "nope",
      width: 100,
      folder: "  ",
      tags: [1, "", "ok"],
    };
    expect(usableImages([row])).toEqual([{ url: a.url, tags: ["ok"] }]);
  });

  it("keeps a size only when both sides are good", () => {
    expect(usableImages([{ url: a.url, width: 4, height: 3 }])[0]).toMatchObject({
      width: 4,
      height: 3,
    });
    expect(usableImages([{ url: a.url, width: 4, height: 0 }])[0]).toEqual({ url: a.url });
  });
});

describe("searchImages", () => {
  const all = usableImages([a, b, c]);
  it("keeps all for an empty query", () => {
    expect(searchImages(all, "  ")).toEqual(all);
  });
  it("finds by name, folder and tags, with or without accents, every word needed", () => {
    expect(searchImages(all, "hoa").map((i) => i.url)).toEqual([a.url]);
    expect(searchImages(all, "DONG").map((i) => i.url)).toEqual([a.url]);
    expect(searchImages(all, "brand").map((i) => i.url)).toEqual([a.url, b.url]);
    expect(searchImages(all, "brand banner").map((i) => i.url)).toEqual([b.url]);
    expect(searchImages(all, "zzz")).toEqual([]);
  });
});

describe("foldersOf", () => {
  it("groups by folder in the order they appear and skips pictures without one", () => {
    const folders = foldersOf(
      usableImages([c, a, b, { url: "https://cdn.x/d.jpg", folder: "Docs" }]),
    );
    expect(folders.map((f) => [f.name, f.count, f.cover.url])).toEqual([
      ["Brand", 2, a.url],
      ["Docs", 1, "https://cdn.x/d.jpg"],
    ]);
  });
});
