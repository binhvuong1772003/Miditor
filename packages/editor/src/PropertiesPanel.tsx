import {
  type AxisAnchor,
  boxFor,
  type ComponentDef,
  type Device,
  isFreeNode,
  type JsonValue,
  keepsRatio,
  type NodeEffects,
  parseAngle,
  parseCoordinate,
  parsePixelLength,
  propsFor,
  type Rect,
  type Theme,
  type TreeNode,
} from "@midito-kitchen/core";
import { Fragment, type KeyboardEvent, useEffect, useId, useState } from "react";
import type { ActionDef } from "./actions";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import { ColourPopover } from "./ColourPopover";
import { EffectsFields } from "./EffectsFields";
import styles from "./PropertiesPanel.module.css";
import { PropFields } from "./PropFields";
import { Section } from "./Section";
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

/** The motion of the node: what it does on hover and press and how it comes in. `undefined` takes it all away. */
export type EffectsPatch = { key: "effects"; value: NodeEffects | undefined };

/** One change to one node, from any field of the panel. */
export type PanelPatch =
  | StylePatch
  | RotationPatch
  | PropPatch
  | LockRatioPatch
  | PhoneLayoutPatch
  | EffectsPatch;

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
  /** What a button can do, for its Action field. */
  actions?: readonly ActionDef[] | undefined;
  /** Play the entrances of the page once on the canvas. */
  onPlayMotion?: (() => void) | undefined;
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
  onPlayMotion,
  actions,
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
  const coordinate = (label: string, name: string, field: "x" | "y" | "w" | "h") => (
    <CoordinateField
      label={label}
      name={name}
      stored={rect?.[field]}
      onCommit={(value) => value !== undefined && onRect(field, value)}
    />
  );

  return (
    <div className={styles.content}>
      <div className={styles.heading}>
        <h2 className={styles.title}>{def?.label ?? node.type}</h2>
        {!def && <p className={styles.meta}>Unknown kind of block</p>}
      </div>
      <div className={styles.tabsBar}>
        <div
          role="tablist"
          aria-label="Properties"
          className={styles.tabs}
          onKeyDown={(event) => {
            const names: Tab[] = ["design", "advanced"];
            const at = names.indexOf(tab);
            const next =
              event.key === "ArrowRight"
                ? names[(at + 1) % names.length]
                : event.key === "ArrowLeft"
                  ? names[(at + names.length - 1) % names.length]
                  : event.key === "Home"
                    ? names[0]
                    : event.key === "End"
                      ? names[names.length - 1]
                      : undefined;
            if (!next) return;
            event.preventDefault();
            setTab(next);
            document.getElementById(`${tabsId}-${next}`)?.focus();
          }}
        >
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
              tabIndex={tab === id ? 0 : -1}
              className={styles.tab}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        className={styles.tabpanel}
      >
        {tab === "design" ? (
          // A key per tab, so a section of one tab never takes over the open or shut state of another's.
          <Fragment key="design">
            {hasFields && def && (
              <PropFields
                def={def}
                props={propsFor(node, device)}
                theme={theme}
                actions={actions}
                onChange={(name, value) => onCommit({ key: "prop", name, value })}
              />
            )}
            <Section
              title="Background"
              actions={
                // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
                <div
                  role="group"
                  aria-label="Kind of background"
                  className={`${styles.tabs} ${styles.mini}`}
                >
                  {(
                    [
                      ["color", "Colour"],
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
              }
            >
              {backgroundKind === "color" ? (
                <ColourField
                  label="Fill"
                  noneLabel="No fill"
                  hint="The colour that fills the block. Clear it for no fill."
                  {...colour("background")}
                />
              ) : (
                <BackgroundFields
                  styles={node.styles}
                  uploadImage={uploadImage}
                  onChange={(patch) => onCommit(patch)}
                />
              )}
            </Section>
            <Section title="Border">
              <div className={styles.grid2}>
                <LengthField
                  label="Width"
                  hint="In pixels, like 2. Leave it empty or 0 for no border."
                  {...length("borderWidth")}
                />
                <LengthField
                  label="Radius"
                  hint="In pixels, like 4. Leave it empty or 0 for square corners."
                  {...length("borderRadius")}
                />
                <div className={styles.span2}>
                  <ColourField
                    label="Colour"
                    noneLabel="No border colour"
                    hint="The colour of the border. Clear it to draw the border in the text colour."
                    {...colour("borderColor")}
                  />
                </div>
              </div>
            </Section>
            <Section title="Effects" closed>
              <EffectsFields
                effects={node.effects}
                holdsBlocks={def?.canContain === true}
                onChange={(value) => onCommit({ key: "effects", value })}
                onPlay={() => onPlayMotion?.()}
              />
            </Section>
          </Fragment>
        ) : (
          <Fragment key="advanced">
            {isFreeNode(node) && box && (
              <>
                <Section title="Position and size">
                  <div className={styles.pair}>
                    {coordinate("X", "X position", "x")}
                    {coordinate("Y", "Y position", "y")}
                    {coordinate("W", "Width", "w")}
                    {coordinate("H", "Height", "h")}
                    <AngleField
                      label="R"
                      name="Rotation"
                      hint=""
                      stored={box.rotation}
                      onPreview={(value) => onPreview({ key: "rotation", value: value ?? 0 })}
                      onCommit={(value) => onCommit({ key: "rotation", value: value ?? 0 })}
                      onDiscard={onDiscard}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={keepsRatio(node, def)}
                    title="Resizing keeps the width to height ratio"
                    onClick={() => onCommit({ key: "lockRatio", value: !keepsRatio(node, def) })}
                  >
                    Keep proportions
                  </button>
                </Section>
                <Section
                  title="Anchors"
                  help="What the block sticks to when the page changes size, for example on a phone."
                >
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
                </Section>
                <Section title="Phone">
                  {device === "phone" ? (
                    <div className={styles.row}>
                      <span className={styles.status}>
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
                      Layout: {byHand ? "set by hand for the phone" : "automatic"}. Switch to Phone
                      to place this block separately.
                    </p>
                  )}
                </Section>
              </>
            )}
            <Section title="Developer info" closed>
              <dl className={styles.facts}>
                <dt>type</dt>
                <dd>{node.type}</dd>
                <dt>id</dt>
                <dd>{node.id}</dd>
              </dl>
            </Section>
          </Fragment>
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
  return (
    <label className={styles.box}>
      <span className={styles.tag}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as AxisAnchor)}>
        {ANCHORS.map((anchor) => (
          <option key={anchor} value={anchor}>
            {ANCHOR_NAMES[axis][anchor]}
          </option>
        ))}
      </select>
    </label>
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

function ColourField({
  noneLabel,
  theme,
  ...field
}: FieldProps<string> & { noneLabel: string; theme: Theme | undefined }) {
  const { label, hint, stored, onCommit } = field;
  return (
    <div className={styles.row}>
      <ColourPopover
        label={label}
        hint={hint}
        theme={theme}
        stored={stored}
        noneLabel={noneLabel}
        onPreview={field.onPreview}
        onCommit={onCommit}
      />
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
  name,
  stored,
  onCommit,
}: {
  label: string;
  name: string;
  stored: number | undefined;
  onCommit: (value: number | undefined) => void;
}) {
  return (
    <NumberField
      label={label}
      name={name}
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

function AngleField(field: FieldProps<number> & { name?: string }) {
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
  name,
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
  /** What the field is called to assistive technology when its label is short, like "W". */
  name?: string;
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
  const errorId = useId();

  return (
    <div className={styles.stack}>
      <label className={styles.box} title={hint !== "" ? hint : undefined} aria-invalid={invalid}>
        <span className={styles.tag}>{label}</span>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          aria-label={name}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => typed(event.target.value)}
          onKeyDown={keys}
          onBlur={leave}
        />
        <span className={styles.suffix} aria-hidden="true">
          {unit}
        </span>
      </label>
      {invalid && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
