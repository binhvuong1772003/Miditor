import { type Field, findNode, type JsonValue } from "@miditor/core";
import { type ComponentType, useEffect } from "react";
import type { EditorApi } from "./control-api";
import { useEditor } from "./control-context";
import { useT } from "./i18n/context";
import styles from "./PropertiesPanel.module.css";
import { useMay } from "./permissions-context";
import { useEditorState } from "./store";

/** What the editor gives an input of the host's own. @experimental */
export interface CustomFieldProps {
  /** The name of the prop this input edits. */
  name: string;
  /** The label the kind gave the field. */
  label: string;
  /** What is stored now: whatever the input stored before, or the kind's default; `undefined` for none. */
  value: JsonValue | undefined;
  /** Store a new value (any JSON). It is one step of history. */
  onChange(value: JsonValue): void;
  /** True when the host's permissions do not let this block be edited: draw the input read-only. */
  readOnly: boolean;
  /** The id of the block being edited. */
  nodeId: string;
  /** The control object of the editor, to read its state or drive it. */
  editor: EditorApi;
}

/**
 * An input the host draws for a `custom` field. Given to the editor in `config.customFields`, by the name
 * the field's `kind` has. @experimental
 */
export type CustomFieldInput = ComponentType<CustomFieldProps>;

// A kind with no input is told once, not on every render.
const told = new Set<string>();

/** The input of the host for a `custom` field, in the panel of the selected block. */
export function CustomField({
  name,
  field,
  stored,
  nodeId,
  onChange,
  inputs,
}: {
  name: string;
  field: Extract<Field, { type: "custom" }>;
  stored: JsonValue | undefined;
  nodeId: string;
  onChange: (name: string, value: JsonValue) => void;
  inputs: Readonly<Record<string, CustomFieldInput>> | undefined;
}) {
  const t = useT();
  const editor = useEditor();
  const node = useEditorState((state) => findNode(state.history.present.root, nodeId));
  const readOnly = !useMay("canEdit", node);
  const Input = inputs && Object.hasOwn(inputs, field.kind) ? inputs[field.kind] : undefined;
  useEffect(() => {
    if (Input || told.has(field.kind)) return;
    told.add(field.kind);
    console.warn(
      `[miditor] no input for the custom field kind "${field.kind}" (config.customFields)`,
    );
  }, [Input, field.kind]);
  if (!Input) {
    return (
      <p role="note" className={styles.note}>
        {t("field.noInput", { kind: field.kind })}
      </p>
    );
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
    <div role="group" aria-label={field.label} title={field.help}>
      <Input
        name={name}
        label={field.label}
        value={stored}
        onChange={(value) => onChange(name, value)}
        readOnly={readOnly}
        nodeId={nodeId}
        editor={editor}
      />
    </div>
  );
}
