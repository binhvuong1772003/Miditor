import { colorRef, nameOfColorRef, parseHexColor, resolveColor, type Theme } from "@miditor/core";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./ColourPopover.module.css";
import { parseColourText } from "./colour-text";
import { type Hsv, hexToHsv, hsvToHex } from "./hsv";
import { useT } from "./i18n/context";
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
  /** A colour shown while the free picker is dragged; it is not final until `onCommit`. */
  onPreview?: ((value: string) => void) | undefined;
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
  onPreview,
  onCommit,
}: ColourPopoverProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const t = useT();
  const pop = useRef<HTMLDivElement>(null);
  const recent = useRecentColours();
  const current = resolveColor(stored, theme);
  const currentRef = nameOfColorRef(stored);
  const names = Object.keys(theme?.colors ?? {});
  // "Colour" and "Text colour" already say what they are; "Fill" and "Border" need the word.
  const title = label.toLowerCase().includes(t("colour.word").toLowerCase())
    ? label
    : t("colour.titleOf", { label });

  // The popover goes under the box, with its right edge on the box's; above it when there is no room.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the free picker changes the height.
  useLayoutEffect(() => {
    if (!open) {
      setPlace(null);
      setCustom(false);
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
  }, [open, custom]);

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
          aria-label={t("colour.clear", { label })}
          title={noneLabel}
          onClick={() => onCommit(undefined)}
        >
          <Icon name="x" size={14} />
        </button>
      )}
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
              aria-label={t("colour.close")}
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
              <p className={styles.section}>{t("colour.theme")}</p>
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
              <p className={styles.section}>{t("colour.recent")}</p>
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
          {custom && (
            <FreePicker
              start={current ?? "#2563eb"}
              onPreview={(hex) => onPreview?.(hex)}
              onCommit={pickHex}
            />
          )}
          <div className={styles.foot}>
            <button
              type="button"
              className={styles.action}
              aria-expanded={custom}
              onClick={() => setCustom((value) => !value)}
            >
              <span className={styles.wheel} />
              {t("colour.custom")}
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

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface Dropper {
  open: () => Promise<{ sRGBHex: string }>;
}

const dropperOf = (): (new () => Dropper) | undefined =>
  (window as unknown as { EyeDropper?: new () => Dropper }).EyeDropper;

/** The colour as a code, to type or paste: `#2563eb`, `2563eb` or `rgb(37, 99, 235)`. */
function CodeInput({
  value,
  onValue,
  onDone,
}: {
  value: string;
  onValue: (hex: string) => void;
  onDone: () => void;
}) {
  const t = useT();
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const changed = useRef(false);

  // A drag of the square or a change of a number rewrites the code; what is typed is left alone.
  useEffect(() => {
    setText((typed) => (parseColourText(typed) === value ? typed : value));
    setInvalid(false);
  }, [value]);

  const finish = () => {
    setText(value);
    setInvalid(false);
    if (changed.current) onDone();
    changed.current = false;
  };

  return (
    <label className={styles.channel} data-invalid={invalid}>
      <span aria-hidden="true">#</span>
      <input
        aria-label={t("colour.code")}
        aria-invalid={invalid}
        spellCheck={false}
        autoComplete="off"
        placeholder="2563eb"
        value={text.replace(/^#/, "")}
        onChange={(event) => {
          setText(event.target.value);
          const hex = parseColourText(event.target.value);
          setInvalid(hex === undefined && event.target.value.trim() !== "");
          if (hex === undefined) return;
          changed.current = hex !== value;
          onValue(hex);
        }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish();
        }}
      />
    </label>
  );
}

const toRgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const fromRgb = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;

/** One of the red, green or blue numbers, from 0 to 255. It keeps its text while it is typed. */
function Channel({
  letter,
  name,
  value,
  onValue,
  onDone,
}: {
  letter: string;
  name: string;
  value: number;
  onValue: (value: number) => void;
  onDone: () => void;
}) {
  const [text, setText] = useState(String(value));
  const changed = useRef(false);

  // A drag of the square or the slider changes the number; typing keeps what was typed.
  useEffect(() => {
    setText((typed) => (typed !== "" && Number(typed) === value ? typed : String(value)));
  }, [value]);

  const finish = () => {
    setText(String(value));
    if (changed.current) onDone();
    changed.current = false;
  };

  return (
    <label className={styles.channel}>
      <span aria-hidden="true">{letter}</span>
      <input
        inputMode="numeric"
        aria-label={name}
        value={text}
        onChange={(event) => {
          const typed = event.target.value.replace(/\D/g, "").slice(0, 3);
          setText(typed);
          if (typed === "" || Number(typed) > 255) return;
          changed.current = true;
          onValue(Number(typed));
        }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish();
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          changed.current = true;
          onValue(Math.min(255, Math.max(0, value + (event.key === "ArrowUp" ? 1 : -1))));
        }}
      />
    </label>
  );
}

