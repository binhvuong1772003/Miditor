import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The public surface of the control API, kept as files so a change to it shows in review.
// After a change on purpose, run `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`.

/** The types, comments and signatures of a file: no imports, no function or class bodies. */
function surfaceOf(source: string): string {
  const lines = source.replace(/^import [\s\S]*?;\n/gm, "").split("\n");
  const out: string[] = [];
  const depthOf = (line: string) =>
    (line.match(/\(/g)?.length ?? 0) - (line.match(/\)/g)?.length ?? 0);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^(export )?(async )?function |^export class /.test(line)) {
      // Keep the signature, which may take several lines, and skip down to the closing brace.
      let depth = 0;
      for (; i < lines.length; i++) {
        const sig = lines[i] ?? "";
        depth += depthOf(sig);
        if (depth <= 0 && sig.endsWith(" {")) {
          out.push(`${sig.slice(0, -2)};`);
          break;
        }
        out.push(sig);
      }
      while (lines[i] !== "}" && i < lines.length) i++;
    } else if (/^const \w+ = .*=>$/.test(line)) {
      // A private helper: not part of the surface. It ends at the next blank line.
      while ((lines[i] ?? "") !== "" && i < lines.length) i++;
    } else {
      out.push(line);
    }
  }
  return out.join("\n").replace(/^\n+/, "");
}

describe("public surface", () => {
  for (const file of [
    "control.ts",
    "control-api.ts",
    "overrides.tsx",
    "store/permissions.ts",
    "hide.tsx",
  ]) {
    it(`${file} keeps its types and signatures`, async () => {
      const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      const name = file.replace("/", "-");
      await expect(surfaceOf(source)).toMatchFileSnapshot(`./__snapshots__/${name}.snap`);
    });
  }

  it("index.ts keeps its exports", async () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    await expect(source).toMatchFileSnapshot("./__snapshots__/index.ts.snap");
  });
});
