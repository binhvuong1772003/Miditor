import { builtInRegistry, emptyPage, insertNode, newNode, type TreeNode } from "@miditor/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CustomField, type CustomFieldInput, type CustomFieldProps } from "./custom-field";
import { EditorProvider } from "./Editor";

const page = () => {
  const start = emptyPage();
  const root = insertNode(
    start.root,
    "root",
    newNode(builtInRegistry, "Text", "t1", { w: 680, h: 788 }) as TreeNode,
  );
  return { ...start, root };
};

const field = { type: "custom", label: "Product", kind: "product-picker" } as const;

let seen: CustomFieldProps | undefined;
const Picker: CustomFieldInput = (props) => {
  seen = props;
  return <b>{`picker:${JSON.stringify(props.value)}:${props.readOnly}`}</b>;
};

const draw = (
  inputs: Record<string, CustomFieldInput> | undefined,
  onChange = vi.fn(),
  provider: Record<string, unknown> = {},
) =>
  renderToString(
    <EditorProvider data={page()} {...provider}>
      <CustomField
        name="product"
        field={field}
        stored={{ id: "p1" }}
        nodeId="t1"
        onChange={onChange}
        inputs={inputs}
      />
    </EditorProvider>,
  );

describe("a custom field", () => {
  it("draws the input the host gave for its kind, with the value", () => {
    const html = draw({ "product-picker": Picker });
    expect(html).toContain('aria-label="Product"');
    expect(html).toContain("picker:{&quot;id&quot;:&quot;p1&quot;}:false");
    expect(seen).toMatchObject({ name: "product", label: "Product", nodeId: "t1" });
  });

  it("stores what the input gives, under the name of the prop", () => {
    const onChange = vi.fn();
    draw({ "product-picker": Picker }, onChange);
    seen?.onChange({ id: "p2", tags: ["a"] });
    expect(onChange).toHaveBeenCalledWith("product", { id: "p2", tags: ["a"] });
  });

  it("gives the input the control object of the editor", () => {
    draw({ "product-picker": Picker });
    expect(typeof seen?.editor.undo).toBe("function");
  });

  it("says so when the host gave no input for the kind", () => {
    const html = draw({});
    expect(html).toContain("No input was given for the field kind");
    expect(html).toContain("product-picker");
  });

  it("says so when the host gave no inputs at all", () => {
    expect(draw(undefined)).toContain("No input was given");
  });

  it("does not take a kind from the prototype", () => {
    expect(draw({})).not.toContain("picker:");
    const html = renderToString(
      <EditorProvider data={page()}>
        <CustomField
          name="x"
          field={{ type: "custom", label: "X", kind: "constructor" }}
          stored={undefined}
          nodeId="t1"
          onChange={() => {}}
          inputs={{}}
        />
      </EditorProvider>,
    );
    expect(html).toContain("No input was given");
  });

  it("is read-only when the host's permissions do not let the block be edited", () => {
    const html = draw({ "product-picker": Picker }, vi.fn(), { permissions: { canEdit: false } });
    expect(html).toContain(":true");
    expect(seen?.readOnly).toBe(true);
  });
});
