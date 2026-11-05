import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clientPoint } from "./client-rect";

/** The attribute that marks a style the frame took from the page that holds the editor. */
const COPY = "data-miditor-copied-style";

/**
 * Copies the style sheets of the page that holds the editor into the frame, and keeps them up to date: a
 * style or a stylesheet added later (a font, a hot reload) is copied too. What the blocks of the host's own
 * kinds need (their classes, the fonts of the page) is there; what is in the frame cannot reach the editor.
 */
function useCopiedStyles(doc: Document | null) {
  useEffect(() => {
    if (!doc) return;
    const parent = document.head;
    const copy = () => {
      for (const old of doc.head.querySelectorAll(`[${COPY}]`)) old.remove();
      for (const node of parent.querySelectorAll("style, link[rel~='stylesheet']")) {
        const clone = node.cloneNode(true) as HTMLElement;
        clone.setAttribute(COPY, "");
        doc.head.append(clone);
      }
    };
    copy();
    const watch = new MutationObserver(copy);
    watch.observe(parent, { childList: true, subtree: true, characterData: true });
    return () => watch.disconnect();
  }, [doc]);
}

/**
 * Draws what it has inside the frame once there is one. While the page is drawn in a frame and it is not
 * there yet nothing is drawn, so that what is drawn (the controls, which put their style in the document of
 * their own) is made once, in the document it belongs to.
 */
export function InFrame({
  enabled,
  doc,
  children,
}: {
  /** The page is drawn in a frame (`canvas="iframe"`). */
  enabled: boolean;
  doc: Document | null;
  children: ReactNode;
}) {
  if (doc) return createPortal(children, doc.body);
  return enabled ? null : children;
}

/**
 * A page drawn in a frame of its own, so that what is inside has its own width and style: `@media` and `vw`
 * see the width of the frame, not of the editor. The frame is as tall as what is in it, so the workspace
 * around it scrolls as it does for a page drawn in place.
 */
export function FrameStage({
  className,
  children,
  onDocument,
  onKey,
  onWheel,
  minHeight,
}: {
  className: string;
  children: ReactNode;
  /** The document of the frame, once it is there, or `null` when it is gone. */
  onDocument?: ((doc: Document | null) => void) | undefined;
  /**
   * A key pressed while the frame has the keyboard is aimed at the body of the frame, which React has no part
   * for, so it never reaches the handlers of the editor. This is told every key down and key up of the frame;
   * it answers `true` for a key it takes, which then does not go on in the frame.
   */
  onKey?: ((event: KeyboardEvent) => boolean) | undefined;
  /**
   * A wheel turned with Ctrl or Cmd held over the frame (a pinch on a trackpad too) is told here, with the
   * point on the screen of the page that holds the editor: the wheel of the workspace is not told of it, since
   * it happens in the frame. It answers `true` for a wheel it takes, which then does not zoom the browser.
   */
  onWheel?: ((event: WheelEvent, at: { x: number; y: number }) => boolean) | undefined;
  /** The shortest the page is, when it has no height of its own (a sheet is never a sliver). */
  minHeight?: string | undefined;
}) {
  const told = useRef(onKey);
  told.current = onKey;
  const wheeled = useRef(onWheel);
  wheeled.current = onWheel;
  const frame = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  useCopiedStyles(doc);
  useEffect(() => {
    onDocument?.(doc);
    return () => onDocument?.(null);
  }, [doc, onDocument]);
  // A press that starts outside the frame (a card dragged from the library, a box dragged over the grey around
  // the page) goes on over the frame: the frame would be told of the moves and the end of it, and the page
  // that holds the editor would not. So the frame lets the pointer through until the press ends.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const down = (event: PointerEvent) => {
      if (event.target === element) return;
      element.style.pointerEvents = "none";
      const restore = () => {
        element.style.pointerEvents = "";
        window.removeEventListener("pointerup", restore, true);
        window.removeEventListener("pointercancel", restore, true);
      };
      window.addEventListener("pointerup", restore, true);
      window.addEventListener("pointercancel", restore, true);
    };
    window.addEventListener("pointerdown", down, true);
    return () => window.removeEventListener("pointerdown", down, true);
  }, []);
  useEffect(() => {
    const win = doc?.defaultView;
    if (!win) return;
    const key = (event: KeyboardEvent) => {
      if (told.current?.(event)) event.preventDefault();
    };
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const at = clientPoint(event);
      if (wheeled.current?.(event, at)) event.preventDefault();
    };
    win.addEventListener("keydown", key);
    win.addEventListener("keyup", key);
    win.addEventListener("wheel", wheel, { passive: false });
    return () => {
      win.removeEventListener("keydown", key);
      win.removeEventListener("keyup", key);
      win.removeEventListener("wheel", wheel);
    };
  }, [doc]);
  useEffect(() => {
    if (!doc) return;
    const sheet = doc.createElement("style");
    sheet.textContent = minHeight ? `[data-miditor-render] { min-height: ${minHeight}; }` : "";
    doc.head.append(sheet);
    return () => sheet.remove();
  }, [doc, minHeight]);
  useEffect(() => {
    if (!doc) return;
    // The controls of a block are placed against the body, so it is a containing block, as the workspace is.
    doc.body.style.margin = "0";
    doc.body.style.position = "relative";
    // The controls are placed by a transform from the top left of the body; without this they start below the page.
    const base = doc.createElement("style");
    // The colour is the focus colour of the editor, which the rules of the workspace give outside the frame.
    // The height of the frame follows what is in it, so a host sheet that gives `html` and `body` a height of the
    // window (a common reset) must not hold the page to the height the frame has now.
    // What hangs over the edge of the page is cut, so the frame has no scroll bars of its own: the workspace scrolls.
    base.textContent =
      "html, body { height: auto !important; min-height: 0 !important; } html { overflow: hidden !important; } .moveable-control-box { top: 0; left: 0; --moveable-color: #1d4ed8; }";
    base.setAttribute("data-miditor-frame-base", "");
    doc.head.append(base);
    const measure = () => setHeight(doc.body.offsetHeight);
    measure();
    // Measured a frame later: the frame is made as tall as what is in it, and measuring in the same turn
    // is a resize inside the callback of the observer that saw the resize before.
    let queued = 0;
    const watch = new ResizeObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(measure);
    });
    watch.observe(doc.body);
    return () => {
      cancelAnimationFrame(queued);
      watch.disconnect();
    };
  }, [doc]);
  return (
    <>
      <iframe
        ref={frame}
        title="Page"
        className={className}
        srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
        style={{ border: 0, display: "block", ...(height ? { blockSize: height } : {}) }}
        onLoad={() => setDoc(frame.current?.contentDocument ?? null)}
      />
      {doc && createPortal(children, doc.body)}
    </>
  );
}
