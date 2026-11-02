import { EndPanel } from "./EndPanel";
import { Rail } from "./Rail";
import { StartPanel } from "./StartPanel";
import { useShell } from "./shell";
import { Toolbar } from "./Toolbar";

// The parts of the editor, each reading the provider's shell. A host places them anywhere inside
// `<EditorProvider>`; `<Editor />` places them in the default layout.

/** The bar at the top: undo, redo, the frame, the zoom and save. @experimental */
export function EditorHeader() {
  return <Toolbar {...useShell("Editor.Header").header} />;
}

/** The tool buttons. @experimental */
export function EditorRail() {
  return <Rail {...useShell("Editor.Rail").rail} />;
}

/** The panel of the tool the rail chose. @experimental */
export function EditorStartPanel() {
  return <StartPanel {...useShell("Editor.StartPanel").start} />;
}

/** The page's settings, or the properties of the selected block. @experimental */
export function EditorProperties() {
  return <EndPanel {...useShell("Editor.Properties").end} />;
}

/** The parts in the default layout: the header, the rail, the left panel, the canvas, the properties. */
export function DefaultLayout() {
  const shell = useShell("Editor");
  return (
    <>
      <EditorHeader />
      <EditorRail />
      <EditorStartPanel />
      {shell.canvas}
      <EditorProperties />
    </>
  );
}
