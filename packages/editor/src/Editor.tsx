import {
  type Container,
  cssFor,
  type FreeBox,
  inferBox,
  moveRect,
  type Rect,
  resolveRect,
} from "@midito-kitchen/core";
import { useRef, useState } from "react";
import { DragMove } from "./canvas/DragMove";
import styles from "./Editor.module.css";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
}

// Temporary: one hard-coded node so the page shows something. Replaced by real data at the
// data-model step. Its position is plain React state for now, so a reload puts it back.
const SAMPLE: FreeBox = {
  x: { anchor: "end", offset: 20 },
  y: { anchor: "start", offset: 40 },
  w: { kind: "px", v: 160 },
  h: { kind: "px", v: 96 },
  rotation: 0,
};

/** The editor shell: toolbar, left panel, canvas with one draggable sample block, right panel. */
export function Editor({ className }: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const [box, setBox] = useState<FreeBox>(SAMPLE);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [page, setPage] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const drag = useRef<{ before: FreeBox; start: Rect; container: Container } | null>(null);

  const startDrag = () => {
    if (!page) return;
    // The padding box of the page, which is what the position maths measure from.
    const container = { w: page.clientWidth, h: page.clientHeight };
    drag.current = { before: box, start: resolveRect(box, container), container };
  };

  const endDrag = (dist: { x: number; y: number }) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setBox(inferBox(d.before, moveRect(d.start, dist, d.before.rotation), d.container));
  };

  return (
    <div className={rootClass} data-midito-editor="">
      <header className={styles.toolbar} />
      <aside className={`${styles.panel} ${styles.start}`} aria-label="Layers" />
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section ref={setWorkspace} className={styles.workspace} aria-label="Canvas" tabIndex={0}>
        <div ref={setPage} className={styles.page}>
          <div ref={setBlock} className={styles.sample} style={cssFor(box)} data-midito-node="" />
        </div>
        <DragMove
          target={block}
          container={workspace}
          onDragStart={startDrag}
          onDragEnd={endDrag}
        />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties" />
    </div>
  );
}
