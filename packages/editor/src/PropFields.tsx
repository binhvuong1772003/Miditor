import {
  type ComponentDef,
  type Field,
  type JsonValue,
  resolveColor,
  type Theme,
  validateProps,
} from "@midito-kitchen/core";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";
import styles from "./PropertiesPanel.module.css";
import { Section } from "./Section";
import { ThemePicker } from "./ThemePicker";

export interface PropFieldsProps {
  def: ComponentDef;
  /** The props stored on the selected node. A prop that is not there shows its default. */
  props: Record<string, JsonValue>;
  /** A new, valid value for one prop. Not called for a value the field refuses. */
  onChange: (name: string, value: JsonValue) => void;
  /** The theme of the page, for a colour field to offer its colours. */
  theme?: Theme | undefined;
}

/** The heading of the fields that name no section. */
const DEFAULT_SECTION = "Content";

/** The first letter in capitals, for the name of a choice the registry stores in lowercase. */
const nice = (word: string) => (word[0]?.toUpperCase() ?? "") + word.slice(1);

const ALIGN_ICONS: Record<string, IconName> = {
  left: "alignLeft",
  center: "alignCenter",
  right: "alignRight",
};

/** Whether this field is the three alignments, which are drawn as icons. */
const isAlign = (name: string, field: Field) =>
  name === "align" &&
  field.type === "select" &&
  field.options.length === 3 &&
  field.options.every((option) => Object.hasOwn(ALIGN_ICONS, option));

/** Whether a field needs a whole row: words, a link, a colour, or a few choices written out. */
const wide = (name: string, field: Field) =>
  field.type === "text" ||
  field.type === "link" ||
  field.type === "color" ||
  (field.type === "select" && field.options.length === 3 && !isAlign(name, field));

/**
 * The fields a kind declares, by section: the ones with no `group` first, then each group in the
 * order it first appears. Within a section small fields sit two to a row and wide ones take a row.
 * A picture has no field here: it is added and changed on the canvas.
 */
export function PropFields({ def, props, onChange, theme }: PropFieldsProps) {
  const sections = new Map<string, { name: string; field: Field }[]>();
  for (const [name, field] of Object.entries(def.fields)) {
    if (field.type === "image") continue;
    const section = field.group ?? DEFAULT_SECTION;
    sections.set(section, [...(sections.get(section) ?? []), { name, field }]);
  }
  // The section of fields with no group comes first, whatever the order of the registry.
  const ordered = [...sections.entries()].sort(
    ([a], [b]) => Number(b === DEFAULT_SECTION) - Number(a === DEFAULT_SECTION),
  );
  return ordered.map(([section, fields]) => (
    <Section key={section} title={section}>
      <div className={styles.grid2}>
        {fields.map(({ name, field }) => {
          const stored = Object.hasOwn(props, name) ? props[name] : def.defaultProps[name];
          // A new key when the stored value changes (undo, redo), so the typed text starts again from it.
          return (
            <div
              key={`${name}:${JSON.stringify(stored)}`}
              className={`${styles.stack} ${wide(name, field) ? styles.span2 : ""}`}
            >
              <PropField
                def={def}
                name={name}
                field={field}
                stored={stored}
                onChange={onChange}
                theme={theme}
              />
            </div>
          );
        })}
      </div>
    </Section>
  ));
}

interface PropFieldProps {
  def: ComponentDef;
  name: string;
  field: Field;
  stored: JsonValue | undefined;
  onChange: PropFieldsProps["onChange"];
  theme: Theme | undefined;
}

