import {
  type AxisAnchor,
  boxFor,
  type ComponentDef,
  type Device,
  isFreeNode,
  type JsonValue,
  keepsRatio,
  nameOfColorRef,
  parseAngle,
  parseCoordinate,
  parseHexColor,
  parsePixelLength,
  propsFor,
  type Rect,
  resolveColor,
  type Theme,
  type TreeNode,
} from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import styles from "./PropertiesPanel.module.css";
import { PropFields } from "./PropFields";
import { ThemePicker } from "./ThemePicker";
import type { UploadImage } from "./upload-image";

/** One style of one node, and the value it should have. `undefined` removes the style. */
export type StylePatch =
  | { key: "background" | "borderColor"; value: string | undefined }
  | { key: "borderWidth" | "borderRadius"; value: number | undefined }
  | BackgroundPatch;

/** What the panel changes besides styles: the rotation, which every free node has and never loses. */
export type RotationPatch = { key: "rotation"; value: number };

/** Whether resizing keeps the proportions of this block. `undefined` takes the choice back to its kind's. */
export type LockRatioPatch = { key: "lockRatio"; value: boolean | undefined };

/** The phone gets a placement of its own for this block, to start from the one it has now. */
export type PhoneLayoutPatch = { key: "phoneLayout"; value: "separate" };

/** One prop of the node, set by a field that its kind in the registry declares. */
export type PropPatch = { key: "prop"; name: string; value: JsonValue };

/** One change to one node, from any field of the panel. */
export type PanelPatch = StylePatch | RotationPatch | PropPatch | LockRatioPatch | PhoneLayoutPatch;

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
  /** The theme of the page: its colours can be picked for a colour. */
  theme?: Theme | undefined;
  /** The host's way to upload a picture, for the background picture of a block. */
  uploadImage?: UploadImage | undefined;
  /** Drop the preview and show what is stored. */
  onDiscard: () => void;
  /** Give the selected block back its automatic phone placement, dropping the one set by hand. */
  onResetPhone: () => void;
  /** Anchor one axis of the selected free block another way; the block stays where it is. */
  onAnchor: (axis: "x" | "y", anchor: AxisAnchor) => void;
  /** Where the selected free block is and how big, on this screen, in px: what the number fields show. */
  rect?: Rect | undefined;
  /** A number of the rect was typed: x, y, width or height. */
  onRect: (field: "x" | "y" | "w" | "h", value: number) => void;
}

/** The kinds of the kit's tabs: the content and look of a block, and where and how it sits. */
type Tab = "design" | "advanced";

/**
 * The properties of the selected block in two tabs. Design is what the block says and how it looks:
 * the fields its kind declares, its fill, its picture and its border. Advanced is where it sits: its
 * position and size, its anchors, the phone, and the facts a developer asks for.
 */
