import { useEffect, useId, useRef } from "react";

export interface SentDataDialogProps {
  /** The data to show, already formatted as JSON text. */
  json: string;
  onClose: () => void;
}

/** A pop-up that shows what `onSave` was given, standing in for the back end the playground does not have. */
export function SentDataDialog({ json, onClose }: SentDataDialogProps) {
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
      className="dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The backdrop belongs to the dialog element itself; the content fills the rest of it.
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId} className="dialog-title">
          Data to send
        </h2>
        <button type="button" className="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
      <p className="dialog-note">
        The playground has no back end. This is the data the editor gave to onSave, and what a host
        would send. The page is also kept in this browser's localStorage after every change.
      </p>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section className="dialog-data" aria-label="Data to send as JSON" tabIndex={0}>
        <pre className="dialog-code">{json}</pre>
      </section>
    </dialog>
  );
}
