import {
  isSameTheme,
  isThemeName,
  MAX_SAVED_THEMES,
  MAX_THEME_NAME,
  type SavedTheme,
  type Theme,
} from "@midito-kitchen/core";
import { type KeyboardEvent, useState } from "react";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";
import styles from "./ThemesPanel.module.css";

export interface ThemesPanelProps {
  /** The theme the page has now, to say which of the lists is the one in use. */
  current: Theme | undefined;
  /** The themes a person kept on this page. */
  saved: readonly SavedTheme[];
  /** The themes the host suggests. */
  suggested: readonly SavedTheme[];
  onApply: (theme: SavedTheme) => void;
  /** Keep the theme the page has now, under this name. */
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

/**
 * The themes to put on the page: the ones a person kept, and the ones the host suggests to start
 * from. A theme is a few colours and a font; pressing one puts it on the whole page. A person makes
 * their own by changing the colours and the font in the page's settings and keeping the result here.
 */
export function ThemesPanel({
  current,
  saved,
  suggested,
  onApply,
  onSave,
  onRename,
  onDelete,
}: ThemesPanelProps) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const full = saved.length >= MAX_SAVED_THEMES;
  const begin = () => {
    setName(`Theme ${saved.length + 1}`);
    setNaming(true);
  };
  const save = () => {
    const next = name.trim();
    if (isThemeName(next)) {
      onSave(next);
      setNaming(false);
    }
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") setNaming(false);
  };
  return (
    <div>
      <Section
        title="Your themes"
        help="The colours and the font of the page, kept so you can put them back."
      >
        {naming ? (
          <div className={fieldStyles.row}>
            <input
              className={styles.nameInput}
              aria-label="Name of the theme"
              value={name}
              maxLength={MAX_THEME_NAME}
              // biome-ignore lint/a11y/noAutofocus: the field opens because the person asked to name a theme
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={keys}
            />
            <button
              type="button"
              className={styles.action}
              disabled={!isThemeName(name.trim())}
              onClick={save}
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.action}
            disabled={full}
            title={full ? `A page keeps up to ${MAX_SAVED_THEMES} themes` : undefined}
            onClick={begin}
          >
            Save current theme
          </button>
        )}
        {saved.length === 0 && !naming && (
          <p className={fieldStyles.hint}>
            Change the colours and the font in the page's settings, then keep them here.
          </p>
        )}
        <ul className={styles.list}>
          {saved.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              active={isSameTheme(current, theme)}
              onApply={() => onApply(theme)}
              onRename={(next) => onRename(theme.id, next)}
              onDelete={() => onDelete(theme.id)}
            />
          ))}
        </ul>
      </Section>
      {suggested.length > 0 && (
        <Section
          title="Suggested"
          help="Themes to start from. Put one on the page, change it, keep it."
        >
          <ul className={styles.list}>
            {suggested.map((theme) => (
              <ThemeRow
                key={theme.id}
                theme={theme}
                active={isSameTheme(current, theme)}
                onApply={() => onApply(theme)}
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ThemeRow({
  theme,
  active,
  onApply,
  onRename,
  onDelete,
}: {
  theme: SavedTheme;
  active: boolean;
  onApply: () => void;
  /** Without these two the theme is the host's and cannot be changed here. */
  onRename?: (name: string) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(theme.name);
  const swatches = Object.values(theme.colors).slice(0, 4);
  const done = () => {
    const next = text.trim();
    setEditing(false);
    if (next !== theme.name && isThemeName(next)) onRename?.(next);
    else setText(theme.name);
  };
  return (
    <li className={styles.row} data-active={active}>
      {editing ? (
        <input
          className={styles.nameInput}
          aria-label={`Name of ${theme.name}`}
          value={text}
          maxLength={MAX_THEME_NAME}
          // biome-ignore lint/a11y/noAutofocus: the field opens because the person asked to rename
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setText(event.target.value)}
          onBlur={done}
          onKeyDown={(event) => {
            if (event.key === "Enter") done();
            if (event.key === "Escape") {
              setText(theme.name);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.apply}
          aria-pressed={active}
          title={active ? "The theme of the page" : `Put ${theme.name} on the page`}
          onClick={onApply}
        >
          <span className={styles.preview} aria-hidden="true">
            <span className={styles.aa} style={{ fontFamily: theme.font }}>
              Aa
            </span>
            {swatches.map((colour, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the swatches are a fixed look at the colours
              <span key={i} className={styles.swatch} style={{ background: colour }} />
            ))}
          </span>
          <span className={styles.name}>{theme.name}</span>
        </button>
      )}
      {onRename && !editing && (
        <button
          type="button"
          className={styles.icon}
          aria-label={`Rename ${theme.name}`}
          title="Rename"
          onClick={() => setEditing(true)}
        >
          <Icon name="pencil" />
        </button>
      )}
      {onDelete && !editing && (
        <button
          type="button"
          className={styles.icon}
          aria-label={`Delete ${theme.name}`}
          title="Delete"
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      )}
    </li>
  );
}
