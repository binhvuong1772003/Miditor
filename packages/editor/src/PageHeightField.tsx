import { clampPageHeight, MAX_PAGE_HEIGHT, MIN_PAGE_HEIGHT } from "@miditor/core";
import { type KeyboardEvent, useEffect, useState } from "react";
import { useT } from "./i18n/context";
import styles from "./PropertiesPanel.module.css";

export interface PageHeightFieldProps {
  /** The height that was set, or `undefined` when the page has none. */
  stored: number | undefined;
  /** How tall the page is as it is drawn now, which is what the field shows when nothing was set. */
  drawn: number;
  /** The bottom of the lowest block: the page cannot be made shorter than it. */
  floor: number;
  onChange: (height: number | undefined) => void;
}

/**
 * The height of the page in px, typed. It is kept between the shortest and the tallest page, and no
 * shorter than the lowest block, so a block is never cut off. "Auto" takes the height back, to what
 * the page is when nobody has set one.
 */
export function PageHeightField({ stored, drawn, floor, onChange }: PageHeightFieldProps) {
  const t = useT();
  const shown = String(stored ?? Math.round(drawn));
  const [text, setText] = useState(shown);
  // Undo and a drag of the edge change the height from outside: the typed text starts again from it.
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const next = clampPageHeight(Number(text), floor);
    if (text.trim() === "" || next === undefined) return setText(shown);
    setText(String(next));
    if (next !== stored) onChange(next);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") setText(shown);
  };
  return (
    <div className={styles.grid2}>
      <label
        className={`${styles.box} ${styles.span2}`}
        title={t("height.hint", { min: MIN_PAGE_HEIGHT, max: MAX_PAGE_HEIGHT })}
      >
        <span className={styles.tag}>{t("height.label")}</span>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_PAGE_HEIGHT}
          max={MAX_PAGE_HEIGHT}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={keys}
        />
        <span className={styles.suffix} aria-hidden="true">
          px
        </span>
      </label>
      <button
        type="button"
        className={styles.chip}
        disabled={stored === undefined}
        title={t("height.autoTitle")}
        onClick={() => onChange(undefined)}
      >
        {t("height.auto")}
      </button>
    </div>
  );
}
