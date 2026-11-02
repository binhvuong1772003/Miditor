import { useEffect, useRef } from "react";
import { EndPanel } from "./EndPanel";
import { Rail } from "./Rail";
import { StartPanel, ToolPanel } from "./StartPanel";
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

/** The Blocks panel on its own: the cards to press or drag onto the page. @experimental */
export function EditorBlocks() {
  return <ToolPanel tool="blocks" {...useShell("Editor.Blocks").start} />;
}

/** The panel of any tool on its own, the editor's or the host's, by its id. @experimental */
export function EditorTool({ id }: { id: string }) {
  return <ToolPanel tool={id} {...useShell("Editor.Tool").start} />;
}

/** The Layers panel on its own: every block of the page as a list. @experimental */
export function EditorLayers() {
  return <ToolPanel tool="layers" {...useShell("Editor.Layers").start} />;
}

/** The Images panel on its own. @experimental */
export function EditorImages() {
  return <ToolPanel tool="images" {...useShell("Editor.Images").start} />;
}

/** The Themes panel on its own. @experimental */
export function EditorThemes() {
  return <ToolPanel tool="themes" {...useShell("Editor.Themes").start} />;
}

/**
 * The page and everything drawn over it. Place it once: a second one draws nothing and logs an error.
 * @experimental
 */
export function EditorCanvas() {
  const shell = useShell("Editor.Canvas");
  const me = useRef(Symbol("canvas")).current;
  // The first to draw holds the canvas. Claimed while drawing, so a second one never draws the page.
  if (shell.canvasClaim.current === null) shell.canvasClaim.current = me;
  const mine = shell.canvasClaim.current === me;
  useEffect(() => {
    // StrictMode lets go and takes hold again; a canvas that closed lets another one take its place.
    if (shell.canvasClaim.current === null) shell.canvasClaim.current = me;
    if (shell.canvasClaim.current !== me) {
      console.error(
        "[miditor] there is already a canvas in this editor: the second one is not drawn",
      );
    }
    return () => {
      if (shell.canvasClaim.current === me) shell.canvasClaim.current = null;
    };
  }, [shell.canvasClaim, me]);
  return mine ? shell.canvas : null;
}

/** The parts in the default layout: the header, the rail, the left panel, the canvas, the properties. */
export function DefaultLayout() {
  return (
    <>
      <EditorHeader />
      <EditorRail />
      <EditorStartPanel />
      <EditorCanvas />
      <EditorProperties />
    </>
  );
}
