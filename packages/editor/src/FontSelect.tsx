import { type FontDef, fontName } from "./fonts";
import styles from "./PropertiesPanel.module.css";

export interface FontSelectProps {
  label: string;
  /** The stored font stack, or an empty string for the font of the page. */
  value: string;
  /** The fonts the host lets people choose. */
  fonts: readonly FontDef[];
  /** What the empty choice is called, such as `Page font`. */
  emptyLabel: string;
  /** A font stack chosen, or an empty string for the empty choice. */
  onChange: (stack: string) => void;
}

/**
 * A font chosen from a list the host gives, each name set in its own font where the browser allows
 * it. Nothing is typed, so no font stack that the page cannot store can get in. A font that was stored
 * and is no longer in the list stays in it, so what is on the page is never hidden by a change of list.
 */
export function FontSelect({ label, value, fonts, emptyLabel, onChange }: FontSelectProps) {
  const listed = value === "" || fonts.some((font) => font.stack === value);
  const groups = [...new Set(fonts.map((font) => font.group ?? ""))];
  return (
    <label
      className={styles.box}
      title={`${label}: ${value === "" ? emptyLabel : fontName(value, fonts)}`}
    >
      <span className={styles.tag}>{label}</span>
      <select
        value={value}
        style={{ fontFamily: value || undefined }}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {!listed && (
          <option value={value} style={{ fontFamily: value }}>
            {fontName(value, fonts)}
          </option>
        )}
        {groups.map((group) => {
          const inGroup = fonts.filter((font) => (font.group ?? "") === group);
          const options = inGroup.map((font) => (
            <option key={font.stack} value={font.stack} style={{ fontFamily: font.stack }}>
              {font.name}
            </option>
          ));
          return group === "" ? (
            options
          ) : (
            <optgroup key={group} label={group}>
              {options}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}
