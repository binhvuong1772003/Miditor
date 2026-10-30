import {
  type AxisAnchor,
  boxFor,
  type ComponentDef,
  type Device,
  isFreeNode,
  type JsonValue,
  parseAngle,
  parseHexColor,
  parsePixelLength,
  type TreeNode,
} from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import styles from "./PropertiesPanel.module.css";
import { PropFields } from "./PropFields";
import type { UploadImage } from "./upload-image";

/** One style of one node, and the value it should have. `undefined` removes the style. */
export type StylePatch =
  | { key: "background" | "borderColor"; value: string | undefined }
  | { key: "borderWidth" | "borderRadius"; value: number | undefined };

/** What the panel changes besides styles: the rotation, which every free node has and never loses. */
export type RotationPatch = { key: "rotation"; value: number };

/** One prop of the node, set by a field that its kind in the registry declares. */
export type PropPatch = { key: "prop"; name: string; value: JsonValue };

/** One change to one node, from any field of the panel. */
export type PanelPatch = StylePatch | RotationPatch | PropPatch;

export interface PropertiesPanelProps {
  /** The selected node, or `undefined` when nothing is selected. */
  node: TreeNode | undefined;
  /** The screen being edited: the rotation and the anchors shown are the ones of this screen. */
  device: Device;
  /** The kind of the selected node in the registry, or `undefined` for a kind nobody registered. */
  def: ComponentDef | undefined;
  /** A value is being picked or typed: show it, but do not store it yet. */
  onPreview: (patch: PanelPatch) => void;
  /** The value is final: store it. */
  onCommit: (patch: PanelPatch) => void;
  /** The host's way to upload a picture, for the fields that hold one. */
  uploadImage?: UploadImage | undefined;
  /** Drop the preview and show what is stored. */
  onDiscard: () => void;
  /** Give the selected block back its automatic phone placement, dropping the one set by hand. */
  onResetPhone: () => void;
  /** False when the blocks cannot be changed from this screen, so the button that deletes one is off. */
  canDelete: boolean;
  /** Delete the selected block and everything in it. */
  onDelete: () => void;
  /** Anchor one axis of the selected free block another way; the block stays where it is. */
  onAnchor: (axis: "x" | "y", anchor: AxisAnchor) => void;
}

/**
 * Temporary: fixed fields for any selected node (the rotation only for a free one). The fields will come from `config` and the
 * registry, so each kind of component can say what it lets a person edit.
 */
export function PropertiesPanel({
  node,
  device,
  onResetPhone,
  canDelete,
  def,
  onPreview,
  onCommit,
  onDiscard,
  onDelete,
  onAnchor,
  uploadImage,
}: PropertiesPanelProps) {
  if (!node) {
    return <p className={styles.empty}>Select a block to edit its properties.</p>;
  }
  const colour = (key: "background" | "borderColor") => ({
    stored: node.styles[key],
    onPreview: (value: string | undefined) => onPreview({ key, value }),
    onCommit: (value: string | undefined) => onCommit({ key, value }),
    onDiscard,
  });
  const length = (key: "borderWidth" | "borderRadius") => ({
    stored: node.styles[key],
    onPreview: (value: number | undefined) => onPreview({ key, value }),
    onCommit: (value: number | undefined) => onCommit({ key, value }),
    onDiscard,
  });
  return (
    <div className={styles.content}>
      <h2 className={styles.title}>{node.type}</h2>
      <p className={styles.meta}>{node.id}</p>
      {def && (
        <PropFields
          def={def}
          props={node.props}
          onChange={(name, value) => onCommit({ key: "prop", name, value })}
          uploadImage={uploadImage}
        />
      )}
      {device === "phone" && isFreeNode(node) && node.phone && (
        <button type="button" className={styles.reset} onClick={onResetPhone}>
          Reset to automatic
        </button>
      )}
      {isFreeNode(node) && (
        <>
          <AnchorSelect
            label="Anchor X"
            value={boxFor(node, device).x.anchor}
            onChange={(a) => onAnchor("x", a)}
          />
          <AnchorSelect
            label="Anchor Y"
            value={boxFor(node, device).y.anchor}
            onChange={(a) => onAnchor("y", a)}
          />
        </>
      )}
      {isFreeNode(node) && (
        <AngleField
          label="Rotation"
          hint="In degrees, from -180 to 180, like 45. Leave it empty for 0."
          stored={boxFor(node, device).rotation}
          onPreview={(value) => onPreview({ key: "rotation", value: value ?? 0 })}
          onCommit={(value) => onCommit({ key: "rotation", value: value ?? 0 })}
          onDiscard={onDiscard}
        />
      )}
      <ColourField
        label="Fill"
        pickerLabel="Fill colour picker"
        hint="Hex colour, like #d5dae3. Leave it empty for no fill."
        {...colour("background")}
      />
      <LengthField
        label="Border width"
        hint="In pixels, like 2. Leave it empty or 0 for no border."
        {...length("borderWidth")}
      />
      <ColourField
        label="Border colour"
        pickerLabel="Border colour picker"
        hint="Hex colour, like #b3bccb. Empty draws the border in the text colour."
        {...colour("borderColor")}
      />
      <LengthField
        label="Radius"
        hint="In pixels, like 4. Leave it empty or 0 for square corners."
        {...length("borderRadius")}
      />
      <button
        type="button"
        className={styles.delete}
        disabled={!canDelete}
        title={canDelete ? "Delete (Del)" : "Switch to Desktop to delete blocks"}
        onClick={onDelete}
      >
        Delete block
      </button>
    </div>
  );
}

const ANCHORS: readonly AxisAnchor[] = ["start", "end", "center", "stretch", "scale"];

