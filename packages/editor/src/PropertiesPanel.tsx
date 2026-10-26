import { parseHexColor, type TreeNode } from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import styles from "./PropertiesPanel.module.css";

export interface PropertiesPanelProps {
  /** The selected node, or `undefined` when nothing is selected. */
  node: TreeNode | undefined;
  /** A colour is being picked or typed: show it, but do not store it yet. `undefined` means no fill. */
  onPreview: (background: string | undefined) => void;
  /** The colour is final: store it. `undefined` removes the fill. */
  onCommit: (background: string | undefined) => void;
  /** Drop the preview and show what is stored. */
  onDiscard: () => void;
}

/**
 * Temporary: one fixed "Fill" field for any selected node. The fields will come from `config` and the
 * registry, so each kind of component can say what it lets a person edit.
 */
export function PropertiesPanel({ node, onPreview, onCommit, onDiscard }: PropertiesPanelProps) {
  if (!node) {
    return <p className={styles.empty}>Select a block to edit its properties.</p>;
  }
  return (
    <div className={styles.content}>
      <h2 className={styles.title}>{node.type}</h2>
      <p className={styles.meta}>{node.id}</p>
      <FillField
        stored={node.styles.background}
        onPreview={onPreview}
        onCommit={onCommit}
        onDiscard={onDiscard}
      />
    </div>
  );
}

interface FillFieldProps {
  /** The colour that is stored on the node, in the stored form, or `undefined`. */
  stored: string | undefined;
  onPreview: (background: string | undefined) => void;
  onCommit: (background: string | undefined) => void;
  onDiscard: () => void;
}

/** What a text means as a colour: nothing typed is "no fill", `null` is not a colour. */
const read = (text: string): string | undefined | null =>
  text.trim() === "" ? undefined : (parseHexColor(text) ?? null);

function FillField({ stored, onPreview, onCommit, onDiscard }: FillFieldProps) {
  const [text, setText] = useState(stored ?? "");
  const [invalid, setInvalid] = useState(false);
  const textId = useId();
  const hintId = useId();
  const errorId = useId();
  const picker = useRef<HTMLInputElement>(null);
  // The picker's own `change` event is the moment the choice is final, and the one handler it needs
  // must see the latest callback.
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // When the stored colour changes (a pick was committed), show it.
  useEffect(() => {
    setText(stored ?? "");
    setInvalid(false);
  }, [stored]);

  // React's `onChange` on a colour input fires on every `input` event while the picker is dragged;
  // only the native `change` event says the pick is done.
  useEffect(() => {
    const element = picker.current;
    if (!element) return;
    const done = () => commitRef.current(parseHexColor(element.value));
    element.addEventListener("change", done);
    return () => element.removeEventListener("change", done);
  }, []);

  const revert = () => {
    setText(stored ?? "");
    setInvalid(false);
    onDiscard();
  };

  /** Store what is typed. Returns false, and keeps the text, when it is not a colour. */
  const apply = () => {
    const value = read(text);
    if (value === null) {
      setInvalid(true);
      return false;
    }
    setInvalid(false);
    setText(value ?? "");
    if (value === stored) onDiscard();
    else onCommit(value);
    return true;
  };

  const typed = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setText(next);
    setInvalid(false);
    const value = read(next);
    // A text that is not (yet) a colour shows what is stored.
    if (value === null) onDiscard();
    else onPreview(value);
  };

  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    setInvalid(false);
    onPreview(event.target.value);
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") apply();
    if (event.key === "Escape") revert();
  };

  const leave = () => {
    // Leaving the field applies a colour that is typed, and drops text that is not one.
    if (read(text) === stored) return;
    if (!apply()) revert();
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textId}>
        Fill
      </label>
      <div className={styles.row}>
        <input
          ref={picker}
          type="color"
          className={styles.swatch}
          aria-label="Fill colour picker"
          value={parseHexColor(text) ?? "#ffffff"}
          onChange={picked}
        />
        <input
          id={textId}
          type="text"
          className={styles.input}
          value={text}
          placeholder="#rrggbb"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : hintId}
          onChange={typed}
          onKeyDown={keys}
          onBlur={leave}
        />
      </div>
      {invalid ? (
        <p id={errorId} className={styles.error} role="alert">
          Not a colour. Use a hex colour like #d5dae3.
        </p>
      ) : (
        <p id={hintId} className={styles.hint}>
          Hex colour, like #d5dae3. Leave it empty for no fill.
        </p>
      )}
    </div>
  );
}
