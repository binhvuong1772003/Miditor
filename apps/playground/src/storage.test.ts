import { emptyPage, type PageData } from "@midito-kitchen/editor";
import { describe, expect, it, vi } from "vitest";
import { SAMPLE_PAGE } from "./sample-page";
import { loadPage, type PageStorage, STORAGE_KEY, storePage } from "./storage";

/** A stand-in for localStorage that remembers what it was given. */
function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: PageStorage & { items: Map<string, string> } = {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
  return storage;
}

const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => {});

describe("loadPage", () => {
  it("opens the sample when nothing is stored", () => {
    expect(loadPage(fakeStorage())).toBe(SAMPLE_PAGE);
  });

  it("opens the stored page, as it was saved", () => {
    const page: PageData = emptyPage();
    page.root.id = "mine";
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(page) });
    expect(loadPage(storage)).toEqual(page);
  });

  it("opens the sample when the stored text is not JSON", () => {
    const warn = quiet();
    expect(loadPage(fakeStorage({ [STORAGE_KEY]: "{not json" }))).toBe(SAMPLE_PAGE);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("opens the sample when the stored value is JSON but not a page", () => {
    const warn = quiet();
    for (const text of [
      "null",
      "42",
      '"x"',
      "[]",
      "{}",
      '{"schemaVersion":1}',
      '{"schemaVersion":2,"root":{}}',
    ]) {
      expect(loadPage(fakeStorage({ [STORAGE_KEY]: text }))).toBe(SAMPLE_PAGE);
    }
    warn.mockRestore();
  });

  it("opens the sample when the stored page has a node that could break the drawing", () => {
    const warn = quiet();
    const page = JSON.parse(JSON.stringify(SAMPLE_PAGE)) as PageData;
    (page.root.children[0] as unknown as { styles: Record<string, unknown> }).styles = {
      background: "red;position:fixed",
    };
    expect(loadPage(fakeStorage({ [STORAGE_KEY]: JSON.stringify(page) }))).toBe(SAMPLE_PAGE);
    warn.mockRestore();
  });

  it("opens the sample when the browser refuses to read", () => {
    const warn = quiet();
    const storage = fakeStorage();
    storage.getItem = () => {
      throw new Error("denied");
    };
    expect(loadPage(storage)).toBe(SAMPLE_PAGE);
    warn.mockRestore();
  });

  it("drops the stored page on reset and opens the sample", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(emptyPage()) });
    expect(loadPage(storage, true)).toBe(SAMPLE_PAGE);
    expect(storage.items.has(STORAGE_KEY)).toBe(false);
  });

  it("does not drop the stored page without reset", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(emptyPage()) });
    loadPage(storage);
    expect(storage.items.has(STORAGE_KEY)).toBe(true);
  });

  it("still opens the sample when a reset cannot remove the stored page", () => {
    const warn = quiet();
    const storage = fakeStorage();
    storage.removeItem = () => {
      throw new Error("denied");
    };
    expect(loadPage(storage, true)).toBe(SAMPLE_PAGE);
    warn.mockRestore();
  });
});

describe("storePage", () => {
  it("writes the page as JSON under the key, and what is written loads back equal", () => {
    const storage = fakeStorage();
    expect(storePage(storage, SAMPLE_PAGE)).toBe(true);
    expect(JSON.parse(storage.items.get(STORAGE_KEY) ?? "null")).toEqual(SAMPLE_PAGE);
    expect(loadPage(storage)).toEqual(SAMPLE_PAGE);
  });

  it("returns false and does not throw when the browser refuses", () => {
    const warn = quiet();
    const storage = fakeStorage();
    storage.setItem = () => {
      throw new Error("quota");
    };
    expect(storePage(storage, SAMPLE_PAGE)).toBe(false);
    warn.mockRestore();
  });
});
