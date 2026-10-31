import { colorRef, nameOfColorRef, resolveColor, type Theme } from "@midito-kitchen/core";
import styles from "./PropertiesPanel.module.css";

export interface ThemePickerProps {
  theme: Theme | undefined;
  /** The colour stored on the block: `#rrggbb`, a reference such as `@primary`, or nothing. */
  stored: string | undefined;
  /** A new stored colour: `@name` for a theme colour, or the `#rrggbb` that the block had. */
  onPick: (value: string) => void;
}

/**
 * A choice between a colour of the page's theme and a colour of the block's own. Nothing is drawn
 * when the theme has no colours. Choosing "Custom" keeps the colour the block shows now.
 */
export function ThemePicker({ theme, stored, onPick }: ThemePickerProps) {
  const names = Object.keys(theme?.colors ?? {});
  if (names.length === 0) return null;
  const current = nameOfColorRef(stored);
  return (
    <label className={`${styles.box} ${styles.pick}`}>
      <select
        aria-label="Theme colour"
        title="Use a colour of the page theme"
        value={current ?? ""}
        onChange={(event) => {
          const name = event.target.value;
          if (name !== "") onPick(colorRef(name));
          else onPick(resolveColor(stored, theme) ?? "#000000");
        }}
      >
        <option value="">Custom</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
