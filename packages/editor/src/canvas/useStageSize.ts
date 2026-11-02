import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type EditorState, useEditorState, useStoreApi, useViewCommands } from "../store";
import { zoomBy } from "../zoom";

/**
 * What the zoomed stage needs to know, and the wheel zoom that changes it. `stage` is the element
 * the page is drawn in; `stageBox` is the room the workspace has, the width the page has at 100% and
 * the height of the stage before it is scaled.
 */
export function useStageSize(workspace: HTMLElement | null): {
  stage: RefObject<HTMLDivElement | null>;
  stageBox: { room: number; page: number; height: number };
} {
  const store = useStoreApi<EditorState>();
  const viewing = useViewCommands();
  const zoom = useEditorState((state) => state.zoom);
  const [stageBox, setStageBox] = useState({ room: 0, page: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  // The point of the page under the pointer when a wheel zoom began, so the page can be scrolled to
  // keep that point where the pointer is.
  const anchor = useRef<{ x: number; y: number; lx: number; ly: number } | null>(null);
  // Ctrl or Cmd with the wheel (a pinch on a trackpad too) zooms the canvas, not the browser. A
  // listener of its own: React's are passive, and this one has to stop the browser's page zoom.
  useEffect(() => {
    if (!workspace) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const box = stage.current?.getBoundingClientRect();
      const was = store.getState().zoom;
      const next = zoomBy(was, event.deltaY);
      if (next === was) return;
      anchor.current = box
        ? {
            x: event.clientX,
            y: event.clientY,
            lx: (event.clientX - box.left) / was,
            ly: (event.clientY - box.top) / was,
          }
        : null;
      viewing.setZoom(next);
    };
    workspace.addEventListener("wheel", onWheel, { passive: false });
    return () => workspace.removeEventListener("wheel", onWheel);
  }, [workspace, store, viewing]);

  // After a wheel zoom the page is scrolled so the point that was under the pointer still is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new zoom is the trigger, not a value read
  useLayoutEffect(() => {
    const at = anchor.current;
    anchor.current = null;
    const box = stage.current?.getBoundingClientRect();
    if (!at || !box || !workspace) return;
    workspace.scrollLeft += box.left + at.lx * zoom - at.x;
    workspace.scrollTop += box.top + at.ly * zoom - at.y;
  }, [zoom]);

  // What the zoomed stage needs to know: the room the workspace has, the width the page has at
  // 100% and the height of the stage before it is scaled. Measured again when any of them changes.
  useEffect(() => {
    const box = stage.current;
    if (!workspace || !box || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const look = getComputedStyle(workspace);
      const room =
        workspace.clientWidth - parseFloat(look.paddingLeft) - parseFloat(look.paddingRight);
      const page = box.querySelector<HTMLElement>("[data-miditor-render]");
      const widest = page ? Number.parseFloat(getComputedStyle(page).maxWidth) : Number.NaN;
      setStageBox((prev) => {
        const next = {
          room,
          page: Number.isFinite(widest) ? Math.min(widest, room) : room,
          height: box.offsetHeight,
        };
        return prev.room === next.room && prev.page === next.page && prev.height === next.height
          ? prev
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    observer.observe(box);
    return () => observer.disconnect();
  }, [workspace]);
  return { stage, stageBox };
}
