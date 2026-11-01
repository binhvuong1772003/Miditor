import { clampPageHeight } from "@midito-kitchen/core";
import { type PointerEvent, useLayoutEffect, useRef, useState } from "react";
import { useT } from "./i18n/context";
import styles from "./PageEdge.module.css";

export interface PageEdgeProps {
  /** The element of the page, whose bottom edge the handle sits on. */
  page: HTMLElement;
  /** The scrolling canvas, whose own coordinates the handle is placed in so it scrolls with the page. */
  workspace: HTMLElement;
  /** How many screen px one px of the page is. */
  zoom: number;
  /** The bottom of the lowest block in the page's px: the page cannot be dragged shorter than it. */
  floor: number;
  /** The height is being dragged to this: show it, but do not store it yet. */
  onPreview: (height: number) => void;
  /** The drag ended on this height: store it. */
  onCommit: (height: number) => void;
  /** The drag was dropped (Esc): show what is stored. */
  onCancel: () => void;
}

/**
 * The handle at the middle of the bottom edge of the page: drag it down to make the page taller, up
 * to make it shorter, down to the lowest block. The height so far is written beside it while it is
 * dragged. Esc drops the drag. It keeps its place when the canvas scrolls or the zoom changes, since
 * it is placed from the page every time the editor draws.
 */
export function PageEdge({
  page,
  workspace,
  zoom,
  floor,
  onPreview,
  onCommit,
  onCancel,
}: PageEdgeProps) {
  const t = useT();
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const [live, setLive] = useState<number | null>(null);
  const start = useRef<{ y: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const box = page.getBoundingClientRect();
    const view = workspace.getBoundingClientRect();
    const left = box.left + box.width / 2 - view.left + workspace.scrollLeft - workspace.clientLeft;
    const top = box.bottom - view.top + workspace.scrollTop - workspace.clientTop;
    setPlace((now) => (now && now.left === left && now.top === top ? now : { left, top }));
  });

  if (!place) return null;
  const height = (event: PointerEvent) => {
    const from = start.current;
    if (!from) return undefined;
    return clampPageHeight(from.height + (event.clientY - from.y) / zoom, floor);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a slider needs a value range; this is a drag handle with its own number field in the panel
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("pageEdge.label")}
      className={styles.edge}
      style={{ left: place.left, top: place.top }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = { y: event.clientY, height: page.offsetHeight };
        setLive(page.offsetHeight);
      }}
      onPointerMove={(event) => {
        const next = height(event);
        if (next === undefined) return;
        setLive(next);
        onPreview(next);
      }}
      onPointerUp={(event) => {
        const next = height(event);
        const was = start.current?.height;
        start.current = null;
        setLive(null);
        // A press that did not move the edge changes nothing, and does not fix the height of the page.
        if (next === undefined || next === was) return onCancel();
        onCommit(next);
      }}
      onPointerCancel={() => {
        start.current = null;
        setLive(null);
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && start.current) {
          event.stopPropagation();
          start.current = null;
          setLive(null);
          onCancel();
        }
      }}
    >
      <span className={styles.grip} />
      {live !== null && <span className={styles.value}>{live} px</span>}
    </div>
  );
}
