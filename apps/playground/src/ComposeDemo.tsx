import { Editor, useEditorRoot } from "@miditor/editor";
import { type CSSProperties, useState } from "react";
import { createPortal } from "react-dom";

// The host's side of `<EditorProvider>` (`?compose`): the host places the parts itself. The provider's
// root is `block-size: 100%` and is not a grid, so each layout below is a shell of the host's own that
// fills it. A part that scrolls (the panels, the workspace) needs a container with a size to scroll in.

const shell: CSSProperties = { blockSize: "100%", minBlockSize: 0, display: "grid" };
const cell: CSSProperties = { minBlockSize: 0, minInlineSize: 0, overflow: "hidden" };

/** The properties in a dialog drawn in the editor's root, so the look and the language reach it. */
function PropertiesDialog({ onClose }: { onClose: () => void }) {
  const root = useEditorRoot();
  if (!root) return null;
  return createPortal(
    <div
      role="dialog"
      aria-label="Properties"
      data-testid="compose-dialog"
      style={{
        position: "fixed",
        insetBlockStart: "4rem",
        insetInlineEnd: "1rem",
        inlineSize: "20rem",
        blockSize: "60vh",
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
        background: "var(--_chrome)",
        color: "var(--_text)",
        border: "1px solid var(--_border)",
        borderRadius: "var(--_radius-card)",
        boxShadow: "0 8px 24px rgb(0 0 0 / 0.2)",
        zIndex: 10,
      }}
    >
      <div style={cell}>
        <Editor.Properties />
      </div>
      <button type="button" onClick={onClose} style={{ margin: "0.5rem" }}>
        Close
      </button>
    </div>,
    root,
  );
}

/** Rail and Blocks on the left, the canvas in the middle, Layers on the right, Properties in a dialog. */
export function ComposeLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...shell, gridTemplateRows: "auto minmax(0, 1fr)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          background: "var(--_chrome)",
          color: "var(--_text)",
          borderBlockEnd: "1px solid var(--_border)",
        }}
      >
        <strong>Host layout</strong>
        <button type="button" onClick={() => setOpen(true)}>
          Properties
        </button>
      </div>
      <div style={{ ...shell, gridTemplateColumns: "14rem minmax(0, 1fr) 16rem" }}>
        <div style={{ ...shell, gridTemplateRows: "auto minmax(0, 1fr)", minInlineSize: 0 }}>
          <Editor.Rail />
          <div style={{ ...cell, overflow: "auto" }}>
            <Editor.Blocks />
          </div>
        </div>
        <div style={{ ...cell, display: "grid", gridTemplateRows: "minmax(0, 1fr)" }}>
          <Editor.Canvas />
        </div>
        <div style={{ ...cell, overflow: "auto" }}>
          <Editor.Layers />
        </div>
      </div>
      {open && <PropertiesDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Only the canvas: no header, no rail, no panels. */
export function BareLayout() {
  return (
    <div style={{ ...shell, gridTemplateRows: "minmax(0, 1fr)" }}>
      <div style={{ ...cell, display: "grid" }}>
        <Editor.Canvas />
      </div>
    </div>
  );
}

/** The header, the layers and the properties, with no canvas at all. */
export function NoCanvasLayout() {
  return (
    <div style={{ ...shell, gridTemplateRows: "3.5rem minmax(0, 1fr)" }}>
      <Editor.Header />
      <div style={{ ...shell, gridTemplateColumns: "16rem minmax(0, 1fr)" }}>
        <div style={{ ...cell, overflow: "auto" }}>
          <Editor.Layers />
        </div>
        <div style={{ ...cell, overflow: "auto" }}>
          <Editor.Properties />
        </div>
      </div>
    </div>
  );
}

/** The layers beside the canvas, for the page with two providers. */
export function CanvasAndLayers() {
  return (
    <div style={{ ...shell, gridTemplateColumns: "14rem minmax(0, 1fr)" }}>
      <div style={{ ...cell, overflow: "auto" }}>
        <Editor.Layers />
      </div>
      <div style={{ ...cell, display: "grid" }}>
        <Editor.Canvas />
      </div>
    </div>
  );
}
