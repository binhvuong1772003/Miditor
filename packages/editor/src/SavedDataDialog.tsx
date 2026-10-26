import { useEffect, useId, useRef } from "react";
import styles from "./Editor.module.css";

export interface SavedDataDialogProps {
  /** The data to show, already formatted as JSON text. */
  json: string;
  onClose: () => void;
}

/**
 * Temporary: a pop-up that shows the data the editor holds, so it can be inspected while the editor
 * is built. It is replaced by a real save hook (`onChange` / `onPublish`) later.
 */
export function SavedDataDialog({ json, onClose }: SavedDataDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: clicking the backdrop is a mouse shortcut; the keyboard path is Esc and the Close button
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The backdrop belongs to the dialog element itself; the content fills the rest of it.
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id={titleId} className={styles.dialogTitle}>
          Saved data
        </h2>
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          onClick={() => dialog.current?.close()}
        >
          Close
        </button>
      </div>
      <p className={styles.dialogNote}>
        Nothing is stored anywhere yet. This is the data the editor holds right now.
      </p>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section className={styles.dialogData} aria-label="Saved data as JSON" tabIndex={0}>
        <pre className={styles.dialogCode}>{json}</pre>
      </section>
    </dialog>
  );
}
