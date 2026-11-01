import { isTokenName, resolveColor, type Theme } from "@midito-kitchen/core";
import { type KeyboardEvent, useState } from "react";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import styles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

export interface ThemePanelProps {
  theme: Theme | undefined;
  /** A colour of the theme is added, or changes to this `#rrggbb`. */
  onSetColor: (name: string, color: string) => void;
  /** A colour of the theme is called something else; the blocks that use it follow. */
  onRenameColor: (from: string, to: string) => void;
  /** A colour of the theme is gone; the blocks that used it keep the colour they showed. */
  onDeleteColor: (name: string) => void;
  /** Only the sections, with no heading of their own, to sit inside another panel. */
  bare?: boolean;
}

/** The colours shared by the whole page, shown with the rest of its settings when no block is selected. */
export function ThemePanel({
  theme,
  onSetColor,
  onRenameColor,
  onDeleteColor,
  bare = false,
}: ThemePanelProps) {
  const t = useT();
  const colors = Object.entries(theme?.colors ?? {});
  return (
    <div className={styles.content}>
      {!bare && (
        <div className={styles.heading}>
          <h2 className={styles.title}>{t("pageTheme.title")}</h2>
          <p className={styles.meta}>{t("pageTheme.whole")}</p>
        </div>
      )}
      <Section
        id="theme.colours"
        title={t("colours.title")}
        actions={
          <AddColor
            taken={colors.map(([name]) => name)}
            onAdd={(name) => onSetColor(name, "#3b82f6")}
          />
        }
      >
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
        {colors.length === 0 && <p className={styles.hint}>No colours yet. Add one with +.</p>}
      </Section>
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
  const t = useT();
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
    <div className={styles.row}>
      <input
        type="color"
        className={styles.swatch}
        aria-label={t("colours.swatch", { name })}
        value={color}
        onChange={(event) => onSetColor(name, event.target.value)}
      />
      <label className={styles.box}>
        <input
          type="text"
          aria-label={t("colours.name", { name })}
          value={text}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          onBlur={rename}
          onKeyDown={keys}
        />
      </label>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={t("colours.delete", { name })}
        title={t("colours.deleteTitle")}
        onClick={() => onDelete(name)}
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}

function AddColor({ taken, onAdd }: { taken: readonly string[]; onAdd: (name: string) => void }) {
  const t = useT();
  // The first name `color-1`, `color-2`... that the theme does not have.
  const free = () => {
    let n = 1;
    while (taken.includes(`color-${n}`)) n++;
    return `color-${n}`;
  };
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={t("colours.add")}
      title={t("colours.add")}
      disabled={taken.length >= 32}
      onClick={() => onAdd(free())}
    >
      <Icon name="plus" />
    </button>
  );
}
