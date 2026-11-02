import type { Field } from "@miditor/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { ValueInput } from "./nested-fields";

const entry: Field = {
  type: "object",
  label: "Entry",
  fields: {
    label: { type: "text", label: "Label" },
    link: { type: "link", label: "Link" },
    ok: { type: "boolean", label: "Ok" },
  },
};
const menu = (extra: Partial<Extract<Field, { type: "array" }>> = {}): Field => ({
  type: "array",
  label: "Menu",
  item: entry,
  ...extra,
});

const draw = (field: Field, value: unknown) =>
  renderToString(
    <EditorProvider>
      <ValueInput
        field={field}
        value={value as never}
        label="Menu"
        nodeId="root"
        inputs={undefined}
        onChange={() => {}}
      />
    </EditorProvider>,
  );

describe("an array of objects", () => {
  const two = [
    { label: "Home", link: "/" },
    { label: "About", link: "/about" },
  ];

  it("draws a row for each entry with the inputs of its fields", () => {
    const html = draw(menu(), two);
    expect(html).toContain('aria-label="Entry 1"');
    expect(html).toContain('aria-label="Entry 2"');
    expect(html).toContain('value="Home"');
    expect(html).toContain('value="/about"');
    expect(html).toContain("Add Entry");
  });

  it("turns off Move up for the first row and Move down for the last", () => {
    const html = draw(menu(), two);
    expect(html).toMatch(/aria-label="Move Entry 1 up"[^>]*disabled/);
    expect(html).toMatch(/aria-label="Move Entry 2 down"[^>]*disabled/);
  });

  it("turns off Remove at minItems and Add at maxItems", () => {
    expect(draw(menu({ minItems: 2 }), two)).toMatch(/aria-label="Remove Entry 1"[^>]*disabled/);
    expect(draw(menu({ maxItems: 2 }), two)).toMatch(/disabled=""[^>]*>Add Entry/);
    expect(draw(menu({ maxItems: 3 }), two)).not.toMatch(/disabled=""[^>]*>Add Entry/);
  });

  it("draws nothing but Add for a value that is not a list", () => {
    const html = draw(menu(), "x");
    expect(html).not.toContain('aria-label="Entry 1"');
    expect(html).toContain("Add Entry");
  });
});
