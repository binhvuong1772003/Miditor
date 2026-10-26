import {
  type Container,
  type FreeNode,
  findNode,
  freeBoxOf,
  inferBox,
  isFreeNode,
  moveRect,
  type PageData,
  type Rect,
  resolveRect,
  SCHEMA_VERSION,
  updateNode,
  withFreeBox,
} from "@midito-kitchen/core";
import { Render } from "@midito-kitchen/render";
import { useLayoutEffect, useRef, useState } from "react";
import { DragMove } from "./canvas/DragMove";
import styles from "./Editor.module.css";
import { SavedDataDialog } from "./SavedDataDialog";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
}

const SAMPLE_ID = "sample";

// Temporary: a page with one free node so there is something to drag. It is replaced by data that
// comes from the host. The page lives in React state for now, so a reload puts it back.
const INITIAL_PAGE: PageData = {
  schemaVersion: SCHEMA_VERSION,
  root: {
    id: "root",
    type: "Page",
    props: {},
    position: { mode: "flow" },
    children: [
      {
        id: SAMPLE_ID,
        type: "Container",
        props: {},
        position: {
          mode: "free",
          x: { anchor: "end", offset: 20 },
          y: { anchor: "start", offset: 40 },
        },
        size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
        rotation: 0,
        children: [],
      },
    ],
  },
};

/** The editor shell: toolbar, left panel, canvas with a page drawn from data, right panel. */
export function Editor({ className }: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const [data, setData] = useState<PageData>(INITIAL_PAGE);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const drag = useRef<{ before: FreeNode; start: Rect; container: Container } | null>(null);
  // Temporary: the JSON shown by the Save button, taken at the moment of the click.
  const [savedJson, setSavedJson] = useState<string | null>(null);

  // `<Render>` owns the elements, so look up the one for the sample node after every render.
  useLayoutEffect(() => {
    setBlock(workspace?.querySelector<HTMLElement>(`[data-midito-id="${SAMPLE_ID}"]`) ?? null);
  });

  const save = () => setSavedJson(JSON.stringify(data, null, 2));

  const startDrag = () => {
    const node = findNode(data.root, SAMPLE_ID);
    const parent = block?.parentElement;
    if (!node || !isFreeNode(node) || !parent) return;
    // The padding box of the node's real parent, which is what the position maths measure from.
    const container = { w: parent.clientWidth, h: parent.clientHeight };
    drag.current = { before: node, start: resolveRect(freeBoxOf(node), container), container };
  };

  const endDrag = (dist: { x: number; y: number }) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const moved = inferBox(
      freeBoxOf(d.before),
      moveRect(d.start, dist, d.before.rotation),
      d.container,
    );
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, d.before.id, (n) => (isFreeNode(n) ? withFreeBox(n, moved) : n)),
    }));
  };

  return (
    <div className={rootClass} data-midito-editor="">
      <header className={styles.toolbar}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={save}>
          Save
        </button>
      </header>
      <aside className={`${styles.panel} ${styles.start}`} aria-label="Layers" />
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section ref={setWorkspace} className={styles.workspace} aria-label="Canvas" tabIndex={0}>
        <Render data={data} className={styles.page} />
        <DragMove
          target={block}
          container={workspace}
          onDragStart={startDrag}
          onDragEnd={endDrag}
        />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties" />
      {savedJson !== null && (
        <SavedDataDialog json={savedJson} onClose={() => setSavedJson(null)} />
      )}
    </div>
  );
}
