import {
  type AxisAnchor,
  boxFor,
  builtInRegistry,
  type Container,
  canInsert,
  canMove,
  clipboardText,
  copyNodes,
  type Device,
  duplicateNode,
  emptyPage,
  type FreeBox,
  type FreeNode,
  findNode,
  groupNodes,
  inferBox,
  insertNode,
  isFreeNode,
  migratePage,
  minSize,
  moveRect,
  type NewNodeOverrides,
  newNode,
  nextId,
  normalizeAngle,
  type PageData,
  parentOf,
  parseClipboard,
  pasteNodes,
  pickBlock,
  type Rect,
  type Registry,
  type Reorder,
  removeNode,
  reorderNode,
  reparentNode,
  resizeRotated,
  resolveRect,
  setAnchor,
  type TreeNode,
  ungroupNode,
  updateNode,
  validatePage,
  validateRegistry,
  withFreeBox,
  withPhoneBox,
  withStyle,
} from "@midito-kitchen/core";
import { Render, type Renderer } from "@midito-kitchen/render";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isMoveableLayer, type ResizeResult, SelectionBox } from "./canvas/SelectionBox";
import styles from "./Editor.module.css";
import { isEditableTarget } from "./editable";
import { canRedo, canUndo, commit, createHistory, redo, undo } from "./history";
import { boxBetween, type Edges, touched } from "./marquee";
import { type PanelPatch, PropertiesPanel, type StylePatch } from "./PropertiesPanel";
import { pageWidthVariables } from "./page-width";
import { fitPicture, pictureSize, type UploadImage, uploadPicture } from "./upload-image";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
  /**
   * The page to open. It is read once, when the editor mounts: the editor keeps its own working copy
   * from then on, so a later change of this prop does not reset it (give the editor a new `key` to
   * open another page). It is opened with `migratePage`, so a page of an older version is upgraded,
   * and the editor throws for one it cannot open. Without it the editor opens an empty page.
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
  /**
   * The kinds of block a person can add. The editor starts with `builtInRegistry` and `components`
   * is put on top of it, so a host adds its own kinds, or replaces a built-in one, under its name.
   * `renderers` draws the kinds the host added, by name; a built-in kind is always drawn by the editor.
   * `uploadImage` adds an Upload image button to the toolbar: it is called with the file the person
   * chose and answers with the address of the uploaded picture (Cloudinary's `secure_url`, for
   * example), and an Image block showing it is added. The editor keeps no keys and no files, only
   * that address.
   */
  config?: {
    components?: Registry;
    renderers?: Readonly<Record<string, Renderer>>;
    uploadImage?: UploadImage;
  };
}

// Narrows `StylePatch` by its key, which TypeScript does not do on its own: `applyPatch` has two
// identical branches so that each call to `withStyle` sees a matching key and value type.
const isColourPatch = (
  patch: StylePatch,
): patch is Extract<StylePatch, { key: "background" | "borderColor" }> =>
  patch.key === "background" || patch.key === "borderColor";

/**
 * The free node with the placement `box` for this screen: its own placement on the desktop, the one
 * set by hand for the phone on a phone, so a change made on a phone leaves the desktop as it was.
 */
const withBoxFor = (node: FreeNode, device: Device, box: FreeBox): FreeNode =>
  device === "phone" ? withPhoneBox(node, box) : withFreeBox(node, box);

/** The node with the change of a patch applied. A rotation only changes a free node, on this screen. */
const applyPatch = (node: TreeNode, patch: PanelPatch, device: Device): TreeNode => {
  if (patch.key === "prop") {
    return node.props[patch.name] === patch.value
      ? node
      : { ...node, props: { ...node.props, [patch.name]: patch.value } };
  }
  if (patch.key === "rotation") {
    if (!isFreeNode(node)) return node;
    const box = boxFor(node, device);
    return box.rotation === patch.value
      ? node
      : withBoxFor(node, device, { ...box, rotation: patch.value });
  }
  return isColourPatch(patch)
    ? withStyle(node, patch.key, patch.value)
    : withStyle(node, patch.key, patch.value);
};

