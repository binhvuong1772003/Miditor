import {
  colorRef,
  nameOfColorRef,
  parseHexColor,
  resolveColor,
  type Theme,
} from "@midito-kitchen/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./ColourPopover.module.css";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { rememberColour, useRecentColours } from "./recent-colours";

export interface ColourPopoverProps {
  label: string;
  hint?: string | undefined;
  theme: Theme | undefined;
  /** The colour stored on the block: `#rrggbb`, a reference such as `@primary`, or nothing. */
  stored: string | undefined;
  /** Name of the way to leave the colour out ("No fill"); nothing means the colour is required. */
  noneLabel?: string | undefined;
  /** A new stored colour, or `undefined` to take the colour away. */
  onCommit: (value: string | undefined) => void;
}

const WIDTH = 260;
const GAP = 6;
const MARGIN = 8;

/**
 * A colour as a box that opens a small popover: the colours of the page theme, the ones used
 * lately, a free pick, and a way to leave the colour out. It is drawn fixed under the box, so the
 * scrolling panel does not clip it, and it closes when the panel scrolls.
 */
export function ColourPopover({
  label,
  hint,
  theme,
  stored,
  noneLabel,
  onCommit,
}: ColourPopoverProps) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const native = useRef<HTMLInputElement>(null);
  const recent = useRecentColours();
  const current = resolveColor(stored, theme);
  const currentRef = nameOfColorRef(stored);
  const names = Object.keys(theme?.colors ?? {});
  // "Colour" and "Text colour" already say what they are; "Fill" and "Border" need the word.
  const title = /colou?r/i.test(label) ? label : `${label} colour`;

  const latest = useRef(onCommit);
  latest.current = onCommit;

  // The popover goes under the box, with its right edge on the box's; above it when there is no room.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      return;
    }
    const box = root.current?.getBoundingClientRect();
    const height = pop.current?.offsetHeight ?? 0;
    if (!box) return;
    const left = Math.max(MARGIN, Math.min(box.right - WIDTH, window.innerWidth - WIDTH - MARGIN));
    const below = box.bottom + GAP;
    const top =
      below + height > window.innerHeight - MARGIN
        ? Math.max(MARGIN, box.top - GAP - height)
        : below;
    setPlace({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !pop.current?.contains(target)) close();
    };
    const keys = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", keys, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", keys, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // The native picker fires on every move; only its own `change` says the pick is done.
  useEffect(() => {
    const element = native.current;
    if (!element) return;
    const done = () => {
      const hex = parseHexColor(element.value);
      if (hex === undefined) return;
      rememberColour(hex);
      latest.current(hex);
    };
    element.addEventListener("change", done);
    return () => element.removeEventListener("change", done);
  }, []);

  const openNative = () => {
    const element = native.current;
    if (!element) return;
    element.value = current ?? "#000000";
    element.click();
  };

  const pickHex = (hex: string) => {
    rememberColour(hex);
    onCommit(hex);
  };

  return (
    <div ref={root} className={`${fieldStyles.box} ${styles.field}`} title={hint}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={`${styles.swatch} ${current === undefined ? styles.empty : ""}`}
          style={current !== undefined ? { background: current } : undefined}
        />
        <span className={fieldStyles.tag}>{label}</span>
      </button>
      {noneLabel !== undefined && stored !== undefined && (
        <button
          type="button"
          className={fieldStyles.clear}
          aria-label={`Clear ${label.toLowerCase()}`}
          title={noneLabel}
          onClick={() => onCommit(undefined)}
        >
          <Icon name="x" size={14} />
        </button>
      )}
      <input
        ref={native}
        type="color"
        className={styles.native}
        tabIndex={-1}
        aria-hidden="true"
        defaultValue="#000000"
      />
      {open && (
        <div
          ref={pop}
          role="dialog"
          aria-label={title}
          className={styles.pop}
          style={
            place ? { top: place.top, left: place.left } : { top: 0, left: 0, visibility: "hidden" }
          }
        >
          <div className={styles.head}>
            <span>{label}</span>
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
          {names.length > 0 && (
            <div>
              <p className={styles.section}>Theme</p>
              <div className={styles.dots}>
                {names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={styles.dot}
                    aria-label={name}
                    aria-pressed={currentRef === name}
                    title={name}
                    style={{ background: resolveColor(colorRef(name), theme) }}
                    onClick={() => onCommit(colorRef(name))}
                  />
                ))}
              </div>
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <p className={styles.section}>Recent</p>
              <div className={styles.dots}>
                {recent.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={styles.dot}
                    aria-label={hex}
                    aria-pressed={currentRef === undefined && current?.toLowerCase() === hex}
                    title={hex}
                    style={{ background: hex }}
                    onClick={() => pickHex(hex)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className={styles.foot}>
            <button type="button" className={styles.action} onClick={openNative}>
              <span className={styles.wheel} />
              Custom colour
            </button>
            {noneLabel !== undefined && (
              <button type="button" className={styles.action} onClick={() => onCommit(undefined)}>
                <Icon name="x" size={14} />
                {noneLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
