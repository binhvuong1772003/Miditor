import { type EditorController, useEditor } from "@midito-kitchen/editor";

/**
 * A bar of the host's own, drawn outside `<Editor>` and above it. It has no editor around it: it holds
 * a controller (`useCreateEditor()`) that the editor is given, and drives the editor through it. While
 * the editor is closed its reads are idle and its commands do nothing. Shown with `?control&outside`.
 */
export function OutsideBar({
  editor,
  open,
  onToggle,
}: {
  editor: EditorController;
  open: boolean;
  onToggle: () => void;
}) {
  const canUndo = useEditor(editor, (view) => view.canUndo);
  const selected = useEditor(editor, (view) => view.selection.id);
  const status = useEditor(editor, (view) => view.status);
  return (
    <div
      role="toolbar"
      aria-label="Host bar"
      style={{ display: "flex", gap: 8, alignItems: "center", padding: 8 }}
    >
      <button type="button" disabled={!canUndo} onClick={editor.undo}>
        Outside undo
      </button>
      <button type="button" onClick={() => void editor.save()}>
        Outside save
      </button>
      <button type="button" onClick={() => editor.addBlock("Text")}>
        Outside add Text
      </button>
      <button type="button" onClick={onToggle}>
        {open ? "Close editor" : "Open editor"}
      </button>
      <span>
        selected: <span data-testid="outside-selection">{selected ?? "none"}</span>
        {" · status: "}
        <span data-testid="outside-status">{status ?? "none"}</span>
      </span>
    </div>
  );
}
