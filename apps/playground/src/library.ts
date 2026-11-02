import type { LibraryImage } from "@miditor/editor";
import type { PageStorage } from "./storage";

const photo = (id: number, w: number, h: number): string =>
  `https://picsum.photos/id/${id}/${w}/${h}`;

/** The pictures the demo's "host" already has, in different shapes and folders. */
export const seedImages: readonly LibraryImage[] = [
  {
    url: photo(1015, 800, 500),
    thumb: photo(1015, 240, 150),
    width: 800,
    height: 500,
    name: "River valley",
    folder: "Landscapes",
    tags: ["water", "mountain"],
  },
  {
    url: photo(1025, 600, 600),
    thumb: photo(1025, 200, 200),
    width: 600,
    height: 600,
    name: "Pug",
    folder: "Animals",
    tags: ["dog"],
  },
  {
    url: photo(1043, 500, 750),
    thumb: photo(1043, 200, 300),
    width: 500,
    height: 750,
    name: "Forest path",
    folder: "Landscapes",
    tags: ["tree"],
  },
  {
    url: photo(1062, 800, 530),
    thumb: photo(1062, 240, 160),
    width: 800,
    height: 530,
    name: "Dog portrait",
    folder: "Animals",
    tags: ["dog", "portrait"],
  },
  {
    url: photo(1074, 800, 450),
    thumb: photo(1074, 240, 135),
    width: 800,
    height: 450,
    name: "Lion",
    folder: "Animals",
  },
  {
    url: photo(1080, 600, 600),
    thumb: photo(1080, 200, 200),
    width: 600,
    height: 600,
    name: "Strawberries",
    folder: "Food",
    tags: ["fruit"],
  },
  {
    url: photo(292, 700, 500),
    thumb: photo(292, 210, 150),
    width: 700,
    height: 500,
    name: "Bread",
    folder: "Food",
  },
  { url: photo(180, 800, 500), thumb: photo(180, 240, 150), name: "Desk" },
];

/** Where the demo keeps the pictures a person uploaded, standing in for the host's library. */
export const IMAGES_KEY = "miditor-playground-images";

export function loadUploaded(storage: PageStorage): LibraryImage[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(IMAGES_KEY) ?? "[]");
    return Array.isArray(value) ? (value as LibraryImage[]) : [];
  } catch {
    return [];
  }
}

export function storeUploaded(storage: PageStorage, images: readonly LibraryImage[]): void {
  try {
    storage.setItem(IMAGES_KEY, JSON.stringify(images));
  } catch {
    // The browser is full: the pictures last until the page is closed.
  }
}
