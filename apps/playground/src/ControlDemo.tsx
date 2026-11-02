import { useEditor } from "@miditor/editor";

/** Counts how often the Undo button is drawn, so a check can see it follows `canUndo` and nothing else. */
function HostUndo() {
  const editor = useEditor();
  const disabled = useEditor((view) => !view.canUndo);
  const w = window as unknown as { __hostUndoRenders?: number };
  w.__hostUndoRenders = (w.__hostUndoRenders ?? 0) + 1;
  return (
    <button type="button" className="preview-link" disabled={disabled} onClick={editor.undo}>
      Host undo
    </button>
  );
}

function HostSelectFirst() {
  const editor = useEditor();
  const first = useEditor((view) => view.data.root.children[0]?.id);
  return (
    <button
      type="button"
      className="preview-link"
      disabled={first === undefined}
      onClick={() => first !== undefined && editor.select(first)}
    >
      Host select first
    </button>
  );
}

function HostReadout() {
  const status = useEditor((view) => view.status);
  const selected = useEditor((view) => view.selection.id);
  return (
    <span className="preview-link">
      <span data-testid="host-status">{status ?? "none"}</span>
      {" · "}
      <span data-testid="host-selection">{selected ?? "none"}</span>
    </span>
  );
}

/**
 * A part of the host's own, drawn inside the editor through `headerActions`: it drives the editor with
 * `useEditor`, the way a host with its own toolbar would. Shown with `?control`.
 */
export function ControlDemo() {
  const editor = useEditor();
  return (
    <>
      <button type="button" className="preview-link" onClick={() => void editor.save()}>
        Host save
      </button>
      <HostUndo />
      <HostSelectFirst />
      <button type="button" className="preview-link" onClick={() => editor.addBlock("Text")}>
        Host add Text
      </button>
      <HostReadout />
    </>
  );
}