/**
 * A free pick: a square for saturation and brightness, a slider for the hue, and the screen
 * eyedropper where the browser has one. The colour is final when the pointer or key is released.
 */
function FreePicker({
  start,
  onPreview,
  onCommit,
}: {
  start: string;
  onPreview: (hex: string) => void;
  onCommit: (hex: string) => void;
}) {
  const t = useT();
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(start));
  const latest = useRef(hsv);
  const area = useRef<HTMLDivElement>(null);
  const Eyedropper = dropperOf();

  const move = (next: Hsv) => {
    latest.current = next;
    setHsv(next);
    onPreview(hsvToHex(next));
  };
  const done = () => onCommit(hsvToHex(latest.current));

  // A grey or a black has no hue of its own in its numbers, so the hue the person chose stays.
  const setChannel = (at: 0 | 1 | 2, value: number) => {
    const rgb = toRgb(hsvToHex(latest.current));
    rgb[at] = value;
    const next = hexToHsv(fromRgb(...rgb));
    move(next.s === 0 || next.v === 0 ? { ...next, h: latest.current.h } : next);
  };

  const fromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const box = area.current?.getBoundingClientRect();
    if (!box) return;
    move({
      ...latest.current,
      s: clamp((event.clientX - box.left) / box.width),
      v: 1 - clamp((event.clientY - box.top) / box.height),
    });
  };

  const nudge = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const { s, v } = latest.current;
    const next =
      event.key === "ArrowLeft"
        ? { s: clamp(s - step), v }
        : event.key === "ArrowRight"
          ? { s: clamp(s + step), v }
          : event.key === "ArrowUp"
            ? { s, v: clamp(v + step) }
            : event.key === "ArrowDown"
              ? { s, v: clamp(v - step) }
              : undefined;
    if (!next) return;
    event.preventDefault();
    move({ ...latest.current, ...next });
  };

  const current = hsvToHex(hsv);
  const rgb = toRgb(current);
  return (
    <div className={styles.free}>
      <div
        ref={area}
        role="slider"
        tabIndex={0}
        aria-label={t("colour.saturation")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={t("colour.saturationValue", {
          s: Math.round(hsv.s * 100),
          v: Math.round(hsv.v * 100),
        })}
        className={styles.area}
        style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) fromPointer(event);
        }}
        onPointerUp={done}
        onKeyDown={nudge}
        onKeyUp={(event) => {
          if (event.key.startsWith("Arrow")) done();
        }}
      >
        <span
          className={styles.knob}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: current }}
        />
      </div>
      <div className={styles.hueRow}>
        <input
          type="range"
          className={styles.hue}
          aria-label={t("colour.hue")}
          min={0}
          max={359}
          value={Math.round(hsv.h)}
          onChange={(event) => move({ ...latest.current, h: Number(event.target.value) })}
          onPointerUp={done}
          onKeyUp={done}
        />
        {Eyedropper && (
          <button
            type="button"
            className={styles.eyedropper}
            aria-label={t("colour.pick")}
            title={t("colour.pick")}
            onClick={() => {
              new Eyedropper()
                .open()
                .then(({ sRGBHex }) => {
                  const hex = parseHexColor(sRGBHex);
                  if (hex === undefined) return;
                  const next = hexToHsv(hex);
                  latest.current = next;
                  setHsv(next);
                  onCommit(hex);
                })
                .catch(() => {});
            }}
          >
            <Icon name="pipette" size={16} />
          </button>
        )}
      </div>
      <CodeInput value={current} onValue={(hex) => move(hexToHsv(hex))} onDone={done} />
      <div className={styles.channels}>
        {(
          [
            ["R", t("colour.red")],
            ["G", t("colour.green")],
            ["B", t("colour.blue")],
          ] as const
        ).map(([letter, name], at) => (
          <Channel
            key={letter}
            letter={letter}
            name={name}
            value={rgb[at] ?? 0}
            onValue={(value) => setChannel(at as 0 | 1 | 2, value)}
            onDone={done}
          />
        ))}
      </div>
    </div>
  );
}
