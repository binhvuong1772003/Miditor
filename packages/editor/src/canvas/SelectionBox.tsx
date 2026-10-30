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
  type OnRotate,
  type OnRotateEnd,
  type OnRotateStart,
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
  /** Resizing always keeps the width to height ratio, for a block that must not be squashed. */
  lockRatio?: boolean;
  /** The smallest width and height, in px, that a resize can reach. */
  minSize: number;
  /** The node's current rotation in degrees, which Shift snaps the turn against. */
  angle: number;
  /** A drag or a resize begins. Read whatever the commit will need here. */
  onGestureStart: () => void;
  /**
   * Once, on release, and only when the pointer really moved. `dist` is in px, in the node's own
   * (rotated) axes, as react-moveable reports it. The call is flushed to the DOM before returning.
   */
  onDragEnd: (dist: { x: number; y: number }) => void;
  /**
   * While a drag goes on, with the distance so far in the same axes as `onDragEnd`, and once more with
   * `null` when it is over. For a hint drawn while dragging; nothing is stored from it.
   */
  onDragMove?: ((dist: { x: number; y: number } | null) => void) | undefined;
  /** Once, on release, and only when a handle really moved. Flushed to the DOM before returning. */
  onResizeEnd: (result: ResizeResult) => void;
  /**
   * Once, on release, and only when the handle really turned. `dist` is the turn in degrees since the
   * gesture began, as react-moveable reports it. Flushed to the DOM before returning.
   */
  onRotateEnd: (dist: number) => void;
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

/** The step, in degrees, that the angle snaps to while Shift is held. */
const SNAP_DEGREES = 15;

/** The turn that takes `angle` to the nearest multiple of the snap step, when the pointer asks for `dist`. */
const snapTurn = (angle: number, dist: number) =>
  Math.round((angle + dist) / SNAP_DEGREES) * SNAP_DEGREES - angle;

const sign = (n: number | undefined): -1 | 0 | 1 =>
  n === undefined ? 0 : n < 0 ? -1 : n > 0 ? 1 : 0;
const handleOf = (direction: number[]): Handle => [sign(direction[0]), sign(direction[1])];
const isCorner = ([x, y]: Handle) => x !== 0 && y !== 0;

export function SelectionBox({
  target,
  container,
  className,
  lockRatio = false,
  minSize,
  angle,
  onGestureStart,
  onDragEnd,
  onDragMove,
  onResizeEnd,
  onRotateEnd,
}: SelectionBoxProps) {
  const moveable = useRef<Moveable>(null);
  const busy = useRef(false);
  const lastDist = useRef({ x: 0, y: 0 });
  const lastSize = useRef<ResizeResult | null>(null);
  const lastTurn = useRef(0);
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

  // The control layer caches the target's rect, and a panel field can change that rect (the rotation
  // turns the node, a border width can grow it). The editor renders again for every such change,
  // so look at the node again after each render, except in the middle of a gesture.
  useEffect(() => {
    if (!busy.current) moveable.current?.updateRect();
  });

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
      rotatable
      keepRatio={lockRatio || keepRatio}
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
        onDragMove?.(lastDist.current);
      })}
      onDragEnd={guarded((e: OnDragEnd) => {
        const el = e.target as HTMLElement;
        end(el);
        onDragMove?.(null);
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
      onRotateStart={guarded((e: OnRotateStart) => {
        lastTurn.current = 0;
        begin(e.target as HTMLElement);
      })}
      onRotate={guarded((e: OnRotate) => {
        // With Shift the ANGLE snaps, not the turn: a node at 37 degrees goes to 45, not to 52.
        const turn = e.inputEvent?.shiftKey === true ? snapTurn(angle, e.dist) : e.dist;
        // Moveable's own transform is `translate(0px, 0px) rotate(Ndeg)`; this is the same turn,
        // stacked on the node's `rotate` property.
        (e.target as HTMLElement).style.transform = `rotate(${turn}deg)`;
        lastTurn.current = turn;
      })}
      onRotateEnd={guarded((e: OnRotateEnd) => {
        const el = e.target as HTMLElement;
        end(el);
        if (!e.isDrag) {
          restore(el, saved.current);
          return;
        }
        finish(el, () => onRotateEnd(lastTurn.current));
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
