import { isImageUrl, MAX_DESCRIPTION, MAX_TITLE, type PageMeta } from "@midito-kitchen/core";
import { type KeyboardEvent, useEffect, useState } from "react";
import styles from "./PropertiesPanel.module.css";

export interface PageInfoFieldsProps {
  meta: PageMeta | undefined;
  /** The new info, or one field removed when it was emptied. A value the field refuses is not sent. */
  onChange: (patch: Partial<Record<keyof PageMeta, string | undefined>>) => void;
}

/**
 * What the page says about itself outside the page: the title of its tab, the line under it in a
 * search result and the picture of a share card. Each field is stored when it is left or Enter is
 * pressed, and an address that is not a safe picture goes back to what is stored.
 */
export function PageInfoFields({ meta, onChange }: PageInfoFieldsProps) {
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
      <TextField
        label="Share picture"
        hint="The address of the picture shown when the page is shared. Use a full https:// address."
        stored={meta?.image}
        accept={isImageUrl}
        placeholder="https://…"
        onCommit={(image) => onChange({ image })}
      />
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
