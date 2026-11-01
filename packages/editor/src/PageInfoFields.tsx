import { isImageUrl, MAX_DESCRIPTION, MAX_TITLE, type PageMeta } from "@midito-kitchen/core";
import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import styles from "./PropertiesPanel.module.css";
import { type UploadImage, uploadPicture } from "./upload-image";

export interface PageInfoFieldsProps {
  meta: PageMeta | undefined;
  /** The new info, or one field removed when it was emptied. A value the field refuses is not sent. */
  onChange: (patch: Partial<Record<keyof PageMeta, string | undefined>>) => void;
  /** The host's way to upload a picture. Without it a person types the address of the share picture. */
  uploadImage?: UploadImage | undefined;
}

/**
 * What the page says about itself outside the page: the title of its tab, the line under it in a
 * search result and the picture of a share card. Each field is stored when it is left or Enter is
 * pressed, and an address that is not a safe picture goes back to what is stored.
 */
export function PageInfoFields({ meta, onChange, uploadImage }: PageInfoFieldsProps) {
  return (
    <div className={styles.stack}>
      <TextField
        label="Title"
        hint="The title of the browser tab and of a search result."
        stored={meta?.title}
        max={MAX_TITLE}
        onCommit={(title) => onChange({ title })}
      />
      <TextField
        label="Description"
        hint="The line under the title in a search result."
        stored={meta?.description}
        max={MAX_DESCRIPTION}
        multiline
        onCommit={(description) => onChange({ description })}
      />
      {uploadImage ? (
        <SharePicture
          stored={meta?.image}
          uploadImage={uploadImage}
          onCommit={(image) => onChange({ image })}
        />
      ) : (
        <TextField
          label="Share picture"
          hint="The address of the picture shown when the page is shared. Use a full https:// address."
          stored={meta?.image}
          accept={isImageUrl}
          placeholder="https://…"
          onCommit={(image) => onChange({ image })}
        />
      )}
    </div>
  );
}

/** The share picture of a host that uploads: choose a file, and the address that comes back is stored. */
function SharePicture({
  stored,
  uploadImage,
  onCommit,
}: {
  stored: string | undefined;
  uploadImage: UploadImage;
  onCommit: (value: string | undefined) => void;
}) {
  const chooser = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  const address = isImageUrl(stored) ? stored : undefined;
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setState({ busy: true, error: null });
    const result = await uploadPicture(file, uploadImage);
    setState({ busy: false, error: result.ok ? null : result.error });
    if (result.ok) onCommit(result.url);
  };
  return (
    <div className={styles.field} title="The picture shown when the page is shared.">
      <div className={styles.row}>
        <span
          className={styles.thumb}
          aria-hidden="true"
          style={address ? { backgroundImage: `url("${address}")` } : undefined}
        />
        <input ref={chooser} type="file" accept="image/*" hidden onChange={pick} />
        <button
          type="button"
          className={styles.reset}
          disabled={state.busy}
          onClick={() => chooser.current?.click()}
        >
          {state.busy ? "Uploading…" : address ? "Change image" : "Upload picture"}
        </button>
        {address && (
          <button type="button" className={styles.reset} onClick={() => onCommit(undefined)}>
            Remove
          </button>
        )}
      </div>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

function TextField({
  label,
  hint,
  stored,
  max,
  multiline,
  accept,
  placeholder,
  onCommit,
}: {
  label: string;
  hint: string;
  stored: string | undefined;
  max?: number;
  multiline?: boolean;
  accept?: (value: string) => boolean;
  placeholder?: string;
  onCommit: (value: string | undefined) => void;
}) {
  const shown = stored ?? "";
  const [text, setText] = useState(shown);
  // Undo and redo change the stored value from outside: the typed text starts again from it.
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const next = text.trim();
    if (next === shown) return setText(shown);
    if (next !== "" && accept && !accept(next)) return setText(shown);
    onCommit(next === "" ? undefined : next);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") setText(shown);
    if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };
  if (multiline) {
    return (
      <textarea
        className={styles.area}
        aria-label={label}
        title={hint}
        placeholder={label}
        rows={3}
        value={text}
        {...(max !== undefined ? { maxLength: max } : {})}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={keys}
      />
    );
  }
  return (
    <label className={styles.box} title={hint}>
      <span className={styles.tag}>{label}</span>
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        spellCheck={false}
        {...(max !== undefined ? { maxLength: max } : {})}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={keys}
      />
    </label>
  );
}
