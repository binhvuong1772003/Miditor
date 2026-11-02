import { migratePage, type PageData } from "@miditor/editor";
import { SAMPLE_PAGE } from "./sample-page";

/** Where the playground keeps the page. The editor knows nothing about this: it only calls `onChange`. */
export const STORAGE_KEY = "miditor-playground-page";

/** The part of `localStorage` the playground uses, so a test can pass a stand-in. */
export type PageStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * The page to open: the stored one, or the sample when nothing is stored, the stored text is not
 * JSON, it is not a page this editor can open (another version, or edited by hand), or the browser
 * refuses to read it. With `reset` the stored page is dropped first.
 */
export function loadPage(storage: PageStorage, reset = false): PageData {
  try {
    if (reset) {
      storage.removeItem(STORAGE_KEY);
      return SAMPLE_PAGE;
    }
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return SAMPLE_PAGE;
    const value: unknown = JSON.parse(text);
    const opened = migratePage(value);
    if (opened.ok) return opened.page;
    console.warn(
      `[playground] the stored page is not valid (${opened.reason}), opening the sample instead`,
    );
  } catch (error) {
    console.warn(
      "[playground] the stored page could not be read, opening the sample instead",
      error,
    );
  }
  return SAMPLE_PAGE;
}

/** Keeps the page. Returns false when the browser refuses (private mode, a full quota). */
export function storePage(storage: PageStorage, data: PageData): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn("[playground] the page could not be stored", error);
    return false;
  }
}
