import {
  defaultValueOf,
  type Field,
  type ItemField,
  type JsonValue,
  MAX_ITEMS,
} from "@miditor/core";
import { useState } from "react";
import { CustomField, type CustomFieldInput } from "./custom-field";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import styles from "./PropertiesPanel.module.css";

type Inputs = Readonly<Record<string, CustomFieldInput>> | undefined;

const isObject = (value: unknown): value is { [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * An input for a value inside an array or an object. Words and numbers are kept while they are typed and
 * stored when the input is left or Enter is pressed, so a run of keys is not a run of steps of history.
 */
function Leaf({
  field,
  value,
  onChange,
  label,
}: {
  field: Extract<ItemField, { type: "text" | "number" | "link" | "font" | "color" }>;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  label: string;
}) {
  const shown = value === undefined || value === null ? "" : String(value);
  const [text, setText] = useState(shown);
  const commit = () => {
    if (text === shown) return;
    onChange(field.type === "number" ? Number(text) : text);
  };
  return (
    <label className={styles.box} title={label}>
      <span className={styles.tag}>{label}</span>
      <input
        type={field.type === "color" ? "color" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={field.type === "color" && !/^#[0-9a-f]{6}$/i.test(text) ? "#000000" : text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setText(shown);
        }}
      />
    </label>
  );
}

/** The input of any field inside an array or an object: a value, and what to do with a new one. */
export function ValueInput({
  field,
  value,
  onChange,
  label,
  nodeId,
  inputs,
  depth = 0,
}: {
  field: ItemField | Field;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  label: string;
  nodeId: string;
  inputs: Inputs;
  depth?: number;
}) {
  const t = useT();
  switch (field.type) {
    case "text":
    case "number":
    case "link":
    case "font":
    case "color":
      // Made again when the stored value changes (undo, redo), so the typed text starts again from it.
      return (
        <Leaf
          key={JSON.stringify(value ?? null)}
          field={field}
          value={value}
          onChange={onChange}
          label={label}
        />
      );
    case "boolean":
      return (
        <label className={styles.box}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className={styles.tag}>{label}</span>
        </label>
      );
    case "select":
      return (
        <label className={styles.box}>
          <span className={styles.tag}>{label}</span>
          <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {t.or(`option.${option}`, option)}
              </option>
            ))}
          </select>
        </label>
      );
    case "custom":
      return (
        <CustomField
          name={label}
          field={field}
          stored={value}
          nodeId={nodeId}
          onChange={(_name, next) => onChange(next)}
          inputs={inputs}
        />
      );
    case "object": {
      const current = isObject(value) ? value : {};
      return (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
        <div role="group" aria-label={label} className={styles.stack}>
          {Object.entries(field.fields).map(([key, inner]) => (
            <ValueInput
              key={key}
              field={inner}
              value={current[key] ?? defaultValueOf(inner)}
              onChange={(next) => onChange({ ...current, [key]: next })}
              label={inner.label}
              nodeId={nodeId}
              inputs={inputs}
              depth={depth + 1}
            />
          ))}
        </div>
      );
    }
    case "array": {
      const items = Array.isArray(value) ? value : [];
      const most = Math.min(field.maxItems ?? MAX_ITEMS, MAX_ITEMS);
      const least = field.minItems ?? 0;
      const move = (from: number, to: number) => {
        const next = [...items];
        const [taken] = next.splice(from, 1);
        next.splice(to, 0, taken as JsonValue);
        onChange(next);
      };
      return (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
        <div role="group" aria-label={label} className={styles.stack}>
          {items.map((item, at) => {
            const name = t("field.item", { label: field.item.label, n: at + 1 });
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: the items have no ids of their own
              // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
              <div key={at} role="group" aria-label={name} className={styles.stack}>
                <ValueInput
                  field={field.item}
                  value={item}
                  onChange={(next) => onChange(items.map((old, i) => (i === at ? next : old)))}
                  label={field.item.label}
                  nodeId={nodeId}
                  inputs={inputs}
                  depth={depth + 1}
                />
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={t("field.moveUp", { name })}
                    disabled={at === 0}
                    onClick={() => move(at, at - 1)}
                  >
                    <Icon name="up" size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={t("field.moveDown", { name })}
                    disabled={at === items.length - 1}
                    onClick={() => move(at, at + 1)}
                  >
                    <Icon name="down" size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={t("field.remove", { name })}
                    disabled={items.length <= least}
                    onClick={() => onChange(items.filter((_old, i) => i !== at))}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.chip}
            disabled={items.length >= most}
            onClick={() => onChange([...items, defaultValueOf(field.item)])}
          >
            {t("field.add", { label: field.item.label })}
          </button>
        </div>
      );
    }
    default:
      return null;
  }
}
