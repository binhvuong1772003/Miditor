import {
  isSameTheme,
  isThemeName,
  MAX_THEME_NAME,
  type SavedTheme,
  type Theme,
} from "@midito-kitchen/core";
import { type KeyboardEvent, useState } from "react";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { useRenders } from "./perf";
import { Section } from "./Section";
import styles from "./ThemesPanel.module.css";

/** A theme of the host. One marked `readonly` is a suggestion: it can be put on the page, nothing more. */
export type HostTheme = SavedTheme & { readonly?: boolean };

export interface ThemesPanelProps {
  /** The theme the page has now, to say which of the lists is the one in use. */
  current: Theme | undefined;
  /** The host's themes: the ones a person kept and the ones the host suggests. */
  themes: readonly HostTheme[];
  onApply: (theme: SavedTheme) => void;
  /** Keep the theme the page has now, under this name. Without it there is no Save button. */
  onSave?: ((name: string) => void | Promise<void>) | undefined;
  /** Without these two a theme cannot be renamed or deleted here. */
  onRename?: ((id: string, name: string) => void | Promise<void>) | undefined;
  onDelete?: ((id: string) => void | Promise<void>) | undefined;
}

/**
 * The themes to put on the page: the ones a person kept, and the ones the host suggests to start
 * from. A theme is a few colours and a font; pressing one puts it on the whole page. A person makes
 * their own by changing the colours and the font in the page's settings and keeping the result here.
 * The host keeps the themes: the panel asks it to save, rename or delete one and shows what it gets
 * back in `themes`. When the host says no, the panel says so and changes nothing.
 */
export function ThemesPanel({
  current,
  themes,
  onApply,
  onSave,
  onRename,
  onDelete,
}: ThemesPanelProps) {
  useRenders("themes");
  const t = useT();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const saved = themes.filter((theme) => !theme.readonly);
  const suggested = themes.filter((theme) => theme.readonly);
  /** Ask the host to do something; stay put and say so if it refuses. */
  const ask = async (job: () => void | Promise<void>): Promise<boolean> => {
    setBusy(true);
    setFailed(false);
    try {
      await job();
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const begin = () => {
    setName(t("themes.defaultName", { n: saved.length + 1 }));
    setNaming(true);
  };
  const save = async () => {
    const next = name.trim();
    if (onSave && isThemeName(next) && (await ask(() => onSave(next)))) setNaming(false);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") setNaming(false);
  };
  return (
    <div>
      {(onSave || saved.length > 0) && (
        <Section id="themes.yours" title={t("themes.yours")} help={t("themes.yoursHelp")}>
          {onSave && naming ? (
            <div className={fieldStyles.row}>
              <input
                className={styles.nameInput}
                aria-label={t("themes.nameLabel")}
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
                disabled={busy || !isThemeName(name.trim())}
                onClick={save}
              >
                {t("themes.save")}
              </button>
            </div>
          ) : (
            onSave && (
              <button type="button" className={styles.action} onClick={begin}>
                {t("themes.saveCurrent")}
              </button>
            )
          )}
          {failed && (
            <p className={fieldStyles.hint} role="alert">
              {t("themes.failed")}
            </p>
          )}
          {onSave && saved.length === 0 && !naming && (
            <p className={fieldStyles.hint}>{t("themes.hint")}</p>
          )}
          <ul className={styles.list}>
            {saved.map((theme) => (
              <ThemeRow
                key={theme.id}
                theme={theme}
                active={isSameTheme(current, theme)}
                onApply={() => onApply(theme)}
                busy={busy}
                onRename={onRename && ((next) => ask(() => onRename(theme.id, next)))}
                onDelete={onDelete && (() => ask(() => onDelete(theme.id)))}
              />
            ))}
          </ul>
        </Section>
      )}
      {suggested.length > 0 && (
        <Section
          id="themes.suggested"
          title={t("themes.suggested")}
          help={t("themes.suggestedHelp")}
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
  busy = false,
  onApply,
  onRename,
  onDelete,
}: {
  theme: SavedTheme;
  active: boolean;
  /** The host is still answering: the buttons wait. */
  busy?: boolean;
  onApply: () => void;
  /** Without these two the theme cannot be changed here. */
  onRename?: ((name: string) => Promise<boolean>) | undefined;
  onDelete?: (() => Promise<boolean>) | undefined;
}) {
  const t = useT();
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
          aria-label={t("themes.nameOf", { name: theme.name })}
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
          title={active ? t("themes.current") : t("themes.put", { name: theme.name })}
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
          aria-label={t("themes.renameNamed", { name: theme.name })}
          title={t("themes.rename")}
          disabled={busy}
          onClick={() => setEditing(true)}
        >
          <Icon name="pencil" />
        </button>
      )}
      {onDelete && !editing && (
        <button
          type="button"
          className={styles.icon}
          aria-label={t("themes.deleteNamed", { name: theme.name })}
          title={t("themes.delete")}
          disabled={busy}
          onClick={onDelete}
        >
          <Icon name="trash" />
        </button>
      )}
    </li>
  );
}