export function PropertiesPanel({
  node,
  device,
  onResetPhone,
  def,
  onPreview,
  onCommit,
  onDiscard,
  onAnchor,
  rect,
  onRect,
  theme,
  uploadImage,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState<Tab>("design");
  // Whether the background is a colour or a picture; it starts as what the block has.
  const [fill, setFill] = useState<"color" | "image" | null>(null);
  const tabsId = useId();
  if (!node) {
    return <p className={styles.empty}>Select a block to edit its properties.</p>;
  }
  const colour = (key: "background" | "borderColor") => ({
    stored: node.styles[key],
    theme,
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
  const backgroundKind = fill ?? (node.styles.backgroundImage !== undefined ? "image" : "color");
  const box = isFreeNode(node) ? boxFor(node, device) : undefined;
  const hasFields = def !== undefined && Object.values(def.fields).some((f) => f.type !== "image");
  const byHand = (isFreeNode(node) && node.phone !== undefined) || node.phoneProps !== undefined;
  const coordinate = (label: string, field: "x" | "y" | "w" | "h") => (
    <CoordinateField
      label={label}
      stored={rect?.[field]}
      onCommit={(value) => value !== undefined && onRect(field, value)}
    />
  );

  return (
    <div className={styles.content}>
      <div className={styles.heading}>
        <h2 className={styles.title}>{def?.label ?? node.type}</h2>
        <p className={styles.meta}>
          {def ? `${def.category ?? "Custom"} block` : "Unknown kind of block"}
        </p>
      </div>
      <div role="tablist" aria-label="Properties" className={styles.tabs}>
        {(
          [
            ["design", "Design"],
            ["advanced", "Advanced"],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${tabsId}-${id}`}
            aria-selected={tab === id}
            aria-controls={`${tabsId}-panel`}
            className={styles.tab}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        className={styles.tabpanel}
      >
        {tab === "design" ? (
          <>
            {hasFields && def && (
              <>
                <h3 className={styles.section}>Content</h3>
                <PropFields
                  def={def}
                  props={propsFor(node, device)}
                  theme={theme}
                  onChange={(name, value) => onCommit({ key: "prop", name, value })}
                />
              </>
            )}
            <h3 className={styles.section}>Background</h3>
            {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
            <div role="group" aria-label="Kind of background" className={styles.tabs}>
              {(
                [
                  ["color", "Color"],
                  ["image", "Image"],
                ] as const
              ).map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  className={styles.tab}
                  aria-pressed={backgroundKind === id}
                  onClick={() => setFill(id)}
                >
                  {name}
                </button>
              ))}
            </div>
            {backgroundKind === "color" ? (
              <ColourField
                label="Fill"
                pickerLabel="Fill colour picker"
                hint="Hex colour, like #d5dae3. Leave it empty for no fill."
                {...colour("background")}
              />
            ) : (
              <BackgroundFields
                styles={node.styles}
                uploadImage={uploadImage}
                onChange={(patch) => onCommit(patch)}
              />
            )}
            <h3 className={styles.section}>Border</h3>
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
          </>
        ) : (
          <>
            {isFreeNode(node) && box && (
              <>
                <h3 className={styles.section}>Position and size</h3>
                <div className={styles.pair}>
                  {coordinate("X", "x")}
                  {coordinate("Y", "y")}
                  {coordinate("Width", "w")}
                  {coordinate("Height", "h")}
                </div>
                <AngleField
                  label="Rotation"
                  hint="In degrees, from -180 to 180, like 45. Leave it empty for 0."
                  stored={box.rotation}
                  onPreview={(value) => onPreview({ key: "rotation", value: value ?? 0 })}
                  onCommit={(value) => onCommit({ key: "rotation", value: value ?? 0 })}
                  onDiscard={onDiscard}
                />
                <h3 className={styles.section}>Anchors</h3>
                <p className={styles.hint}>
                  What the block sticks to when the page changes size, for example on a phone.
                </p>
                <AnchorSelect
                  label="Horizontal"
                  axis="x"
                  value={box.x.anchor}
                  onChange={(a) => onAnchor("x", a)}
                />
                <AnchorSelect
                  label="Vertical"
                  axis="y"
                  value={box.y.anchor}
                  onChange={(a) => onAnchor("y", a)}
                />
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={keepsRatio(node, def)}
                    onChange={(event) =>
                      onCommit({ key: "lockRatio", value: event.target.checked })
                    }
                  />
                  Keep proportions when resizing
                </label>
                <h3 className={styles.section}>Phone</h3>
                {device === "phone" ? (
                  <div className={styles.row}>
                    <span className={styles.label}>
                      Layout: {byHand ? "set by hand" : "automatic"}
                    </span>
                    {byHand ? (
                      <button type="button" className={styles.reset} onClick={onResetPhone}>
                        Reset to automatic
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.reset}
                        onClick={() => onCommit({ key: "phoneLayout", value: "separate" })}
                      >
                        Edit separately
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={styles.hint}>
                    Layout: {byHand ? "set by hand for the phone" : "automatic"}. Switch to Phone to
                    place this block separately.
                  </p>
                )}
              </>
            )}
            <h3 className={styles.section}>Developer info</h3>
            <dl className={styles.facts}>
              <dt>type</dt>
              <dd>{node.type}</dd>
              <dt>id</dt>
              <dd>{node.id}</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

const ANCHORS: readonly AxisAnchor[] = ["start", "end", "center", "stretch", "scale"];

/** What each anchor is called to a person, which depends on the axis: left and right, or top and bottom. */
const ANCHOR_NAMES: Record<"x" | "y", Record<AxisAnchor, string>> = {
  x: {
    start: "Stick left",
    end: "Stick right",
    center: "Keep centered",
    stretch: "Stretch both sides",
    scale: "Scale with page",
  },
  y: {
    start: "Stick top",
    end: "Stick bottom",
    center: "Keep centered",
    stretch: "Stretch both sides",
    scale: "Scale with page",
  },
};

function AnchorSelect({
  label,
  axis,
  value,
  onChange,
}: {
  label: string;
  axis: "x" | "y";
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
            {ANCHOR_NAMES[axis][anchor]}
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
// A colour of the theme is written `@name` and is kept as it is.
const readColour = (text: string): Reading<string> =>
  text.trim() === ""
    ? undefined
    : (parseHexColor(text) ?? (nameOfColorRef(text.trim()) === undefined ? null : text.trim()));

function ColourField({
  pickerLabel,
  theme,
  ...field
}: FieldProps<string> & { pickerLabel: string; theme: Theme | undefined }) {
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
          value={resolveColor(parseHexColor(text) ?? text.trim(), theme) ?? "#ffffff"}
          onChange={picked}
        />
        <input
          id={textId}
          type="text"
          className={`${styles.input} ${styles.mono}`}
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
      <ThemePicker
        theme={theme}
        stored={stored}
        onPick={(value) => {
          setText(value);
          setInvalid(false);
          onCommit(value);
        }}
      />
      {invalid ? (
        <p id={errorId} className={styles.error} role="alert">
          Not a colour. Use a hex colour like #d5dae3.
        </p>
      ) : (
        hint !== "" && (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        )
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

/** Nothing typed is no number: a position or a size is never taken away. */
const readCoordinate = (text: string): Reading<number> => parseCoordinate(text) ?? null;

/** A number of where a block is or how big, in px; it can be negative, since a block may stick out. */
function CoordinateField({
  label,
  stored,
  onCommit,
}: {
  label: string;
  stored: number | undefined;
  onCommit: (value: number | undefined) => void;
}) {
  return (
    <NumberField
      label={label}
      hint=""
      stored={stored === undefined ? undefined : Math.round(stored * 100) / 100}
      unit="px"
      placeholder="0"
      read={readCoordinate}
      error="Not a number. Use pixels, like 120 or -8."
      onPreview={() => {}}
      onCommit={onCommit}
      onDiscard={() => {}}
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
          aria-describedby={invalid ? errorId : hint !== "" ? hintId : undefined}
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
