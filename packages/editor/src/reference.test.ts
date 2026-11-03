import { MAX_FIELD_DEPTH, MAX_ITEMS } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { HIDE_NAMES } from "./hide";
import { OVERRIDE_PLACES } from "./overrides";
import { PLUGIN_API_VERSION } from "./plugins";
import { PERMISSION_KEYS } from "./store";
import { commandTable } from "./store/commands";

// The names a host can use, written from the code that defines them. The file `docs/reference.md` is
// checked in, so a name that is added, renamed or removed shows in the review as a change to it.
// Regenerate it with `pnpm exec vitest run packages/editor/src/reference.test.ts -u`.

const list = (names: readonly string[]) => names.map((name) => `- \`${name}\``).join("\n");

function reference(): string {
  const groups = new Map<string, string[]>();
  for (const name of HIDE_NAMES) {
    const group = name.includes(".") ? name.slice(0, name.indexOf(".")) : "places";
    groups.set(group, [...(groups.get(group) ?? []), name]);
  }
  return `# Reference

Written by \`packages/editor/src/reference.test.ts\` from the code. Do not edit by hand.

Everything here is experimental until the packages leave \`0.0.0\` (see [VERSIONING](./VERSIONING.md)).

## Places of \`overrides\`

${list(OVERRIDE_PLACES)}

## Names for \`hide\`

${[...groups].map(([group, names]) => `### ${group}\n\n${list(names)}`).join("\n\n")}

## Keys of \`permissions\`

${list(PERMISSION_KEYS)}

## Commands (\`run\`)

${list(Object.keys(commandTable))}

## Limits

- Plugin API version: ${PLUGIN_API_VERSION}
- Longest array field: ${MAX_ITEMS} items
- Deepest nesting of array and object fields: ${MAX_FIELD_DEPTH}
`;
}

describe("the reference", () => {
  it("lists every place, hidable name, permission and command", async () => {
    await expect(reference()).toMatchFileSnapshot("../../../docs/reference.md");
  });

  it("has no name twice", () => {
    for (const names of [OVERRIDE_PLACES, HIDE_NAMES, PERMISSION_KEYS, Object.keys(commandTable)]) {
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
