import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * `children` drawn in a frame of its own, as a visitor's browser draws the page: the width of the frame is
 * the width of the page, so `@media` and `vw` in the blocks see it, and the style of the host does not reach
 * the blocks except through the sheets copied here. The frame is as tall as the page.
 */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [height, setHeight] = useState(0);
  // The document of a frame is replaced when its `srcDoc` has loaded, so nothing is put in it before that.
  const loaded = (frame: HTMLIFrameElement) => {
    const target = frame.contentDocument;
    if (!target) return;
    for (const sheet of document.querySelectorAll('style, link[rel~="stylesheet"]')) {
      target.head.append(sheet.cloneNode(true));
    }
    const reset = target.createElement("style");
    reset.textContent =
      "html, body { height: auto !important; min-height: 0 !important; margin: 0; }";
    target.head.append(reset);
    setDoc(target);
  };
  useEffect(() => {
    if (!doc) return;
    const measure = () => setHeight(doc.body.offsetHeight);
    measure();
    const watch = new ResizeObserver(() => requestAnimationFrame(measure));
    watch.observe(doc.body);
    return () => watch.disconnect();
  }, [doc]);
  return (
    <>
      <iframe
        title="Preview"
        srcDoc="<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>"
        onLoad={(event) => loaded(event.currentTarget)}
        style={{
          border: 0,
          display: "block",
          inlineSize: "100%",
          blockSize: Math.max(height, 640),
        }}
      />
      {doc ? createPortal(children, doc.body) : null}
    </>
  );
}
