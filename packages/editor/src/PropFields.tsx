import { type ComponentDef, type Field, type JsonValue, validateProps } from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useId, useRef, useState } from "react";
import styles from "./PropertiesPanel.module.css";
import { type UploadImage, uploadPicture } from "./upload-image";

export interface PropFieldsProps {
  def: ComponentDef;
  /** The props stored on the selected node. A prop that is not there shows its default. */
  props: Record<string, JsonValue>;
  /** A new, valid value for one prop. Not called for a value the field refuses. */
  onChange: (name: string, value: JsonValue) => void;
  /** The host's way to upload a picture. Without it a picture field has only its address to type. */
  uploadImage?: UploadImage | undefined;
}

/** Temporary: plain inputs built from the fields of a kind, to try the registry by hand. */
export function PropFields({ def, props, onChange, uploadImage }: PropFieldsProps) {
  return Object.entries(def.fields).map(([name, field]) => {
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
        uploadImage={uploadImage}
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
  uploadImage: UploadImage | undefined;
}

function PropField({ def, name, field, stored, onChange, uploadImage }: PropFieldProps) {
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
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  const chooser = useRef<HTMLInputElement>(null);
  /** Upload the chosen file and store the address that comes back. */
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !uploadImage) return;
    setUpload({ busy: true, error: null });
    const result = await uploadPicture(file, uploadImage);
    setUpload({ busy: false, error: result.ok ? null : result.error });
    if (result.ok) apply(result.url);
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
          {...(field.type === "image" ? { placeholder: "https://…" } : {})}
          onChange={(event) => setText(event.target.value)}
          onBlur={applyText}
          onKeyDown={onKeyDown}
        />
      )}
      {field.type === "image" && uploadImage && (
        <>
          <input ref={chooser} type="file" accept="image/*" hidden onChange={pick} />
          <button
            type="button"
            className={styles.input}
            disabled={upload.busy}
            onClick={() => chooser.current?.click()}
          >
            {upload.busy ? "Uploading…" : "Upload a picture"}
          </button>
          {upload.error && (
            <p className={styles.error} role="alert">
              {upload.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