function PropField({ def, name, field, stored, onChange, theme }: PropFieldProps) {
  const shown = stored === undefined ? "" : String(stored);
  const [text, setText] = useState(shown);
  /** Stores `value` when the kind accepts it; otherwise the field goes back to what is stored. */
  const apply = (value: JsonValue) => {
    if (value === stored) return;
    if (validateProps(def, { [name]: value }).length > 0) {
      setText(shown);
      return;
    }
    onChange(name, value);
  };
  const applyText = () => apply(field.type === "number" ? Number(text) : text);
  const keys = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") setText(shown);
    // Enter ends a line of words that has one line; in a box of lines it takes Ctrl or Cmd.
    if (
      event.key === "Enter" &&
      (field.type !== "text" || !field.multiline || event.ctrlKey || event.metaKey)
    ) {
      if (field.type === "text" && field.multiline) event.preventDefault();
      applyText();
    }
  };

  if (field.type === "boolean") {
    return (
      <button
        type="button"
        className={styles.chip}
        aria-pressed={stored === true}
        title={field.help}
        onClick={() => apply(stored !== true)}
      >
        {field.label}
      </button>
    );
  }

  if (field.type === "select") {
    const current = String(stored ?? "");
    if (field.options.length <= 3) {
      return (
        // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
        <div role="group" aria-label={field.label} title={field.help} className={styles.seg}>
          {field.options.map((option) => {
            const icon = isAlign(name, field) ? ALIGN_ICONS[option] : undefined;
            return (
              <button
                key={option}
                type="button"
                className={styles.segButton}
                aria-pressed={current === option}
                aria-label={icon ? `${field.label}: ${option}` : undefined}
                title={icon ? `${field.label}: ${option}` : undefined}
                onClick={() => apply(option)}
              >
                {icon ? <Icon name={icon} /> : nice(option)}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <label className={styles.box} title={field.help}>
        <span className={styles.tag}>{field.label}</span>
        <select value={current} onChange={(event) => apply(event.target.value)}>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {nice(option)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "color") {
    return (
      <ColourRow
        label={field.label}
        help={field.help}
        stored={stored}
        theme={theme}
        apply={apply}
      />
    );
  }

  if (field.type === "text" && field.multiline) {
    return (
      <textarea
        className={styles.area}
        aria-label={field.label}
        title={field.help}
        rows={3}
        value={text}
        {...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {})}
        onChange={(event) => setText(event.target.value)}
        onBlur={applyText}
        onKeyDown={keys}
      />
    );
  }

  return (
    <label className={styles.box} title={field.help}>
      <span className={styles.tag}>{field.label}</span>
      <input
        type={field.type === "number" ? "number" : "text"}
        value={text}
        {...(field.type === "text" && field.maxLength !== undefined
          ? { maxLength: field.maxLength }
          : {})}
        {...(field.type === "link" ? { placeholder: "https://…", spellCheck: false } : {})}
        onChange={(event) => setText(event.target.value)}
        onBlur={applyText}
        onKeyDown={keys}
      />
      {field.type === "number" && field.unit && (
        <span className={styles.suffix} aria-hidden="true">
          {field.unit}
        </span>
      )}
    </label>
  );
}

/** A colour: the swatch to pick one, with its name, and the colours of the theme to choose from. */
function ColourRow({
  label,
  help,
  stored,
  theme,
  apply,
}: {
  label: string;
  help: string | undefined;
  stored: JsonValue | undefined;
  theme: Theme | undefined;
  apply: (value: JsonValue) => void;
}) {
  const value = typeof stored === "string" ? stored : "";
  const picker = useRef<HTMLInputElement>(null);
  // The swatch fires on every move of the picker; only its own `change` says the pick is done.
  const latest = useRef(apply);
  latest.current = apply;
  useEffect(() => {
    const element = picker.current;
    if (!element) return;
    const done = () => latest.current(element.value);
    element.addEventListener("change", done);
    return () => element.removeEventListener("change", done);
  }, []);
  return (
    <div className={styles.row}>
      <label className={`${styles.box} ${styles.colour}`} title={help}>
        <input
          ref={picker}
          type="color"
          className={styles.dot}
          aria-label={`${label} picker`}
          defaultValue={resolveColor(value, theme) ?? "#000000"}
        />
        <span className={styles.tag}>{label}</span>
      </label>
      <ThemePicker theme={theme} stored={value === "" ? undefined : value} onPick={apply} />
    </div>
  );
}
