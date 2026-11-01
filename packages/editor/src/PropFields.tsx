import {
  type ComponentDef,
  type Field,
  isPayload,
  type JsonValue,
  MAX_PAYLOAD_TEXT,
  type Payload,
  type Theme,
  validateProps,
} from "@midito-kitchen/core";
import { type CSSProperties, type KeyboardEvent, useEffect, useState } from "react";
import type { ActionDef, ActionParam } from "./actions";
import { ColourPopover } from "./ColourPopover";
import { FontSelect } from "./FontSelect";
import { type FontDef, listedFont } from "./fonts";
import { useT } from "./i18n/context";
import { Icon, type IconName } from "./icons";
import styles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

export interface PropFieldsProps {
  def: ComponentDef;
  /** The props stored on the selected node. A prop that is not there shows its default. */
  props: Record<string, JsonValue>;
  /** A new, valid value for one prop. Not called for a value the field refuses. */
  onChange: (name: string, value: JsonValue) => void;
  /** The theme of the page, for a colour field to offer its colours. */
  theme?: Theme | undefined;
  /** What a button can do. Without any, the fields for an action are not shown. */
  actions?: readonly ActionDef[] | undefined;
  /** The fonts the host lets people choose, for a font field. */
  fonts?: readonly FontDef[] | undefined;
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
  field.type === "action" ||
  field.type === "font" ||
  field.type === "payload" ||
  (field.type === "select" && field.options.length === 3 && !isAlign(name, field));

/**
 * The fields a kind declares, by section: the ones with no `group` first, then each group in the
 * order it first appears. Within a section small fields sit two to a row and wide ones take a row.
 * A picture has no field here: it is added and changed on the canvas.
 */
export function PropFields({ def, props, onChange, theme, actions, fonts }: PropFieldsProps) {
  const t = useT();
  const sections = new Map<string, { name: string; field: Field }[]>();
  for (const [name, field] of Object.entries(def.fields)) {
    if (field.type === "image") continue;
    if ((field.type === "action" || field.type === "payload") && !actions?.length) continue;
    const section = field.group ?? DEFAULT_SECTION;
    sections.set(section, [...(sections.get(section) ?? []), { name, field }]);
  }
  // The section of fields with no group comes first, whatever the order of the registry.
  const ordered = [...sections.entries()].sort(
    ([a], [b]) => Number(b === DEFAULT_SECTION) - Number(a === DEFAULT_SECTION),
  );
  return ordered.map(([section, fields]) => (
    <Section key={section} id={`fields.${section}`} title={t.or(`group.${section}`, section)}>
      <div className={styles.grid2}>
        {cellsOf(fields).map((cell) => {
          if (cell.kind === "switches") {
            return (
              <div
                key={cell.items.map(({ name }) => `${name}:${storedOf(def, props, name)}`).join()}
              >
                <SwitchGroup def={def} items={cell.items} props={props} onChange={onChange} />
              </div>
            );
          }
          const { name, field } = cell;
          const stored = storedOf(def, props, name);
          // A new key when the stored value changes (undo, redo), so the typed text starts again from it.
          // The details keep theirs: each value there follows the stored one itself, so focus stays while typing.
          return (
            <div
              key={field.type === "payload" ? name : `${name}:${JSON.stringify(stored)}`}
              className={`${styles.stack} ${wide(name, field) ? styles.span2 : ""}`}
            >
              <PropField
                def={def}
                name={name}
                field={field}
                stored={stored}
                onChange={onChange}
                theme={theme}
                actions={actions}
                fonts={fonts}
                action={storedOf(def, props, "action")}
              />
            </div>
          );
        })}
      </div>
    </Section>
  ));
}

type Named = { name: string; field: Field };

/** A field of a section, or a run of yes-or-no fields that sit together as one row of switches. */
type Cell = ({ kind: "field" } & Named) | { kind: "switches"; items: Named[] };

/** Two or more yes-or-no fields in a row become one group of switches; a lone one stays a chip. */
function cellsOf(fields: Named[]): Cell[] {
  const cells: Cell[] = [];
  let run: Named[] = [];
  const flush = () => {
    if (run.length >= 2) cells.push({ kind: "switches", items: run });
    else for (const item of run) cells.push({ kind: "field", ...item });
    run = [];
  };
  for (const item of fields) {
    if (item.field.type === "boolean") run.push(item);
    else {
      flush();
      cells.push({ kind: "field", ...item });
    }
  }
  flush();
  return cells;
}

const storedOf = (def: ComponentDef, props: Record<string, JsonValue>, name: string) =>
  Object.hasOwn(props, name) ? props[name] : def.defaultProps[name];

/** How a switch looks: the letter of a text style is drawn in that style. */
const SWITCH_LOOK: Record<string, { letter: string; style: CSSProperties }> = {
  bold: { letter: "B", style: { fontWeight: 700 } },
  italic: { letter: "I", style: { fontStyle: "italic" } },
  underline: { letter: "U", style: { textDecoration: "underline" } },
};

/** Yes-or-no fields side by side in one box, each a button that stays pressed. */
function SwitchGroup({
  def,
  items,
  props,
  onChange,
}: {
  def: ComponentDef;
  items: Named[];
  props: Record<string, JsonValue>;
  onChange: PropFieldsProps["onChange"];
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
    <div
      role="group"
      aria-label={items.map(({ field }) => field.label).join(", ")}
      className={styles.seg}
    >
      {items.map(({ name, field }) => {
        const stored = storedOf(def, props, name);
        const look = SWITCH_LOOK[name];
        return (
          <button
            key={name}
            type="button"
            className={styles.segButton}
            aria-pressed={stored === true}
            aria-label={field.label}
            title={field.help ?? field.label}
            onClick={() => {
              const next = stored !== true;
              if (validateProps(def, { [name]: next }).length === 0) onChange(name, next);
            }}
          >
            <span style={look?.style}>{look?.letter ?? field.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface PropFieldProps {
  def: ComponentDef;
  name: string;
  field: Field;
  stored: JsonValue | undefined;
  onChange: PropFieldsProps["onChange"];
  theme: Theme | undefined;
  actions: readonly ActionDef[] | undefined;
  fonts: readonly FontDef[] | undefined;
  /** The action chosen on the same block, which decides what the payload asks for. */
  action: JsonValue | undefined;
}

function PropField({
  def,
  name,
  field,
  stored,
  onChange,
  theme,
  actions,
  fonts,
  action,
}: PropFieldProps) {
  const t = useT();
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

  if (field.type === "font") {
    return (
      <FontSelect
        label={field.label}
        value={listedFont(stored)}
        fonts={fonts ?? []}
        emptyLabel={t("font.pageFont")}
        onChange={(stack) => apply(stack)}
      />
    );
  }

  if (field.type === "action") {
    const current = typeof stored === "string" ? stored : "";
    return (
      <label className={styles.box} title={field.help}>
        <span className={styles.tag}>{field.label}</span>
        <select
          value={current}
          onChange={(event) => {
            apply(event.target.value);
            // The details of one action mean nothing to another.
            if (isPayload(def.defaultProps.payload)) onChange("payload", {});
          }}
        >
          <option value="">{t("action.none")}</option>
          {actions?.map((item) => (
            <option key={item.name} value={item.name}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "payload") {
    const params = actions?.find((item) => item.name === action)?.params ?? [];
    const values: Payload = isPayload(stored) ? stored : {};
    return (
      <>
        {params.map((param) => (
          <PayloadParam
            key={param.name}
            param={param}
            value={values[param.name]}
            onChange={(next) => {
              const { [param.name]: _gone, ...rest } = values;
              onChange("payload", next === undefined ? rest : { ...rest, [param.name]: next });
            }}
          />
        ))}
      </>
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
                aria-label={
                  icon ? `${field.label}: ${t.or(`option.${option}`, nice(option))}` : undefined
                }
                title={
                  icon ? `${field.label}: ${t.or(`option.${option}`, nice(option))}` : undefined
                }
                onClick={() => apply(option)}
              >
                {icon ? <Icon name={icon} /> : t.or(`option.${option}`, nice(option))}
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
              {t.or(`option.${option}`, nice(option))}
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

/** A colour: a box that opens the picker with the colours of the theme to choose from. */
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
  const value = typeof stored === "string" && stored !== "" ? stored : undefined;
  return (
    <div className={styles.row}>
      <ColourPopover
        label={label}
        hint={help}
        theme={theme}
        stored={value}
        onCommit={(next) => {
          if (next !== undefined) apply(next);
        }}
      />
    </div>
  );
}

/** One value that the chosen action asks for: text, a number or a yes or no. An empty one is left out. */
function PayloadParam({
  param,
  value,
  onChange,
}: {
  param: ActionParam;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean | undefined) => void;
}) {
  const shown = value === undefined ? "" : String(value);
  const [text, setText] = useState(shown);
  // Undo, redo and a new action change the stored value from outside: the typed text starts again from it.
  useEffect(() => setText(shown), [shown]);
  if (param.type === "boolean") {
    return (
      <button
        type="button"
        className={styles.chip}
        aria-pressed={value === true}
        onClick={() => onChange(value === true ? undefined : true)}
      >
        {param.label}
      </button>
    );
  }
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") return onChange(undefined);
    if (param.type === "number") {
      const number = Number(trimmed);
      return Number.isFinite(number)
        ? onChange(number)
        : setText(value === undefined ? "" : String(value));
    }
    onChange(trimmed.slice(0, MAX_PAYLOAD_TEXT));
  };
  return (
    <label className={styles.box}>
      <span className={styles.tag}>{param.label}</span>
      <input
        type={param.type === "number" ? "number" : "text"}
        value={text}
        maxLength={MAX_PAYLOAD_TEXT}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </label>
  );
}
