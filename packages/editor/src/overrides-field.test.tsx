import type { ComponentDef, JsonValue } from "@midito-kitchen/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { type Overrides, OverridesContext } from "./overrides";
import { PropFields } from "./PropFields";
import { createEditorStore, type EditorState } from "./store";

const api: EditorApi = createApi({
  run: (() => true) as never,
  getState: createEditorStore<EditorState>({} as EditorState).getState,
  save: async () => true,
  addBlock: () => {},
  fit: () => {},
  alive: () => true,
});

const def = {
  label: "Thing",
  defaultProps: { title: "Hello", kind: "a", bold: false, italic: false },
  fields: {
    title: { type: "text", label: "Title" },
    kind: { type: "select", label: "Kind", options: ["a", "b", "c", "d"] },
    bold: { type: "boolean", label: "Bold" },
    italic: { type: "boolean", label: "Italic" },
  },
} as unknown as ComponentDef;

function draw(overrides: Overrides | undefined, onChange = vi.fn()): string {
  const tree: ReactNode = (
    <ControlProvider api={api}>
      <OverridesContext.Provider value={overrides}>
        <PropFields def={def} props={{}} onChange={onChange} nodeId="n1" />
      </OverridesContext.Provider>
    </ControlProvider>
  );
  return renderToString(tree);
}

describe("field override", () => {
  it("field replaces the input of one property and leaves the others", () => {
    const replaced = draw({
      field: ({ name, children, value }) =>
        name === "title" ? <b>{`mine:${String(value)}`}</b> : children,
    });
    expect(replaced).toContain("mine:Hello");
    expect(replaced).not.toContain('value="Hello"');
    expect(replaced).toContain("Kind");
  });

  it("children keeps the editor's own input", () => {
    const html = draw({
      field: ({ name, children }) => (name === "title" ? <section>{children}</section> : children),
    });
    expect(html).toMatch(/<section><label[^>]*>.*value="Hello"/);
  });

  it("a run of booleans is not passed to field", () => {
    const seen: string[] = [];
    draw({
      field: ({ name, children }) => {
        seen.push(name);
        return <>{children}</>;
      },
    });
    expect(seen).toEqual(["title", "kind"]);
  });

  it("onChange of the override writes only its own property", () => {
    const onChange = vi.fn();
    let received: ((value: JsonValue) => void) | undefined;
    draw(
      {
        field: ({ name, onChange: set, children }) => {
          if (name === "title") received = set;
          return <>{children}</>;
        },
      },
      onChange,
    );
    received?.("New");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("title", "New");
  });
});
