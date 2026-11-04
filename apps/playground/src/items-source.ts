import type { ExternalItem, ExternalSource } from "@miditor/editor";

const ITEMS: ExternalItem[] = [
  {
    id: "beans",
    label: "Coffee beans",
    hint: "199.000đ",
    data: { title: "Coffee beans", price: "199.000đ" },
  },
  { id: "mug", label: "Blue mug", hint: "89.000đ", data: { title: "Blue mug", price: "89.000đ" } },
  {
    id: "kettle",
    label: "Steel kettle",
    hint: "459.000đ",
    data: { title: "Steel kettle", price: "459.000đ" },
  },
  {
    id: "filter",
    label: "Paper filters",
    hint: "45.000đ",
    data: { title: "Paper filters", price: "45.000đ" },
  },
  // More data than a page keeps (over 8000 bytes): picking it is refused, to try that message.
  {
    id: "catalogue",
    label: "Heavy catalogue",
    hint: "too big",
    data: { title: "Heavy catalogue", price: "0", pages: "x".repeat(9000) },
  },
];

/** The host's shop items, searched by name after a short wait that stops when the editor asks again. */
export const itemsSource: ExternalSource = {
  search: (query, signal) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
      }, 150);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      });
    }),
};
