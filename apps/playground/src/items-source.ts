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

/**
 * What a check of the page asked for, for a test to read: how many `getMany` calls were made, how many
 * were answered (React's StrictMode starts the check twice and stops the first), and with which ids.
 */
type Calls = { getMany: number; answered: number; ids: string[][] };

/**
 * The same items as they are now. `?items-changed` makes the beans cost more and `?items-lost` takes the
 * kettle off the list, to see a page that was stored before checked against a source that has moved on.
 */
function itemsNow(): ExternalItem[] {
  const query = new URLSearchParams(window.location.search);
  return ITEMS.filter((item) => !(query.has("items-lost") && item.id === "kettle")).map((item) =>
    query.has("items-changed") && item.id === "beans"
      ? { ...item, hint: "249.000đ", data: { title: "Coffee beans", price: "249.000đ" } }
      : item,
  );
}

/** One call for all the ids of a page, as a host with a batch endpoint would answer it. */
itemsSource.getMany = (ids, signal) =>
  new Promise((resolve, reject) => {
    const w = window as unknown as { __itemsCalls?: Calls };
    w.__itemsCalls ??= { getMany: 0, answered: 0, ids: [] };
    const calls = w.__itemsCalls;
    calls.getMany += 1;
    calls.ids.push([...ids]);
    const timer = setTimeout(() => {
      calls.answered += 1;
      const now = itemsNow();
      resolve(
        Object.fromEntries(ids.map((id) => [id, now.find((item) => item.id === id) ?? null])),
      );
    }, 100);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
