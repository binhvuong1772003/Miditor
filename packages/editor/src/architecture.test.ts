import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The shape of the editor, kept by a test: the rules in ARCHITECTURE.md that a tool can check.

const root = import.meta.dirname;

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

const files = sourceFiles(root).map((path) => ({
  name: relative(root, path),
  text: readFileSync(path, "utf8"),
}));

const importsOf = (text: string) =>
  [...text.matchAll(/(?:from|import)\s+"([^"]+)"/g)].map((match) => match[1] as string);

const inFolder = (folder: string) => files.filter((file) => file.name.startsWith(`${folder}/`));

const offenders = (list: typeof files, bad: (file: (typeof files)[number]) => boolean) =>
  list.filter(bad).map((file) => file.name);

describe("the shape of the editor", () => {
  it("reads the store library only inside store/", () => {
    expect(
      offenders(
        files,
        (file) =>
          file.name.startsWith("store/") === false &&
          importsOf(file.text).some((from) => from.startsWith("zustand")),
      ),
    ).toEqual([]);
  });

  it("changes the state only through the store's own commands", () => {
    expect(
      offenders(
        files,
        (file) => !file.name.startsWith("store/") && /\bstore\.setState\(/.test(file.text),
      ),
    ).toEqual([]);
  });

  it("keeps the store free of the screen: only context.tsx touches React, and none of it reads a component", () => {
    const store = inFolder("store");
    expect(
      offenders(
        store,
        (file) => file.name !== "store/context.tsx" && importsOf(file.text).includes("react"),
      ),
    ).toEqual([]);
    expect(
      offenders(store, (file) =>
        importsOf(file.text).some(
          (from) => from.startsWith("../") && (/\.tsx?$/.test(from) || /Editor|\.css/.test(from)),
        ),
      ),
    ).toEqual([]);
  });

  it("lets the parts of the canvas stand without the editor that holds them", () => {
    expect(
      offenders(inFolder("canvas"), (file) => importsOf(file.text).includes("../Editor")),
    ).toEqual([]);
  });
});
