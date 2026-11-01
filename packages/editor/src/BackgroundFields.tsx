import {
  BACKGROUND_POSITIONS,
  type BackgroundPosition,
  type BackgroundRepeat,
  type BackgroundSize,
  isBackgroundPosition,
  isBackgroundRepeat,
  isBackgroundSize,
  isImageUrl,
  type NodeStyles,
} from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useId, useRef, useState } from "react";
import { useT } from "./i18n/context";
import type { MessageKey } from "./i18n/en";
import styles from "./PropertiesPanel.module.css";
import { type UploadImage, uploadMessage, uploadPicture } from "./upload-image";

/** One change to the background picture of a block, made by a field below. `undefined` removes it. */
export type BackgroundPatch =
  | { key: "backgroundImage"; value: string | undefined }
  | { key: "backgroundSize"; value: BackgroundSize }
  | { key: "backgroundPosition"; value: BackgroundPosition }
  | { key: "backgroundRepeat"; value: BackgroundRepeat };

export interface BackgroundFieldsProps {
  styles: NodeStyles;
  /** The host's way to upload a picture. Without it a person types the address of one. */
  uploadImage?: UploadImage | undefined;
  onChange: (patch: BackgroundPatch) => void;
}

const SIZES = [
  ["cover", "bg.cover"],
  ["contain", "bg.contain"],
  ["auto", "bg.actual"],
] as const satisfies readonly [BackgroundSize, MessageKey][];

/** The picture behind a block, and how it sits: size, position and whether it is tiled. */
export function BackgroundFields({ styles: look, uploadImage, onChange }: BackgroundFieldsProps) {
  const t = useT();
  const chooser = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  const address = isImageUrl(look.backgroundImage) ? look.backgroundImage : undefined;

  /** Upload the chosen file and make the address that comes back the picture. */
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !uploadImage) return;
    setState({ busy: true, error: null });
    const result = await uploadPicture(file, uploadImage);
    setState({ busy: false, error: result.ok ? null : uploadMessage(t, result) });
    if (result.ok) onChange({ key: "backgroundImage", value: result.url });
  };

  return (
    <>
      <div className={styles.field}>
        <div className={styles.row}>
          <span
            className={styles.thumb}
            aria-hidden="true"
            style={address ? { backgroundImage: `url("${address}")` } : undefined}
          />
          {uploadImage ? (
            <>
              <input ref={chooser} type="file" accept="image/*" hidden onChange={pick} />
              <button
                type="button"
                className={styles.reset}
                disabled={state.busy}
                onClick={() => chooser.current?.click()}
              >
                {state.busy
                  ? t("images.uploading")
                  : address
                    ? t("common.changeImage")
                    : t("bg.upload")}
              </button>
            </>
          ) : (
            <AddressInput
              address={address}
              onChange={(value) => onChange({ key: "backgroundImage", value })}
            />
          )}
          {address && (
            <button
              type="button"
              className={styles.reset}
              onClick={() => onChange({ key: "backgroundImage", value: undefined })}
            >
              {t("common.remove")}
            </button>
          )}
        </div>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
      </div>
      {address && (
        <>
          <div className={styles.grid2}>
            <label className={styles.box}>
              <span className={styles.tag}>{t("common.size")}</span>
              <select
                value={isBackgroundSize(look.backgroundSize) ? look.backgroundSize : "cover"}
                onChange={(event) => {
                  if (isBackgroundSize(event.target.value)) {
                    onChange({ key: "backgroundSize", value: event.target.value });
                  }
                }}
              >
                {SIZES.map(([value, key]) => (
                  <option key={value} value={value}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.box}>
              <span className={styles.tag}>{t("bg.position")}</span>
              <select
                value={
                  isBackgroundPosition(look.backgroundPosition) ? look.backgroundPosition : "center"
                }
                onChange={(event) => {
                  if (isBackgroundPosition(event.target.value)) {
                    onChange({ key: "backgroundPosition", value: event.target.value });
                  }
                }}
              >
                {BACKGROUND_POSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`position.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={
                isBackgroundRepeat(look.backgroundRepeat) && look.backgroundRepeat === "repeat"
              }
              onChange={(event) =>
                onChange({
                  key: "backgroundRepeat",
                  value: event.target.checked ? "repeat" : "no-repeat",
                })
              }
            />
            {t("bg.tile")}
          </label>
        </>
      )}
    </>
  );
}

/** A host with no upload: the address typed, kept when it is a safe one and put back when it is not. */
function AddressInput({
  address,
  onChange,
}: {
  address: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const t = useT();
  const id = useId();
  const errorId = useId();
  const [text, setText] = useState(address ?? "");
  const [invalid, setInvalid] = useState(false);
  const apply = () => {
    const next = text.trim();
    if (next === (address ?? "")) {
      setInvalid(false);
      return;
    }
    if (next === "") {
      setInvalid(false);
      onChange(undefined);
    } else if (isImageUrl(next)) {
      setInvalid(false);
      onChange(next);
    } else {
      setInvalid(true);
    }
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") apply();
    if (event.key === "Escape") {
      setText(address ?? "");
      setInvalid(false);
    }
  };
  return (
    <>
      <input
        id={id}
        type="text"
        className={`${styles.input} ${styles.mono}`}
        aria-label={t("bg.address")}
        value={text}
        placeholder="https://…"
        spellCheck={false}
        autoComplete="off"
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={apply}
        onKeyDown={keys}
      />
      {invalid && (
        <p id={errorId} className={styles.error} role="alert">
          {t("bg.addressError")}
        </p>
      )}
    </>
  );
}
