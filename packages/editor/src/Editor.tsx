import {
  type Container,
  emptyPage,
  type FreeNode,
  findNode,
  freeBoxOf,
  inferBox,
  insertNode,
  isFreeNode,
  isPageData,
  minSize,
  moveRect,
  newBlock,
  nextId,
  normalizeAngle,
  type PageData,
  type Rect,
  removeNode,
  resizeRotated,
  resolveRect,
  type TreeNode,
  updateNode,
  withFreeBox,
  withStyle,
} from "@midito-kitchen/core";
import { Render } from "@midito-kitchen/render";
import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { isMoveableLayer, type ResizeResult, SelectionBox } from "./canvas/SelectionBox";
import styles from "./Editor.module.css";
import { isEditableTarget } from "./editable";
import { canRedo, canUndo, commit, createHistory, redo, undo } from "./history";
import { type PanelPatch, PropertiesPanel, type StylePatch } from "./PropertiesPanel";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
  /**
   * The page to open. It is read once, when the editor mounts: the editor keeps its own working copy
   * from then on, so a later change of this prop does not reset it (give the editor a new `key` to
   * open another page). It must pass `isPageData`, or the editor throws. Without it the editor opens
   * an empty page.
   */
  data?: PageData;
  /**
   * Called after every change that is final: a drag, resize or turn that ended, a field applied with
   * Enter or by leaving it. Not called while something is still being typed or dragged, not when the
   * editor mounts, and once per change. The argument is the whole page, ready to be stored.
   */
  onChange?: (data: PageData) => void;
  /**
   * Called when the person presses Save, with the page as it is stored (a field that is being typed
   * in is applied first). Sending it to a back end is the host's job. The Save button only shows
   * when this is given.
   */
  onSave?: (data: PageData) => void | Promise<void>;
  /**
   * How many steps undo can go back, 100 when not given. A whole number from 1 up, or `Infinity` for
   * no limit; anything else uses 100. It is read at each change, so a new value trims the oldest
   * steps on the next change. The steps live in memory only: a reload starts without any.
   */
  historyLimit?: number;
}

// Narrows `StylePatch` by its key, which TypeScript does not do on its own: `applyPatch` has two
// identical branches so that each call to `withStyle` sees a matching key and value type.
const isColourPatch = (
  patch: StylePatch,
): patch is Extract<StylePatch, { key: "background" | "borderColor" }> =>
  patch.key === "background" || patch.key === "borderColor";

/** The node with the change of a patch applied. A rotation only changes a free node. */
const applyPatch = (node: TreeNode, patch: PanelPatch): TreeNode => {
  if (patch.key === "rotation") {
    return isFreeNode(node) && node.rotation !== patch.value
      ? { ...node, rotation: patch.value }
      : node;
  }
  return isColourPatch(patch)
    ? withStyle(node, patch.key, patch.value)
    : withStyle(node, patch.key, patch.value);
};

/** The page with a pending change applied, for drawing it or for storing it. */
const withDraft = (data: PageData, draft: PanelPatch & { id: string }): PageData => ({
  ...data,
  root: updateNode(data.root, draft.id, (n) => applyPatch(n, draft)),
});

/** The page the editor starts from: the host's, once it is checked, or an empty one. */
function openPage(data: PageData | undefined): PageData {
  if (data === undefined) return emptyPage();
  if (!isPageData(data)) {
    throw new Error("[midito] `data` is not a page this editor can open: check it with isPageData");
  }
  return data;
}

/** The element `<Render>` made for a node. Looked up by comparing, so an id needs no escaping. */
const elementOf = (scope: HTMLElement, id: string) =>
  [...scope.querySelectorAll<HTMLElement>("[data-midito-id]")].find(
    (element) => element.dataset.miditoId === id,
  ) ?? null;

