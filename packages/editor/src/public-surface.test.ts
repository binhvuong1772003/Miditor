import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The public surface of the control API, kept as files so a change to it shows in review.
// After a change on purpose, run `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`.

/** The types, comments and signatures of a file: no imports, no function bodies. */
function surfaceOf(source: string): string {
  return source
    .replace(/^import [\s\S]*?;\n/gm, "")
    .replace(/^((?:export )?(?:async )?function [^\n]*?)\s*\{\n[\s\S]*?\n\}\n/gm, "$1;\n")
    .replace(/^\n+/, "");
}

describe("public surface", () => {
  for (const file of ["control.ts", "control-api.ts"]) {
    it(`${file} keeps its types and signatures`, async () => {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      await expect(surfaceOf(source)).toMatchFileSnapshot(`./__snapshots__/${file}.snap`);
    });
  }

  it("index.ts keeps its exports", async () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    await expect(source).toMatchFileSnapshot("./__snapshots__/index.ts.snap");
  });
});
