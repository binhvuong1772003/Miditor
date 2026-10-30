import { type ComponentDef, type Field, type JsonValue, validateProps } from "@midito-kitchen/core";
import { type KeyboardEvent, useId, useState } from "react";
import styles from "./PropertiesPanel.module.css";

export interface PropFieldsProps {
  def: ComponentDef;
  /** The props stored on the selected node. A prop that is not there shows its default. */
  props: Record<string, JsonValue>;
  /** A new, valid value for one prop. Not called for a value the field refuses. */
  onChange: (name: string, value: JsonValue) => void;
}

/** Temporary: plain inputs built from the fields of a kind, to try the registry by hand. */
export function PropFields({ def, props, onChange }: PropFieldsProps) {
  // A picture is added and changed on the canvas, not typed as an address, so it has no field here.
  return Object.entries(def.fields).flatMap(([name, field]) => {
    if (field.type === "image") return [];
    const stored = Object.hasOwn(props, name) ? props[name] : def.defaultProps[name];
    // A new key when the stored value changes (undo, redo), so the typed text starts again from it.
    return (
      <PropField
        key={`${name}:${JSON.stringify(stored)}`}
        def={def}
        name={name}
        field={field}
        stored={stored}
        onChange={onChange}
      />
    );
  });
}

interface PropFieldProps {
  def: ComponentDef;
  name: string;
  field: Field;
  stored: JsonValue | undefined;
  onChange: PropFieldsProps["onChange"];
}

function PropField({ def, name, field, stored, onChange }: PropFieldProps) {
  const id = useId();
  const [text, setText] = useState(stored === undefined ? "" : String(stored));
  /** Stores `value` when the kind accepts it; otherwise the input goes back to what is stored. */
  const apply = (value: JsonValue) => {
    if (value === stored) return;
    if (validateProps(def, { [name]: value }).length > 0) {
      setText(stored === undefined ? "" : String(stored));
      return;
    }
    onChange(name, value);
  };
  const applyText = () => apply(field.type === "number" ? Number(text) : text);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") applyText();
    if (event.key === "Escape") setText(stored === undefined ? "" : String(stored));
  };

  if (field.type === "boolean") {
    return (
      <div className={styles.field}>
        <label className={styles.label} htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={stored === true}
            onChange={(event) => apply(event.target.checked)}
          />{" "}
          {field.label}
        </label>
      </div>
    );
  }
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {field.label}
      </label>
      {field.type === "select" ? (
        <select
          id={id}
          className={styles.input}
          value={String(stored ?? "")}
          onChange={(event) => apply(event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "color" ? (
        <input
          id={id}
          type="color"
          value={typeof stored === "string" ? stored : "#000000"}
          onChange={(event) => apply(event.target.value)}
        />
      ) : (
        <input
          id={id}
          className={styles.input}
          type={field.type === "number" ? "number" : "text"}
          value={text}
          {...(field.type === "text" && field.maxLength !== undefined
            ? { maxLength: field.maxLength }
            : {})}
          onChange={(event) => setText(event.target.value)}
          onBlur={applyText}
          onKeyDown={onKeyDown}
        />
      )}
    </div>
  );
}
