import type { Handle } from "@midito-kitchen/core";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Moveable, {
  type OnDrag,
  type OnDragEnd,
  type OnDragStart,
  type OnResize,
  type OnResizeEnd,
  type OnResizeStart,
} from "react-moveable";

// The only file that knows react-moveable, so the library can be swapped for hand-written handles.
// It follows the rules measured in TN4: moveable draws the preview, the data changes once on release.

export interface ResizeResult {
  /** The new width and height in px, as react-moveable reports them. */
  w: number;
  h: number;
  /** The handle that was dragged. */
  handle: Handle;
}

export interface SelectionBoxProps {
  /** The element to drag and resize. Pass it as state, not a ref: a ref is still null on the first render. */
  target: HTMLElement | null;
  /** The scrolling element that holds moveable's control layer. */
  container: HTMLElement | null;
  /** A class for moveable's control layer, to colour the selection outline. */
  className?: string | undefined;
  /** The smallest width and height, in px, that a resize can reach. */
  minSize: number;
  /** A drag or a resize begins. Read whatever the commit will need here. */
  onGestureStart: () => void;
  /**
   * Once, on release, and only when the pointer really moved. `dist` is in px, in the node's own
   * (rotated) axes, as react-moveable reports it. The call is flushed to the DOM before returning.
   */
  onDragEnd: (dist: { x: number; y: number }) => void;
  /** Once, on release, and only when a handle really moved. Flushed to the DOM before returning. */
  onResizeEnd: (result: ResizeResult) => void;
}

/** Wraps a handler so an exception is logged: moveable silently drops the whole gesture on one. */
function guarded<A extends unknown[]>(handler: (...args: A) => void) {
  return (...args: A) => {
    try {
      handler(...args);
    } catch (error) {
      console.error("[midito] gesture handler failed", error);
    }
  };
}

/** True for an element that belongs to moveable's own layer, so a press on it is not a press on a node. */
export function isMoveableLayer(element: Element): boolean {
  return element.closest(".moveable-control-box") !== null;
}

/** The inline styles a preview writes. They are put back as they were when the gesture ends. */
const PREVIEW = ["transform", "width", "height"] as const;
type Saved = Record<(typeof PREVIEW)[number], string>;

const save = (el: HTMLElement): Saved => ({
  transform: el.style.transform,
  width: el.style.width,
  height: el.style.height,
});

/** Put back what the node had (render writes `transform: none`) instead of clearing it, so a rule of
 * the host page cannot start to apply to the node after the first gesture. */
function restore(el: HTMLElement, saved: Saved) {
  for (const property of PREVIEW) {
    if (saved[property]) el.style[property] = saved[property];
    else el.style.removeProperty(property);
  }
}

const sign = (n: number | undefined): -1 | 0 | 1 =>
  n === undefined ? 0 : n < 0 ? -1 : n > 0 ? 1 : 0;
const handleOf = (direction: number[]): Handle => [sign(direction[0]), sign(direction[1])];
const isCorner = ([x, y]: Handle) => x !== 0 && y !== 0;

export function SelectionBox({
  target,
  container,
  className,
  minSize,
  onGestureStart,
  onDragEnd,
  onResizeEnd,
}: SelectionBoxProps) {
  const moveable = useRef<Moveable>(null);
  const busy = useRef(false);
  const lastDist = useRef({ x: 0, y: 0 });
  const lastSize = useRef<ResizeResult | null>(null);
  const saved = useRef<Saved>({ transform: "", width: "", height: "" });
  // Shift at a corner keeps the ratio. Moveable reads this prop on every event of the gesture.
  const [keepRatio, setKeepRatio] = useState(false);

  // The control layer caches the target's rect. Refresh it when the target's parent changes size,
  // for example when the window narrows and an end-anchored node moves, but never during a gesture.
  useEffect(() => {
    const parent = target?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      if (!busy.current) moveable.current?.updateRect();
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, [target]);

  const begin = (el: HTMLElement) => {
    busy.current = true;
    saved.current = save(el);
    el.dataset.dragging = "";
    onGestureStart();
  };

  /**
   * Drop the preview, then commit, both in one task so no frame shows the old spot or size. The
   * preview goes first because React only rewrites the styles whose value changed: put back after the
   * commit, a saved width would win over the new one. It also goes if the commit throws, so the node
   * never shows data it does not have.
   */
  const finish = (el: HTMLElement, commit: () => void) => {
    restore(el, saved.current);
    try {
      flushSync(commit);
    } finally {
      moveable.current?.updateRect();
    }
  };

  const end = (el: HTMLElement) => {
    busy.current = false;
    delete el.dataset.dragging;
    setKeepRatio(false);
  };

  return (
    <Moveable
      ref={moveable}
      target={target}
      container={container}
      {...(className ? { className } : {})}
      draggable
      resizable
      keepRatio={keepRatio}
      origin={false}
      throttleDrag={0}
      throttleResize={0}
      onDragStart={guarded((e: OnDragStart) => {
        lastDist.current = { x: 0, y: 0 };
        begin(e.target as HTMLElement);
      })}
      onDrag={guarded((e: OnDrag) => {
        // Moveable previews the move itself; React state stays untouched until release.
        Object.assign((e.target as HTMLElement).style, e.style);
        lastDist.current = { x: e.dist[0] ?? 0, y: e.dist[1] ?? 0 };
      })}
      onDragEnd={guarded((e: OnDragEnd) => {
        const el = e.target as HTMLElement;
        end(el);
        if (!e.isDrag) return;
        finish(el, () => onDragEnd(lastDist.current));
      })}
      onResizeStart={guarded((e: OnResizeStart) => {
        lastSize.current = null;
        e.setMin([minSize, minSize]);
        setKeepRatio(isCorner(handleOf(e.direction)) && e.inputEvent?.shiftKey === true);
        begin(e.target as HTMLElement);
      })}
      onResize={guarded((e: OnResize) => {
        const el = e.target as HTMLElement;
        el.style.width = `${e.width}px`;
        el.style.height = `${e.height}px`;
        el.style.transform = e.drag.transform;
        const handle = handleOf(e.direction);
        lastSize.current = { w: e.width, h: e.height, handle };
        // Shift can go down or up in the middle of a gesture.
        const wanted = isCorner(handle) && e.inputEvent?.shiftKey === true;
        if (wanted !== keepRatio) setKeepRatio(wanted);
      })}
      onResizeEnd={guarded((e: OnResizeEnd) => {
        const el = e.target as HTMLElement;
        end(el);
        const result = lastSize.current;
        if (!e.isDrag || !result) {
          restore(el, saved.current);
          return;
        }
        finish(el, () => onResizeEnd(result));
      })}
    />
  );
}