/** The page with a pending change applied, for drawing it or for storing it. */
const withDraft = (
  data: PageData,
  draft: PanelPatch & { id: string },
  device: Device,
): PageData => ({
  ...data,
  root: updateNode(data.root, draft.id, (n) => applyPatch(n, draft, device)),
});

/** The page the editor starts from: the host's, once it is checked, or an empty one. */
function openPage(data: PageData | undefined): PageData {
  if (data === undefined) return emptyPage();
  // A page of an older version is upgraded; anything else that cannot be opened is told apart.
  const opened = migratePage(data);
  if (!opened.ok) {
    const why = {
      "not-a-page": "it is not a page",
      "too-new": "it was made by a newer version",
      invalid: "it is not valid",
    }[opened.reason];
    throw new Error(
      `[midito] \`data\` is not a page this editor can open: ${why} (check it with migratePage)`,
    );
  }
  return opened.page;
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
  config,
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
  const [frame, setFrame] = useState<Device>("desktop");
  // Adding, deleting and grouping change the blocks every screen shares, so they are done on the desktop.
  const onPhone = frame === "phone";
  const components = config?.components;
  const registry = useMemo<Registry>(() => ({ ...builtInRegistry, ...components }), [components]);
  // A mistake in the host's kinds is told once per registry, and the editor goes on with it.
  useEffect(() => {
    for (const { type, key, code } of validateRegistry(registry)) {
      console.error(`[midito] config.components.${type}${key ? `.${key}` : ""}: ${code}`);
    }
  }, [registry]);
  // The kind the Add button makes. A kind that is no longer in the registry falls back to the first.
  const [kind, setKind] = useState("Text");
  // Kinds that are made another way (a group) are not offered.
  const addable = useMemo(
    () => Object.entries(registry).filter(([, def]) => def.hidden !== true),
    [registry],
  );
  const addKind = addable.some(([type]) => type === kind) ? kind : (addable[0]?.[0] ?? "");
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The block whose children a press selects: the page at the start, a group once it is entered.
  const [scopeId, setScopeId] = useState(data.root.id);
  // More blocks selected with Shift, besides `selectedId`. They are children of the same parent.
  // The panel and the handles are for `selectedId` only; the others are drawn with an outline.
  const [picked, setPicked] = useState<string[]>([]);
  // The block a dragged block would go into if it were dropped now. A hint only, not in the data.
  const [dropId, setDropId] = useState<string | null>(null);
  // The box a person is dragging out on the empty page to select the blocks it touches, in screen px.
  const [marquee, setMarquee] = useState<Edges | null>(null);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const gesture = useRef<{
    before: FreeNode;
    start: Rect;
    container: Container;
    /** Where the block was on the screen when the gesture began. */
    screen: DOMRect;
  } | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const [draft, setDraft] = useState<(PanelPatch & { id: string }) | null>(null);
  const shown = useMemo<PageData>(
    () => (draft ? withDraft(data, draft, frame) : data),
    [data, draft, frame],
  );
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;
  // The kind of the selected node, or `undefined` for one nobody registered.
  const selectedDef =
    selectedNode && Object.hasOwn(registry, selectedNode.type)
      ? registry[selectedNode.type]
      : undefined;

  // `<Render>` owns the elements, so look up the one for the selected node after every render.
  useLayoutEffect(() => {
    setBlock(workspace && selectedId ? elementOf(workspace, selectedId) : null);
  });

  // Mark the other selected blocks. The elements belong to `<Render>`, so the mark is put on after
  // each render and taken off again before the next. It is an inline style: every block has an
  // inline `all: revert`, which a class could never beat.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    if (!workspace) return;
    const marked = picked.flatMap((id) => elementOf(workspace, id) ?? []);
    for (const element of marked) {
      element.dataset.miditoPicked = "";
      element.style.outline = "2px solid var(--_focus)";
      element.style.outlineOffset = "1px";
    }
    return () => {
      for (const element of marked) {
        delete element.dataset.miditoPicked;
        element.style.removeProperty("outline");
        element.style.removeProperty("outline-offset");
      }
    };
  }, [workspace, picked, shown]);

  // Outline the block a drag would drop into. Inline, for the same reason as the mark above.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    const target = workspace && dropId ? elementOf(workspace, dropId) : null;
    if (!target) return;
    target.style.outline = "2px solid var(--_focus)";
    target.style.outlineOffset = "-2px";
    return () => {
      target.style.removeProperty("outline");
      target.style.removeProperty("outline-offset");
    };
  }, [workspace, dropId, shown]);

  /**
   * A drag from the empty page draws a box, and on release the blocks it touches are selected: the
   * first in tree order is the main one, the others are picked. They are the children of the page, or
   * with Shift of the parent of the selected block, to be added to it. A move under 4 px is a click.
   */
  const startMarquee = (event: PointerEvent<HTMLElement>) => {
    const from = { x: event.clientX, y: event.clientY };
    const add = event.shiftKey && selectedId !== null;
    const parent = (add ? parentOf(data.root, selectedId as string) : undefined) ?? data.root;
    const box = (e: { clientX: number; clientY: number }) =>
      boxBetween(from, { x: e.clientX, y: e.clientY });
    const dragged = (b: Edges) => b.right - b.left >= 4 || b.bottom - b.top >= 4;
    const move = (e: globalThis.PointerEvent) => {
      const b = box(e);
      setMarquee(dragged(b) ? b : null);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", stop);
      setMarquee(null);
    };
    const up = (e: globalThis.PointerEvent) => {
      stop();
      const b = box(e);
      if (!workspace || !dragged(b)) return;
      const items = parent.children.flatMap((child) => {
        const element = elementOf(workspace, child.id);
        return element ? [{ id: child.id, rect: element.getBoundingClientRect() }] : [];
      });
      const ids = touched(b, items);
      if (add && selectedId) {
        const more = ids.filter((id) => id !== selectedId && !picked.includes(id));
        setPicked((list) => [...list, ...more.filter((id) => !list.includes(id))]);
      } else if (ids.length > 0) {
        setSelectedId(ids[0] as string);
        setPicked(ids.slice(1));
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", stop);
  };

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
    // The outermost block of the scope that holds what was pressed, so a block in a group selects
    // the group. A press on the page or the grey around it selects nothing and starts again at the page.
    const hit = id === undefined ? undefined : pickBlock(data.root, scopeId, id);
    // A press on the empty page may turn into a box drag; a plain click still just clears (below).
    if (!hit) {
      startMarquee(event);
      // Shift keeps what is selected, so the box can add to it.
      if (event.shiftKey && selectedId) return;
    }
    // Shift adds a block to the selection, or takes it out, when it has the same parent as the one
    // selected: they are the blocks that can be grouped.
    if (event.shiftKey && selectedId && hit) {
      const sameParent = parentOf(data.root, hit.id)?.id === parentOf(data.root, selectedId)?.id;
      if (sameParent && hit.id !== selectedId) {
        setPicked((list) =>
          list.includes(hit.id) ? list.filter((other) => other !== hit.id) : [...list, hit.id],
        );
      }
      return;
    }
    setPicked([]);
    setSelectedId(hit?.id ?? null);
    setScopeId(hit?.scopeId ?? data.root.id);
    // A press on a node keeps the keyboard inside the editor, so that Esc reaches it. The editor's
    // own element takes the focus: it has no ring, unlike the scrolling canvas.
    if (hit) editorRoot.current?.focus({ preventScroll: true });
  };

  /**
   * A double press on the selected block goes into it: the block under the pointer, one level down,
   * is selected. The pointer is over moveable's box, so the block is looked for under it.
   */
  const enter = (event: MouseEvent<HTMLElement>) => {
    if (!selectedId) return;
    const under = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => !isMoveableLayer(element) && element.closest("[data-midito-id]"));
    const id = under?.closest<HTMLElement>("[data-midito-id]")?.dataset.miditoId;
    const hit = id === undefined ? undefined : pickBlock(data.root, selectedId, id);
    if (!hit) return;
    setSelectedId(hit.id);
    setScopeId(hit.scopeId);
  };

  /** Store one change on a node, once. The draft is over. */
  const commitPatch = (id: string, patch: PanelPatch) => {
    setDraft(null);
    setData((prev) => {
      const root = updateNode(prev.root, id, (n) => applyPatch(n, patch, frame));
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
      start: resolveRect(boxFor(node, frame), container),
      container,
      screen: block?.getBoundingClientRect() ?? new DOMRect(),
    };
  };

  /** Store the box a gesture ended in, once. `next` says which rect that is. */
  const endGesture = (next: (g: NonNullable<typeof gesture.current>) => Rect) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    const moved = inferBox(boxFor(g.before, frame), next(g), g.container);
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, g.before.id, (n) =>
        isFreeNode(n) ? withBoxFor(n, frame, moved) : n,
      ),
    }));
  };

  /**
   * The block a dragged block was dropped on, with the sizes to measure in, or `undefined` when it
   * stays in its parent: on the phone, over its own parent or over nothing, over a block that may not
   * hold it, or when either parent is turned (the maths ignore a turn).
   */
  const dropTarget = (g: NonNullable<typeof gesture.current>, dist: { x: number; y: number }) => {
    const from = block?.parentElement;
    if (onPhone || !block || !from) return undefined;
    const x = g.screen.left + g.screen.width / 2 + dist.x;
    const y = g.screen.top + g.screen.height / 2 + dist.y;
    // Topmost first, so the deepest block under the pointer is met before the ones around it.
    const under = block.ownerDocument
      .elementsFromPoint(x, y)
      .filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.dataset.miditoId !== undefined,
      );
    const hit = under.find((el) =>
      canMove(registry, data.root, g.before.id, el.dataset.miditoId as string),
    );
    const id = hit?.dataset.miditoId;
    if (!hit || id === undefined || id === parentOf(data.root, g.before.id)?.id) return undefined;
    const turned = (el: HTMLElement) => {
      const node = el.dataset.miditoId ? findNode(data.root, el.dataset.miditoId) : undefined;
      return node !== undefined && isFreeNode(node) && boxFor(node, frame).rotation !== 0;
    };
    if (turned(hit) || turned(from)) return undefined;
    const corner = (el: HTMLElement) => ({
      x: el.getBoundingClientRect().left + el.clientLeft,
      y: el.getBoundingClientRect().top + el.clientTop,
    });
    const [a, b] = [corner(from), corner(hit)];
    return {
      id,
      options: {
        from: g.container,
        to: { w: hit.clientWidth, h: hit.clientHeight },
        shift: { x: b.x - a.x, y: b.y - a.y },
      },
    };
  };

  /** Tell the page where a drag would drop, so the block there is outlined. Only a changed target is stored. */
  const dragMove = (dist: { x: number; y: number } | null) => {
    const g = gesture.current;
    setDropId(g && dist ? (dropTarget(g, dist)?.id ?? null) : null);
  };

  const endDrag = (dist: { x: number; y: number }) => {
    const g = gesture.current;
    const target = g ? dropTarget(g, dist) : undefined;
    if (!g || !target) {
      endGesture((done) => moveRect(done.start, dist, boxFor(done.before, frame).rotation));
      return;
    }
    gesture.current = null;
    const moved = inferBox(
      boxFor(g.before, frame),
      moveRect(g.start, dist, boxFor(g.before, frame).rotation),
      g.container,
    );
    // Moved in its old parent first, then carried into the new one where it stands.
    setData((prev) => {
      const placed = updateNode(prev.root, g.before.id, (n) =>
        isFreeNode(n) ? withBoxFor(n, frame, moved) : n,
      );
      return { ...prev, root: reparentNode(placed, g.before.id, target.id, target.options) };
    });
  };

  // Position maths ignore the rotation, so a turn only changes the angle: no `inferBox`.
  const endRotate = (dist: number) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    const rotation = normalizeAngle(boxFor(g.before, frame).rotation + dist);
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, g.before.id, (n) => {
        if (!isFreeNode(n)) return n;
        const box = boxFor(n, frame);
        return box.rotation === rotation ? n : withBoxFor(n, frame, { ...box, rotation });
      }),
    }));
  };

  /**
   * A new block of the chosen kind, selected. It goes inside the selected block when that kind lets
   * blocks in, and on the page otherwise, in the middle of whichever it goes into. A pending change
   * is stored first.
   */
  const addBlockOf = (kind: string, overrides?: NewNodeOverrides) => {
    if (onPhone) return;
    if (draft) commitPatch(draft.id, draft);
    const id = nextId(data.root);
    const sizeOf = (element: HTMLElement | null) => ({
      w: element?.clientWidth ?? 0,
      h: element?.clientHeight ?? 0,
    });
    const inside = selectedNode ? newNode(registry, kind, id, sizeOf(block), overrides) : undefined;
    const intoSelected =
      inside && selectedNode && canInsert(registry, data.root, selectedNode.id, inside);
    const parentId = intoSelected && selectedNode ? selectedNode.id : data.root.id;
    // The page as it is drawn now, to find its middle down the page.
    const page = workspace ? elementOf(workspace, data.root.id) : null;
    const node = intoSelected ? inside : newNode(registry, kind, id, sizeOf(page), overrides);
    if (!node) return;
    setData((prev) => ({ ...prev, root: insertNode(prev.root, parentId, node) }));
    setSelectedId(id);
    setPicked([]);
    setScopeId(parentId);
  };

  const addBlock = () => addBlockOf(addKind);

  // After an upload the editor may have moved on, so the block is added by the newest `addBlockOf`.
  const latestAdd = useRef(addBlockOf);
  latestAdd.current = addBlockOf;
  const chooser = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  /** Upload the chosen picture, then add an `Image` block that already shows it, in its own proportions. */
  const addPicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const upload = config?.uploadImage;
    if (!file || !upload) return;
    setAdding({ busy: true, error: null });
    const result = await uploadPicture(file, upload);
    if (!result.ok) {
      setAdding({ busy: false, error: result.error });
      return;
    }
    const natural = await pictureSize(result.url);
    const size = natural && fitPicture(natural);
    latestAdd.current("Image", { props: { src: result.url }, ...(size ? { size } : {}) });
    setAdding({ busy: false, error: null });
  };

  /** Anchor one axis of the selected free block another way; it stays where it is on the page. */
  const changeAnchor = (axis: "x" | "y", anchor: AxisAnchor) => {
    const parent = block?.parentElement;
    if (!selectedNode || !isFreeNode(selectedNode) || !parent) return;
    if (draft) commitPatch(draft.id, draft);
    const container = { w: parent.clientWidth, h: parent.clientHeight };
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, selectedNode.id, (n) => {
        if (!isFreeNode(n)) return n;
        const before = boxFor(n, frame);
        const after = setAnchor(before, axis, anchor, container);
        return after === before ? n : withBoxFor(n, frame, after);
      }),
    }));
  };

  /** The selected block gets its automatic phone placement again; the desktop one is not touched. */
  const resetPhone = () => {
    if (!selectedNode || !isFreeNode(selectedNode) || !selectedNode.phone) return;
    const id = selectedNode.id;
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, id, (n) => (isFreeNode(n) ? withPhoneBox(n, undefined) : n)),
    }));
  };

  /** The size of the parent of the selected block, which `groupNodes` and `ungroupNode` measure in. */
  const parentSize = () => {
    const parent = block?.parentElement;
    return parent ? { w: parent.clientWidth, h: parent.clientHeight } : undefined;
  };

  /** The selected block one place or all the way up or down among its siblings. Only the main one. */
  const reorderSelected = (to: Reorder) => {
    if (onPhone || !selectedId || selectedId === data.root.id) return;
    if (draft) commitPatch(draft.id, draft);
    setData((prev) => ({ ...prev, root: reorderNode(prev.root, selectedId, to) }));
  };

  /** A copy of each selected block, a little down and to the right, selected in place of them. */
  const duplicateSelected = () => {
    const container = parentSize();
    if (onPhone || !selectedId || selectedId === data.root.id || !container) return;
    if (draft) commitPatch(draft.id, draft);
    const options = { shift: { x: 16, y: 16 }, container };
    const originals = [selectedId, ...picked];
    // Each copy is made on the tree the one before left, so the ids the copies get are known now.
    const copies: string[] = [];
    let root = data.root;
    for (const id of originals) {
      const copy = nextId(root);
      const next = duplicateNode(root, id, options);
      if (next !== root) copies.push(copy);
      root = next;
    }
    if (copies.length === 0) return;
    setData((prev) => ({
      ...prev,
      root: originals.reduce((tree, id) => duplicateNode(tree, id, options), prev.root),
    }));
    setSelectedId(copies.at(-1) ?? null);
    setPicked(copies.slice(0, -1));
  };

  /** The selected blocks become one group, selected, where they were. */
  const groupSelected = () => {
    if (onPhone) return;
    const container = parentSize();
    if (!selectedId || picked.length === 0 || !container) return;
    if (draft) commitPatch(draft.id, draft);
    const ids = [selectedId, ...picked];
    const id = nextId(data.root);
    if (groupNodes(data.root, ids, id, container) === data.root) return;
    setData((prev) => ({ ...prev, root: groupNodes(prev.root, ids, id, container) }));
    setSelectedId(id);
    setPicked([]);
  };

  /** The selected group is gone and its blocks are selected, each where it was on the page. */
  const ungroupSelected = () => {
    if (onPhone) return;
    const container = parentSize();
    if (selectedNode?.type !== "Group" || !container) return;
    if (ungroupNode(data.root, selectedNode.id, container) === data.root) return;
    const members = selectedNode.children.map((child) => child.id);
    const id = selectedNode.id;
    setData((prev) => ({ ...prev, root: ungroupNode(prev.root, id, container) }));
    setSelectedId(members.at(-1) ?? null);
    setPicked(members.slice(0, -1));
  };

  /** The selected block and everything in it is gone. The root cannot be deleted. */
  const deleteBlock = () => {
    if (onPhone) return;
    if (!selectedId || selectedId === data.root.id) return;
    const gone = [selectedId, ...picked];
    setDraft(null);
    setData((prev) => ({
      ...prev,
      root: gone.reduce((root, id) => removeNode(root, id), prev.root),
    }));
    setSelectedId(null);
    setPicked([]);
  };

  /**
   * The selected blocks go on the clipboard, as text that only this editor reads. It is the browser's
   * own copy event, so no permission is needed and it works between tabs. A field keeps its own copy.
   */
  // How many times the text on the clipboard was pasted in a row, so each paste steps further.
  const pasted = useRef({ text: "", times: 0 });
  const copySelected = (event: ClipboardEvent) => {
    if (isEditableTarget(event.target) || !selectedId) return;
    const nodes = copyNodes(data.root, [selectedId, ...picked]);
    if (nodes.length === 0) return;
    event.clipboardData.setData("text/plain", clipboardText(nodes));
    pasted.current = { text: "", times: 0 };
    event.preventDefault();
  };

  /** Copy, then delete what was copied. */
  const cutSelected = (event: ClipboardEvent) => {
    if (onPhone || isEditableTarget(event.target) || !selectedId) return;
    copySelected(event);
    if (event.defaultPrevented) deleteBlock();
  };

  /**
   * The blocks on the clipboard are pasted next to the selected one, in its parent, a little down and
   * to the right, and selected. Text that is not ours, or has a kind or props the registry refuses, is
   * left to the browser. A page that is being edited for the phone does not take new blocks.
   */
  const pasteBlocks = (event: ClipboardEvent) => {
    if (onPhone || isEditableTarget(event.target) || !workspace) return;
    const text = event.clipboardData.getData("text/plain");
    const nodes = parseClipboard(text);
    if (!nodes) return;
    const holder = {
      schemaVersion: data.schemaVersion,
      root: { ...data.root, children: nodes },
    };
    if (validatePage(registry, holder).length > 0) return;
    event.preventDefault();
    if (draft) commitPatch(draft.id, draft);
    const parent = (selectedId ? parentOf(data.root, selectedId) : undefined) ?? data.root;
    const element = elementOf(workspace, parent.id);
    if (!element) return;
    const container = { w: element.clientWidth, h: element.clientHeight };
    // The same text pasted again goes another step further down and to the right.
    const times = pasted.current.text === text ? pasted.current.times + 1 : 1;
    const shift = { x: 16 * times, y: 16 * times };
    const done = pasteNodes(data.root, parent.id, nodes, { shift, container });
    if (done.ids.length === 0) return;
    pasted.current = { text, times };
    setData((prev) => ({
      ...prev,
      root: pasteNodes(prev.root, parent.id, nodes, { shift, container }).root,
    }));
    setSelectedId(done.ids[0] ?? null);
    setPicked(done.ids.slice(1));
    setScopeId(parent.id);
  };

  /** One step back or forward. What is still pending is dropped; the selection stays if its node does. */
  const step = (move: typeof undo) => {
    const next = move(history).present;
    setDraft(null);
    setSelectedId((id) => (id !== null && findNode(next.root, id) ? id : null));
    setPicked([]);
    setScopeId((id) => (findNode(next.root, id) ? id : next.root.id));
    setHistory(move);
  };

  const endResize = ({ w, h, handle }: ResizeResult) =>
    endGesture((g) => resizeRotated(g.start, boxFor(g.before, frame).rotation, handle, w, h));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it
    <div
      ref={editorRoot}
      className={rootClass}
      style={pageWidthVariables}
      data-midito-editor=""
      tabIndex={-1}
      onCopy={copySelected}
      onCut={cutSelected}
      onPaste={pasteBlocks}
      onKeyDown={(event) => {
        // A field keeps its own Esc and its own undo.
        if (isEditableTarget(event.target)) return;
        if (event.key === "Escape") {
          setDraft(null);
          // Inside a group, Esc selects the group and goes up a level; at the page it selects nothing.
          const scope = scopeId === data.root.id ? undefined : findNode(data.root, scopeId);
          setPicked([]);
          if (selectedId && scope) {
            setSelectedId(scope.id);
            setScopeId(parentOf(data.root, scope.id)?.id ?? data.root.id);
          } else {
            setSelectedId(null);
          }
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
        if (key === "d" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          duplicateSelected();
          return;
        }
        if (key === "g" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (event.shiftKey) ungroupSelected();
          else groupSelected();
          return;
        }
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
          <select
            className={`${styles.button} ${styles.secondary}`}
            aria-label="Kind of block to add"
            disabled={onPhone}
            value={addKind}
            onChange={(event) => setKind(event.target.value)}
          >
            {addable.map(([type, def]) => (
              <option key={type} value={type}>
                {def.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={onPhone}
            title={onPhone ? "Switch to Desktop to add blocks" : "Add a block"}
            onClick={addBlock}
          >
            Add
          </button>
          {config?.uploadImage && (
            <>
              <input ref={chooser} type="file" accept="image/*" hidden onChange={addPicture} />
              <button
                type="button"
                className={`${styles.button} ${styles.secondary}`}
                disabled={onPhone || adding.busy}
                title={onPhone ? "Switch to Desktop to add blocks" : "Upload a picture and add it"}
                onClick={() => chooser.current?.click()}
              >
                {adding.busy ? "Uploading…" : "Upload image"}
              </button>
              {adding.error && (
                <span role="alert" className={styles.addError}>
                  {adding.error}
                </span>
              )}
            </>
          )}
        </div>
        <div className={styles.group}>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={onPhone || !selectedId || picked.length === 0}
            title={
              onPhone
                ? "Switch to Desktop to group blocks"
                : "Group the selected blocks (Ctrl+G). Select more with Shift."
            }
            onClick={groupSelected}
          >
            Group
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={onPhone || selectedNode?.type !== "Group"}
            title="Ungroup (Shift+Ctrl+G)"
            onClick={ungroupSelected}
          >
            Ungroup
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.secondary}`}
            disabled={onPhone || !selectedId}
            title={onPhone ? "Switch to Desktop to duplicate blocks" : "Duplicate (Ctrl+D)"}
            onClick={duplicateSelected}
          >
            Duplicate
          </button>
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div className={styles.group} role="group" aria-label="Order">
          {(
            [
              ["front", "Front", "Bring to front"],
              ["forward", "Forward", "Bring forward"],
              ["backward", "Backward", "Send backward"],
              ["back", "Back", "Send to back"],
            ] as const
          ).map(([to, label, title]) => (
            <button
              key={to}
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              disabled={onPhone || !selectedId || selectedId === data.root.id}
              title={onPhone ? "Switch to Desktop to change the order" : title}
              onClick={() => reorderSelected(to)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
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
          <button
            type="button"
            className={`${styles.button} ${styles.primary} ${styles.save}`}
            onClick={() => {
              // A change that is still pending is stored first, and it is part of what is saved.
              const pending = draft;
              if (pending) commitPatch(pending.id, pending);
              onSave(pending ? withDraft(data, pending, frame) : data);
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
        onDoubleClick={enter}
      >
        <Render
          data={shown}
          device={frame}
          renderers={config?.renderers}
          className={frame === "phone" ? `${styles.page} ${styles.phone}` : styles.page}
        />
        {marquee && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: marquee.left,
              top: marquee.top,
              width: marquee.right - marquee.left,
              height: marquee.bottom - marquee.top,
              border: "1px solid var(--_focus)",
              background: "color-mix(in srgb, var(--_focus) 15%, transparent)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        )}
        <SelectionBox
          target={block}
          container={workspace}
          className={styles.selection}
          lockRatio={selectedDef?.lockRatio === true}
          minSize={minSize(selectedNode?.styles)}
          angle={
            selectedNode && isFreeNode(selectedNode) ? boxFor(selectedNode, frame).rotation : 0
          }
          onGestureStart={startGesture}
          onDragEnd={endDrag}
          onDragMove={dragMove}
          onResizeEnd={endResize}
          onRotateEnd={endRotate}
        />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties">
        <PropertiesPanel
          // A new panel for each node, so text typed for one is never applied to another.
          key={selectedNode?.id ?? "none"}
          node={selectedNode}
          device={frame}
          onResetPhone={resetPhone}
          canDelete={!onPhone}
          def={selectedDef}
          onPreview={(patch) => selectedNode && setDraft({ id: selectedNode.id, ...patch })}
          onCommit={(patch) => selectedNode && commitPatch(selectedNode.id, patch)}
          onDiscard={() => setDraft(null)}
          onDelete={deleteBlock}
          onAnchor={changeAnchor}
        />
      </aside>
    </div>
  );
}
