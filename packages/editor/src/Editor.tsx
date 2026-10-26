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
  withStyle,
} from "@midito-kitchen/core";
import { Render } from "@midito-kitchen/render";
import { type PointerEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DragMove, isMoveableLayer } from "./canvas/DragMove";
import styles from "./Editor.module.css";
import { isEditableTarget } from "./editable";
import { PropertiesPanel } from "./PropertiesPanel";
import { SavedDataDialog } from "./SavedDataDialog";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
}

// Temporary: a page with two free nodes so there is something to select and drag. It is replaced by
// data that comes from the host. The page lives in React state for now, so a reload puts it back.
const INITIAL_PAGE: PageData = {
  schemaVersion: SCHEMA_VERSION,
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {},
    position: { mode: "flow" },
    children: [
      {
        id: "sample",
        type: "Container",
        props: {},
        styles: { background: "#d5dae3" },
        position: {
          mode: "free",
          x: { anchor: "end", offset: 20 },
          y: { anchor: "start", offset: 40 },
        },
        size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
        rotation: 0,
        children: [],
      },
      {
        id: "sample-2",
        type: "Container",
        props: {},
        styles: { background: "#d5dae3" },
        position: {
          mode: "free",
          x: { anchor: "start", offset: 40 },
          y: { anchor: "end", offset: 60 },
        },
        size: { w: { kind: "px", v: 200 }, h: { kind: "px", v: 64 } },
        rotation: 0,
        children: [],
      },
    ],
  },
};

/** The element `<Render>` made for a node. Looked up by comparing, so an id needs no escaping. */
const elementOf = (scope: HTMLElement, id: string) =>
  [...scope.querySelectorAll<HTMLElement>("[data-midito-id]")].find(
    (element) => element.dataset.miditoId === id,
  ) ?? null;

/** The editor shell: toolbar, left panel, canvas with a page drawn from data, right panel. */
export function Editor({ className }: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const [data, setData] = useState<PageData>(INITIAL_PAGE);
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const drag = useRef<{ before: FreeNode; start: Rect; container: Container } | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);
  // Temporary: the JSON shown by the Save button, taken at the moment of the click.
  const [savedJson, setSavedJson] = useState<string | null>(null);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const [draft, setDraft] = useState<{ id: string; background: string | undefined } | null>(null);
  const shown = useMemo<PageData>(
    () =>
      draft
        ? {
            ...data,
            root: updateNode(data.root, draft.id, (n) =>
              withStyle(n, "background", draft.background),
            ),
          }
        : data,
    [data, draft],
  );
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;

  // `<Render>` owns the elements, so look up the one for the selected node after every render.
  useLayoutEffect(() => {
    setBlock(workspace && selectedId ? elementOf(workspace, selectedId) : null);
  });

  const save = () => setSavedJson(JSON.stringify(data, null, 2));

  /** A press on a node selects it; a press on the page or the grey around it clears the selection. */
  const press = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (event.button !== 0 || isMoveableLayer(target)) return;
    // A field that is being typed in applies its text before the panel changes.
    const active = document.activeElement;
    if (active instanceof HTMLElement && isEditableTarget(active)) active.blur();
    const id = target.closest<HTMLElement>("[data-midito-id]")?.dataset.miditoId;
    const selectable = id !== undefined && id !== data.root.id;
    if ((selectable ? id : null) !== selectedId) setDraft(null);
    setSelectedId(selectable ? id : null);
    // A press on a node keeps the keyboard inside the editor, so that Esc reaches it. The editor's
    // own element takes the focus: it has no ring, unlike the scrolling canvas.
    if (selectable) editorRoot.current?.focus({ preventScroll: true });
  };

  /** Store a colour on a node, once. The draft is over. */
  const commitBackground = (id: string, background: string | undefined) => {
    setDraft(null);
    setData((prev) => {
      const root = updateNode(prev.root, id, (n) => withStyle(n, "background", background));
      return root === prev.root ? prev : { ...prev, root };
    });
  };

  const startDrag = () => {
    const node = selectedId ? findNode(data.root, selectedId) : undefined;
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
    // biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it
    <div
      ref={editorRoot}
      className={rootClass}
      data-midito-editor=""
      tabIndex={-1}
      onKeyDown={(event) => {
        // Esc inside the Save pop-up closes the pop-up only, and Esc in a field only undoes the field.
        const inDialog = (event.target as Element).closest("dialog") !== null;
        if (event.key !== "Escape" || inDialog || isEditableTarget(event.target)) return;
        setDraft(null);
        setSelectedId(null);
      }}
    >
      <header className={styles.toolbar}>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={save}>
          Save
        </button>
      </header>
      <aside className={`${styles.panel} ${styles.start}`} aria-label="Layers" />
      <section
        ref={setWorkspace}
        className={styles.workspace}
        aria-label="Canvas"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard
        tabIndex={0}
        onPointerDown={press}
      >
        <Render data={shown} className={styles.page} />
        <DragMove
          target={block}
          container={workspace}
          className={styles.selection}
          onDragStart={startDrag}
          onDragEnd={endDrag}
        />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties">
        <PropertiesPanel
          // A new panel for each node, so text typed for one is never applied to another.
          key={selectedNode?.id ?? "none"}
          node={selectedNode}
          onPreview={(background) => selectedNode && setDraft({ id: selectedNode.id, background })}
          onCommit={(background) => selectedNode && commitBackground(selectedNode.id, background)}
          onDiscard={() => setDraft(null)}
        />
      </aside>
      {savedJson !== null && (
        <SavedDataDialog json={savedJson} onClose={() => setSavedJson(null)} />
      )}
    </div>
  );
}
