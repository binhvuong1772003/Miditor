import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import Moveable, { type OnDrag, type OnDragEnd, type OnDragStart } from "react-moveable";

// The only file that knows react-moveable, so the library can be swapped for hand-written handles.
// It follows the rules measured in TN4: moveable draws the preview, the data changes once on release.

export interface DragMoveProps {
  /** The element to drag. Pass it as state, not a ref: a ref is still null on the first render. */
  target: HTMLElement | null;
  /** The scrolling element that holds moveable's control layer. */
  container: HTMLElement | null;
  /** A drag begins. Read whatever the commit will need here. */
  onDragStart: () => void;
  /**
   * Once, on release, and only when the pointer really moved. `dist` is in px, in the node's own
   * (rotated) axes, as react-moveable reports it. The call is flushed to the DOM before returning.
   */
  onDragEnd: (dist: { x: number; y: number }) => void;
}

/** Wraps a handler so an exception is logged: moveable silently drops the whole gesture on one. */
function guarded<A extends unknown[]>(handler: (...args: A) => void) {
  return (...args: A) => {
    try {
      handler(...args);
    } catch (error) {
      console.error("[midito] drag handler failed", error);
    }
  };
}

export function DragMove({ target, container, onDragStart, onDragEnd }: DragMoveProps) {
  const moveable = useRef<Moveable>(null);
  const dragging = useRef(false);
  const lastDist = useRef({ x: 0, y: 0 });

  // The control layer caches the target's rect. Refresh it when the target's parent changes size,
  // for example when the window narrows and an end-anchored node moves, but never during a drag.
  useEffect(() => {
    const parent = target?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      if (!dragging.current) moveable.current?.updateRect();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [target]);

  return (
    <Moveable
      ref={moveable}
      target={target}
      container={container}
      draggable
      hideDefaultLines
      origin={false}
      throttleDrag={0}
      onDragStart={guarded((e: OnDragStart) => {
        dragging.current = true;
        lastDist.current = { x: 0, y: 0 };
        (e.target as HTMLElement).dataset.dragging = "";
        onDragStart();
      })}
      onDrag={guarded((e: OnDrag) => {
        // Moveable previews the move itself; React state stays untouched until release.
        Object.assign((e.target as HTMLElement).style, e.style);
        lastDist.current = { x: e.dist[0] ?? 0, y: e.dist[1] ?? 0 };
      })}
      onDragEnd={guarded((e: OnDragEnd) => {
        const el = e.target as HTMLElement;
        dragging.current = false;
        delete el.dataset.dragging;
        if (!e.isDrag) return;
        // One task: commit the new position, then drop the preview, so no frame shows the old spot.
        // The preview goes even if the commit throws, so the block never shows data it does not have.
        try {
          flushSync(() => onDragEnd(lastDist.current));
        } finally {
          el.style.removeProperty("transform");
          moveable.current?.updateRect();
        }
      })}
    />
  );
}
