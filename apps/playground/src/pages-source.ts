import type { ExternalSource } from "@miditor/editor";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "about", label: "About us" },
  { id: "abc", label: "Abacus" },
  { id: "contact", label: "Contact" },
];

/** The host's pages, searched by name after a short wait that stops when the editor asks again. */
export const pagesSource: ExternalSource = {
  search: (query, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(PAGES.filter((page) => page.label.toLowerCase().includes(query.toLowerCase())));
      }, 150);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    }),
};
