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
  /** A class for moveable's control layer, to colour the selection outline. */
  className?: string | undefined;
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

/** True for an element that belongs to moveable's own layer, so a press on it is not a press on a node. */
export function isMoveableLayer(element: Element): boolean {
  return element.closest(".moveable-control-box") !== null;
}

export function DragMove({ target, container, className, onDragStart, onDragEnd }: DragMoveProps) {
  const moveable = useRef<Moveable>(null);
  const dragging = useRef(false);
  const lastDist = useRef({ x: 0, y: 0 });
  // The inline transform the element had before the drag, put back when the drag ends.
  const savedTransform = useRef("");

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
      {...(className ? { className } : {})}
      draggable
      origin={false}
      throttleDrag={0}
      onDragStart={guarded((e: OnDragStart) => {
        dragging.current = true;
        lastDist.current = { x: 0, y: 0 };
        savedTransform.current = (e.target as HTMLElement).style.transform;
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
          // Put back what the node had (render writes `transform: none`) instead of clearing it, so a
          // rule of the host page cannot start to apply to the node after the first drag.
          if (savedTransform.current) el.style.transform = savedTransform.current;
          else el.style.removeProperty("transform");
          moveable.current?.updateRect();
        }
      })}
    />
  );
}