/** Temporary: a plain select to try `setAnchor` by hand. */
function AnchorSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AxisAnchor;
  onChange: (anchor: AxisAnchor) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value as AxisAnchor)}
      >
        {ANCHORS.map((anchor) => (
          <option key={anchor} value={anchor}>
            {anchor}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FieldProps<T> {
  label: string;
  hint: string;
  /** What is stored on the node, or `undefined`. */
  stored: T | undefined;
  onPreview: (value: T | undefined) => void;
  onCommit: (value: T | undefined) => void;
  onDiscard: () => void;
}

/** What a text means: nothing typed is `undefined`, `null` is "not a value". */
type Reading<T> = T | undefined | null;

/** The part of a field that does not depend on the kind of value: text, error and the keys. */
function useTextField<T>(
  stored: T | undefined,
  show: (value: T | undefined) => string,
  read: (text: string) => Reading<T>,
  { onPreview, onCommit, onDiscard }: Pick<FieldProps<T>, "onPreview" | "onCommit" | "onDiscard">,
) {
  const [text, setText] = useState(show(stored));
  const [invalid, setInvalid] = useState(false);

  // When the stored value changes (a change was committed), show it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `show` only formats `stored`
  useEffect(() => {
    setText(show(stored));
    setInvalid(false);
  }, [stored]);

  const revert = () => {
    setText(show(stored));
    setInvalid(false);
    onDiscard();
  };

  /** Store what is typed. Returns false, and keeps the text, when it is not a value. */
  const apply = () => {
    const value = read(text);
    if (value === null) {
      setInvalid(true);
      return false;
    }
    setInvalid(false);
    setText(show(value));
    if (value === stored) onDiscard();
    else onCommit(value);
    return true;
  };

  const typed = (next: string) => {
    setText(next);
    setInvalid(false);
    const value = read(next);
    // A text that is not (yet) a value shows what is stored.
    if (value === null) onDiscard();
    else onPreview(value);
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") apply();
    if (event.key === "Escape") revert();
  };

  const leave = () => {
    // Leaving the field applies a value that is typed, and drops text that is not one.
    const value = read(text);
    if (value !== null && value === stored) {
      setText(show(value));
      return;
    }
    if (!apply()) revert();
  };

  return { text, setText, invalid, setInvalid, typed, keys, leave };
}

const showColour = (value: string | undefined) => value ?? "";
const readColour = (text: string): Reading<string> =>
  text.trim() === "" ? undefined : (parseHexColor(text) ?? null);

function ColourField({ pickerLabel, ...field }: FieldProps<string> & { pickerLabel: string }) {
  const { label, hint, stored, onPreview, onCommit, onDiscard } = field;
  const { text, setText, invalid, setInvalid, typed, keys, leave } = useTextField(
    stored,
    showColour,
    readColour,
    { onPreview, onCommit, onDiscard },
  );
  const textId = useId();
  const hintId = useId();
  const errorId = useId();
  const picker = useRef<HTMLInputElement>(null);
  // The picker's own `change` event is the moment the choice is final, and the one handler it needs
  // must see the latest callback.
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // React's `onChange` on a colour input fires on every `input` event while the picker is dragged;
  // only the native `change` event says the pick is done.
  useEffect(() => {
    const element = picker.current;
    if (!element) return;
    const done = () => commitRef.current(parseHexColor(element.value));
    element.addEventListener("change", done);
    return () => element.removeEventListener("change", done);
  }, []);

  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
    setInvalid(false);
    onPreview(event.target.value);
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textId}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          ref={picker}
          type="color"
          className={styles.swatch}
          aria-label={pickerLabel}
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
          onChange={(event) => typed(event.target.value)}
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
          {hint}
        </p>
      )}
    </div>
  );
}

const showNumber = (value: number | undefined) => (value === undefined ? "" : String(value));

/** A length of 0 means "none", which is the same as no value: the style is removed. */
const readLength = (text: string): Reading<number> => {
  if (text.trim() === "") return undefined;
  const value = parsePixelLength(text);
  if (value === undefined) return null;
  return value === 0 ? undefined : value;
};

/** Nothing typed is a turn of 0: a free node always has a rotation, so it is never removed. */
const readAngle = (text: string): Reading<number> =>
  text.trim() === "" ? 0 : (parseAngle(text) ?? null);

function LengthField(field: FieldProps<number>) {
  return (
    <NumberField
      {...field}
      unit="px"
      placeholder="0"
      read={readLength}
      error="Not a length. Use a number from 0 to 1000, like 4."
    />
  );
}

function AngleField(field: FieldProps<number>) {
  return (
    <NumberField
      {...field}
      unit="°"
      placeholder="0"
      read={readAngle}
      error="Not an angle. Use a number of degrees, like 45."
    />
  );
}

function NumberField({
  label,
  hint,
  unit,
  placeholder,
  error,
  read,
  stored,
  onPreview,
  onCommit,
  onDiscard,
}: FieldProps<number> & {
  unit: string;
  placeholder: string;
  error: string;
  read: (text: string) => Reading<number>;
}) {
  const { text, invalid, typed, keys, leave } = useTextField(stored, showNumber, read, {
    onPreview,
    onCommit,
    onDiscard,
  });
  const textId = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={textId}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          id={textId}
          type="text"
          inputMode="decimal"
          className={styles.input}
          value={text}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : hintId}
          onChange={(event) => typed(event.target.value)}
          onKeyDown={keys}
          onBlur={leave}
        />
        <span className={styles.unit} aria-hidden="true">
          {unit}
        </span>
      </div>
      {invalid ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