/** The editor shell: toolbar, left panel, canvas with a page drawn from data, right panel. */
export function Editor({
  className,
  data: initialData,
  onChange,
  onSave,
  historyLimit,
}: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const [history, setHistory] = useState(() => createHistory(openPage(initialData)));
  const data = history.present;
  /** Store a change as one step. */
  const setData = (change: (prev: PageData) => PageData) =>
    setHistory((h) => commit(h, change(h.present), historyLimit));
  // The page the host already has, so that `onChange` is called for a change and only once for it.
  const notified = useRef(data);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (data === notified.current) return;
    notified.current = data;
    onChangeRef.current?.(data);
  }, [data]);
  // The width the page is shown at. A view setting only: it is not in the page data and not in the history.
  const [frame, setFrame] = useState<"desktop" | "phone">("desktop");
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const gesture = useRef<{ before: FreeNode; start: Rect; container: Container } | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const [draft, setDraft] = useState<(PanelPatch & { id: string }) | null>(null);
  const shown = useMemo<PageData>(() => (draft ? withDraft(data, draft) : data), [data, draft]);
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;

  // `<Render>` owns the elements, so look up the one for the selected node after every render.
  useLayoutEffect(() => {
    setBlock(workspace && selectedId ? elementOf(workspace, selectedId) : null);
  });

  /** A press on a node selects it; a press on the page or the grey around it clears the selection. */
  const press = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (event.button !== 0) return;
    // What is still pending in the panel is applied before anything else changes. A field that is
    // being typed in applies its text when it loses the focus. A colour that was picked is only a
    // draft until the picker closes and sends its own `change`, which comes too late for a press
    // that changes the selection (the panel is gone by then), so the draft is stored here.
    const active = document.activeElement;
    if (active instanceof HTMLElement && isEditableTarget(active)) active.blur();
    if (draft) commitPatch(draft.id, draft);
    if (isMoveableLayer(target)) return;
    const id = target.closest<HTMLElement>("[data-midito-id]")?.dataset.miditoId;
    const selectable = id !== undefined && id !== data.root.id;
    setSelectedId(selectable ? id : null);
    // A press on a node keeps the keyboard inside the editor, so that Esc reaches it. The editor's
    // own element takes the focus: it has no ring, unlike the scrolling canvas.
    if (selectable) editorRoot.current?.focus({ preventScroll: true });
  };

  /** Store one change on a node, once. The draft is over. */
  const commitPatch = (id: string, patch: PanelPatch) => {
    setDraft(null);
    setData((prev) => {
      const root = updateNode(prev.root, id, (n) => applyPatch(n, patch));
      return root === prev.root ? prev : { ...prev, root };
    });
  };

  /** A drag or a resize begins: remember the rect it starts from and the box it is measured in. */
  const startGesture = () => {
    const node = selectedId ? findNode(data.root, selectedId) : undefined;
    const parent = block?.parentElement;
    if (!node || !isFreeNode(node) || !parent) return;
    // The padding box of the node's real parent, which is what the position maths measure from.
    const container = { w: parent.clientWidth, h: parent.clientHeight };
    gesture.current = {
      before: node,
      start: resolveRect(freeBoxOf(node), container),
      container,
    };
  };

  /** Store the box a gesture ended in, once. `next` says which rect that is. */
  const endGesture = (next: (g: NonNullable<typeof gesture.current>) => Rect) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    const moved = inferBox(freeBoxOf(g.before), next(g), g.container);
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, g.before.id, (n) => (isFreeNode(n) ? withFreeBox(n, moved) : n)),
    }));
  };

  const endDrag = (dist: { x: number; y: number }) =>
    endGesture((g) => moveRect(g.start, dist, g.before.rotation));

  // Position maths ignore the rotation, so a turn only changes the angle: no `inferBox`.
  const endRotate = (dist: number) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    const rotation = normalizeAngle(g.before.rotation + dist);
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, g.before.id, (n) =>
        isFreeNode(n) && n.rotation !== rotation ? { ...n, rotation } : n,
      ),
    }));
  };

  /** A new block in the middle of the page, selected. A pending change is stored first. */
  const addBlock = () => {
    if (draft) commitPatch(draft.id, draft);
    const id = nextId(data.root);
    setData((prev) => ({ ...prev, root: insertNode(prev.root, prev.root.id, newBlock(id)) }));
    setSelectedId(id);
  };

  /** The selected block and everything in it is gone. The root cannot be deleted. */
  const deleteBlock = () => {
    if (!selectedId || selectedId === data.root.id) return;
    setDraft(null);
    setData((prev) => ({ ...prev, root: removeNode(prev.root, selectedId) }));
    setSelectedId(null);
  };

  /** One step back or forward. What is still pending is dropped; the selection stays if its node does. */
  const step = (move: typeof undo) => {
    const next = move(history).present;
    setDraft(null);
    setSelectedId((id) => (id !== null && findNode(next.root, id) ? id : null));
    setHistory(move);
  };

  const endResize = ({ w, h, handle }: ResizeResult) =>
    endGesture((g) => resizeRotated(g.start, g.before.rotation, handle, w, h));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it
    <div
      ref={editorRoot}
      className={rootClass}
      data-midito-editor=""
      tabIndex={-1}
      onKeyDown={(event) => {
        // A field keeps its own Esc and its own undo.
        if (isEditableTarget(event.target)) return;
        if (event.key === "Escape") {
          setDraft(null);
          setSelectedId(null);
          return;
        }
        if (gesture.current) return;
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          selectedId
        ) {
          // Backspace is "back" in some browsers.
          event.preventDefault();
          deleteBlock();
          return;
        }
        const key = event.key.toLowerCase();
        const redoing = (key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey);
        if ((key === "z" && (event.ctrlKey || event.metaKey)) || redoing) {
          event.preventDefault();
          step(redoing ? redo : undo);
        }
      }}
    >
      <header className={styles.toolbar}>
        <div className={styles.group}>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={!canUndo(history)}
            title="Undo (Ctrl+Z)"
            onClick={() => step(undo)}
          >
            Undo
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={!canRedo(history)}
            title="Redo (Shift+Ctrl+Z)"
            onClick={() => step(redo)}
          >
            Redo
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            title="Add a block"
            onClick={addBlock}
          >
            Add
          </button>
        </div>
        <div className={styles.group} role="group" aria-label="Frame">
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            aria-pressed={frame === "desktop"}
            onClick={() => setFrame("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            aria-pressed={frame === "phone"}
            onClick={() => setFrame("phone")}
          >
            Phone
          </button>
        </div>
        {onSave && (
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
          <button
            type="button"
            className={`${styles.button} ${styles.primary} ${styles.save}`}
            onClick={() => {
              // A change that is still pending is stored first, and it is part of what is saved.
              const pending = draft;
              if (pending) commitPatch(pending.id, pending);
              onSave(pending ? withDraft(data, pending) : data);
            }}
          >
            Save
          </button>
        )}
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
        <Render
          data={shown}
          className={frame === "phone" ? `${styles.page} ${styles.phone}` : styles.page}
        />
        <SelectionBox
          target={block}
          container={workspace}
          className={styles.selection}
          minSize={minSize(selectedNode?.styles)}
          angle={selectedNode && isFreeNode(selectedNode) ? selectedNode.rotation : 0}
          onGestureStart={startGesture}
          onDragEnd={endDrag}
          onResizeEnd={endResize}
          onRotateEnd={endRotate}
        />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties">
        <PropertiesPanel
          // A new panel for each node, so text typed for one is never applied to another.
          key={selectedNode?.id ?? "none"}
          node={selectedNode}
          onPreview={(patch) => selectedNode && setDraft({ id: selectedNode.id, ...patch })}
          onCommit={(patch) => selectedNode && commitPatch(selectedNode.id, patch)}
          onDiscard={() => setDraft(null)}
          onDelete={deleteBlock}
        />
      </aside>
    </div>
  );
}
