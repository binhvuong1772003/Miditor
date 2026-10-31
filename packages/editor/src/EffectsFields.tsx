import {
  DEFAULT_DURATION,
  DEFAULT_EASING,
  EASINGS,
  ENTER_EFFECTS,
  ENTER_TRIGGERS,
  type Enter,
  HOVER_EFFECTS,
  isEasing,
  isEnterEffect,
  isHoverEffect,
  MAX_DELAY,
  MAX_DURATION,
  MAX_STAGGER,
  MIN_DURATION,
  type NodeEffects,
} from "@midito-kitchen/core";
import { type KeyboardEvent, useState } from "react";
import styles from "./PropertiesPanel.module.css";

export interface EffectsFieldsProps {
  effects: NodeEffects | undefined;
  /** Whether the block can hold other blocks, which is when a stagger means something. */
  holdsBlocks: boolean;
  /** The new motion, or `undefined` when none is left. */
  onChange: (effects: NodeEffects | undefined) => void;
  /** Play the entrances of the page once on the canvas. */
  onPlay: () => void;
}

const nice = (word: string) => ((word[0]?.toUpperCase() ?? "") + word.slice(1)).replace("-", " ");

/** `effects` without a key; an empty result is no motion at all. */
const without = (effects: NodeEffects, key: keyof NodeEffects): NodeEffects | undefined => {
  const { [key]: _removed, ...rest } = effects;
  return Object.keys(rest).length === 0 ? undefined : rest;
};

/**
 * The motion of a block: what a hover does, a press, how it comes into view and, for a block that
 * holds others, how far apart theirs are. Every choice is a name from a short list; a number is
 * pulled into its range, so nothing a person types can be stored out of it.
 */
export function EffectsFields({ effects = {}, holdsBlocks, onChange, onPlay }: EffectsFieldsProps) {
  const { hover, press, enter, stagger } = effects;
  const setEnter = (next: Enter | undefined) =>
    onChange(next ? { ...effects, enter: next } : without(effects, "enter"));
  return (
    <div className={styles.grid2}>
      <div className={styles.span2}>
        <label className={styles.box} title="What the block does when the pointer is over it.">
          <span className={styles.tag}>Hover</span>
          <select
            value={hover ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onChange(
                isHoverEffect(value) ? { ...effects, hover: value } : without(effects, "hover"),
              );
            }}
          >
            <option value="">None</option>
            {HOVER_EFFECTS.map((name) => (
              <option key={name} value={name}>
                {nice(name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className={styles.chip}
        aria-pressed={press === true}
        title="The block shrinks a little while it is pressed."
        onClick={() => onChange(press ? without(effects, "press") : { ...effects, press: true })}
      >
        Press
      </button>
      <button
        type="button"
        className={styles.chip}
        title="Play the entrances once"
        onClick={onPlay}
      >
        Play entrances
      </button>
      <div className={styles.span2}>
        <label className={styles.box} title="How the block comes into view.">
          <span className={styles.tag}>Entrance</span>
          <select
            value={enter?.effect ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setEnter(
                isEnterEffect(value) ? { trigger: "scroll", ...enter, effect: value } : undefined,
              );
            }}
          >
            <option value="">None</option>
            {ENTER_EFFECTS.map((name) => (
              <option key={name} value={name}>
                {nice(name)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {enter && (
        <>
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
          <div
            role="group"
            aria-label="Trigger"
            title="Play as the page opens, or when the block is scrolled to."
            className={`${styles.seg} ${styles.span2}`}
          >
            {ENTER_TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                type="button"
                className={styles.segButton}
                aria-pressed={enter.trigger === trigger}
                onClick={() => setEnter({ ...enter, trigger })}
              >
                {trigger === "load" ? "On load" : "On scroll"}
              </button>
            ))}
          </div>
          <div className={styles.span2}>
            <NumberBox
              label="Duration"
              unit="ms"
              hint="How long it takes. Not used for an entrance on scroll."
              stored={enter.duration ?? DEFAULT_DURATION}
              min={MIN_DURATION}
              max={MAX_DURATION}
              onCommit={(duration) => setEnter({ ...enter, duration })}
            />
          </div>
          <div className={styles.span2}>
            <NumberBox
              label="Delay"
              unit="ms"
              hint="How long it waits before it starts."
              stored={enter.delay ?? 0}
              min={0}
              max={MAX_DELAY}
              onCommit={(delay) => setEnter({ ...enter, delay })}
            />
          </div>
          <div className={styles.span2}>
            <label className={styles.box} title="The pace of the movement.">
              <span className={styles.tag}>Pace</span>
              <select
                value={enter.easing ?? DEFAULT_EASING}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isEasing(value)) setEnter({ ...enter, easing: value });
                }}
              >
                {EASINGS.map((name) => (
                  <option key={name} value={name}>
                    {nice(name)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {holdsBlocks && (
        <div className={styles.span2}>
          <NumberBox
            label="Stagger"
            unit="ms"
            hint="The blocks inside come in one after the other, this far apart. Only blocks with an entrance."
            stored={stagger ?? 0}
            min={0}
            max={MAX_STAGGER}
            onCommit={(value) =>
              onChange(value === 0 ? without(effects, "stagger") : { ...effects, stagger: value })
            }
          />
        </div>
      )}
    </div>
  );
}

/** A whole number in a range: typed, then pulled into the range and stored when it is left or Enter is pressed. */
function NumberBox({
  label,
  unit,
  hint,
  stored,
  min,
  max,
  onCommit,
}: {
  label: string;
  unit: string;
  hint: string;
  stored: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(stored));
  const commit = () => {
    const typed = Number(text);
    if (text.trim() === "" || !Number.isFinite(typed)) {
      setText(String(stored));
      return;
    }
    const value = Math.min(max, Math.max(min, Math.round(typed)));
    setText(String(value));
    if (value !== stored) onCommit(value);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") setText(String(stored));
  };
  return (
    <label className={styles.box} title={hint}>
      <span className={styles.tag}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={keys}
      />
      <span className={styles.suffix} aria-hidden="true">
        {unit}
      </span>
    </label>
  );
}
