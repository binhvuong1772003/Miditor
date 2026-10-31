import { isFontStack, isTokenName, resolveColor, type Theme } from "@midito-kitchen/core";
import { type KeyboardEvent, useId, useState } from "react";
import styles from "./PropertiesPanel.module.css";

export interface ThemePanelProps {
  theme: Theme | undefined;
  /** A colour of the theme is added, or changes to this `#rrggbb`. */
  onSetColor: (name: string, color: string) => void;
  /** A colour of the theme is called something else; the blocks that use it follow. */
  onRenameColor: (from: string, to: string) => void;
  /** A colour of the theme is gone; the blocks that used it keep the colour they showed. */
  onDeleteColor: (name: string) => void;
  /** The body or heading font stack changes, or is taken away with `undefined`. */
  onSetFont: (which: "body" | "heading", stack: string | undefined) => void;
}

/** The colours and fonts shared by the whole page, shown when no block is selected. */
export function ThemePanel({
  theme,
  onSetColor,
  onRenameColor,
  onDeleteColor,
  onSetFont,
}: ThemePanelProps) {
  const colors = Object.entries(theme?.colors ?? {});
  return (
    <div className={styles.content}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Page theme</h2>
        <p className={styles.meta}>Whole page</p>
      </div>
      <h3 className={styles.section}>Colours</h3>
      {colors.map(([name, color]) => (
        <ColorRow
          key={name}
          name={name}
          color={resolveColor(color) ?? "#000000"}
          taken={Object.keys(theme?.colors ?? {})}
          onSetColor={onSetColor}
          onRename={onRenameColor}
          onDelete={onDeleteColor}
        />
      ))}
      <AddColor
        taken={colors.map(([name]) => name)}
        onAdd={(name) => onSetColor(name, "#3b82f6")}
      />
      <h3 className={styles.section}>Fonts</h3>
      {(["body", "heading"] as const).map((which) => (
        <FontField
          key={`${which}:${theme?.fonts?.[which] ?? ""}`}
          label={which === "body" ? "Body font" : "Heading font"}
          stored={theme?.fonts?.[which]}
          onChange={(stack) => onSetFont(which, stack)}
        />
      ))}
      <p className={styles.hint}>
        A font has to be loaded by the page that holds the editor (Google Fonts, @font-face): this
        only names it. Changes here apply to the whole page.
      </p>
    </div>
  );
}

interface ColorRowProps {
  name: string;
  color: string;
  taken: readonly string[];
  onSetColor: ThemePanelProps["onSetColor"];
  onRename: ThemePanelProps["onRenameColor"];
  onDelete: ThemePanelProps["onDeleteColor"];
}

function ColorRow({ name, color, taken, onSetColor, onRename, onDelete }: ColorRowProps) {
  const id = useId();
  const [text, setText] = useState(name);
  const rename = () => {
    const next = text.trim();
    if (next === name) return;
    // A name that is not good, or is taken by another colour, goes back to the old one.
    if (!isTokenName(next) || taken.includes(next)) setText(name);
    else onRename(name, next);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") rename();
    if (event.key === "Escape") setText(name);
  };
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {name}
      </label>
      <div className={styles.row}>
        <input
          type="color"
          className={styles.swatch}
          aria-label={`${name} colour`}
          value={color}
          onChange={(event) => onSetColor(name, event.target.value)}
        />
        <input
          id={id}
          type="text"
          className={styles.input}
          value={text}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          onBlur={rename}
          onKeyDown={keys}
        />
        <button type="button" className={styles.reset} onClick={() => onDelete(name)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function AddColor({ taken, onAdd }: { taken: readonly string[]; onAdd: (name: string) => void }) {
  // The first name `color-1`, `color-2`... that the theme does not have.
  const free = () => {
    let n = 1;
    while (taken.includes(`color-${n}`)) n++;
    return `color-${n}`;
  };
  return (
    <button
      type="button"
      className={styles.reset}
      disabled={taken.length >= 32}
      onClick={() => onAdd(free())}
    >
      Add a colour
    </button>
  );
}

function FontField({
  label,
  stored,
  onChange,
}: {
  label: string;
  stored: string | undefined;
  onChange: (stack: string | undefined) => void;
}) {
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState(stored ?? "");
  const [invalid, setInvalid] = useState(false);
  const apply = () => {
    const next = text.trim();
    if (next === (stored ?? "")) {
      setInvalid(false);
      return;
    }
    if (next === "") {
      setInvalid(false);
      onChange(undefined);
    } else if (isFontStack(next)) {
      setInvalid(false);
      onChange(next);
    } else {
      setInvalid(true);
    }
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") apply();
    if (event.key === "Escape") {
      setText(stored ?? "");
      setInvalid(false);
    }
  };
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={`${styles.input} ${styles.mono}`}
        value={text}
        placeholder="Inter, sans-serif"
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={apply}
        onKeyDown={keys}
      />
      {invalid && (
        <p id={errorId} className={styles.error} role="alert">
          Letters, digits, spaces, commas, ' and - only.
        </p>
      )}
    </div>
  );
}
