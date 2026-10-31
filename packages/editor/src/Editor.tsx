import {
  type AlignTo,
  type AxisAnchor,
  alignRects,
  boxFor,
  builtInRegistry,
  type Container,
  canInsert,
  canMove,
  clipboardText,
  colorRef,
  copyNodes,
  type Device,
  distributeRects,
  duplicateNode,
  emptyPage,
  type Frame,
  type FreeBox,
  type FreeNode,
  findNode,
  groupNodes,
  inferBox,
  insertNode,
  isFreeNode,
  isTheme,
  keepsRatio,
  migratePage,
  minSize,
  moveRect,
  type NewNodeOverrides,
  newNode,
  nextId,
  normalizeAngle,
  type PageData,
  type PageMeta,
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
  replaceColor,
  resizeRotated,
  resolveRect,
  setAnchor,
  type Theme,
  type TreeNode,
  tidyMeta,
  turnOf,
  ungroupNode,
  updateNode,
  validatePage,
  validateRegistry,
  withFreeBox,
  withLockRatio,
  withPhoneBox,
  withPhoneProp,
  withRect,
  withStyle,
} from "@midito-kitchen/core";
import { Render, type Renderer } from "@midito-kitchen/render";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AssetsPanel } from "./AssetsPanel";
import type { ActionDef } from "./actions";
import { BlocksPanel } from "./BlocksPanel";
import { isMoveableLayer, type ResizeResult, SelectionBox } from "./canvas/SelectionBox";
import { createDebounce } from "./debounce";
import styles from "./Editor.module.css";
import { isEditableTarget } from "./editable";
import { canRedo, canUndo, commit, createHistory, redo, undo } from "./history";
import { InlineEdit } from "./InlineEdit";
import { Icon } from "./icons";
import { boxBetween, type Edges, touched } from "./marquee";
import { type PanelPatch, PropertiesPanel, type StylePatch } from "./PropertiesPanel";
import { pageWidthVariables } from "./page-width";
import { QuickActions } from "./QuickActions";
import { resolveStatus, type SaveStatus, STATUS_TEXT } from "./save-status";
import { ThemePanel } from "./ThemePanel";
import { fitPicture, pictureSize, type UploadImage, uploadPicture } from "./upload-image";
import { fitZoom, MAX_ZOOM, MIN_ZOOM, stageWidth, stepZoom, zoomText } from "./zoom";

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
   * How long to wait, in ms, after the last change before `onChange` is called, so a run of changes
   * is one call with the latest page. Without it, or with 0, `onChange` is called at once for each
   * change. A change that is still waiting is called when the editor unmounts, so none is lost. Give
   * an object to also set `maxWait`: the longest a change may wait while more keep coming.
   */
  onChangeDebounce?: number | { wait: number; maxWait?: number };
  /**
   * How the host is storing the page, for the header to say so: "saved", "unsaved", "saving" or
   * "error". Without it the header follows the Save button (and shows nothing when there is none).
   * A change that is still waiting for its delayed `onChange` shows as unsaved, whatever this says,
   * and the Save button is off while the status is "saving".
   */
  status?: SaveStatus;
  /**
   * Called when the person presses Save, with the page as it is stored (a field that is being typed
   * in is applied first). Sending it to a back end is the host's job. The Save button only shows
   * when this is given.
   */
  onSave?: (data: PageData) => void | Promise<void>;
  /**
   * Extra controls of the host for the right end of the header, before Save: a link to a preview, a
   * Publish button. The editor draws them as given and styles nothing of them.
   */
  headerActions?: ReactNode;
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
   * `uploadImage` adds an Upload image button to the Assets panel: it is called with the file the person
   * chose and answers with the address of the uploaded picture (Cloudinary's `secure_url`, for
   * example), and an Image block showing it is added. The editor keeps no keys and no files, only
   * that address.
   */
  config?: {
    components?: Registry;
    renderers?: Readonly<Record<string, Renderer>>;
    uploadImage?: UploadImage;
    /**
     * What a button can do. With any, a button's properties get an Action field to choose from them
     * and a field for each value the action asks for; without, a button has only its link. The page
     * stores the name and the values, and `<Render onAction>` hands them to the host.
     */
    actions?: readonly ActionDef[];
    /** The theme of a new page, for a host that has its own colours and fonts. */
    theme?: Theme;
  };
}

/**
 * The node with one style set. A switch, not one call: each case hands `withStyle` a key and a value
 * that TypeScript can tell go together.
 */
const withStylePatch = (node: TreeNode, patch: StylePatch): TreeNode => {
  switch (patch.key) {
    case "background":
    case "borderColor":
      return withStyle(node, patch.key, patch.value);
    case "borderWidth":
    case "borderRadius":
      return withStyle(node, patch.key, patch.value);
    case "backgroundImage":
      return withStyle(node, "backgroundImage", patch.value);
    case "backgroundSize":
      return withStyle(node, "backgroundSize", patch.value);
    case "backgroundPosition":
      return withStyle(node, "backgroundPosition", patch.value);
    case "backgroundRepeat":
      return withStyle(node, "backgroundRepeat", patch.value);
  }
};

/**
 * The free node with the placement `box` for this screen: its own placement on the desktop, the one
 * set by hand for the phone on a phone, so a change made on a phone leaves the desktop as it was.
 */
const withBoxFor = (node: FreeNode, device: Device, box: FreeBox): FreeNode =>
  device === "phone" ? withPhoneBox(node, box) : withFreeBox(node, box);

/** The node with the change of a patch applied. A rotation only changes a free node, on this screen. */
const applyPatch = (
  node: TreeNode,
  patch: PanelPatch,
  device: Device,
  registry: Registry,
): TreeNode => {
  if (patch.key === "prop") {
    // A prop marked perDevice is kept apart for the phone, so the desktop keeps its own value.
    const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
    const field = def && Object.hasOwn(def.fields, patch.name) ? def.fields[patch.name] : undefined;
    if (device === "phone" && field?.perDevice === true) {
      return withPhoneProp(node, patch.name, patch.value);
    }
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
  if (patch.key === "lockRatio") {
    return isFreeNode(node) ? withLockRatio(node, patch.value) : node;
  }
  if (patch.key === "phoneLayout") {
    // The phone starts from the placement it has now, which is made from the desktop one.
    return isFreeNode(node) && !node.phone ? withPhoneBox(node, boxFor(node, "phone")) : node;
  }
  return withStylePatch(node, patch);
};

/** The page with a pending change applied, for drawing it or for storing it. */
const withDraft = (
  data: PageData,
  draft: PanelPatch & { id: string },
  device: Device,
  registry: Registry,
): PageData => ({
  ...data,
  root: updateNode(data.root, draft.id, (n) => applyPatch(n, draft, device, registry)),
});

/** The theme without what is empty in it, or `undefined` when nothing is left. */
function tidyTheme(theme: Theme): Theme | undefined {
  const colors = theme.colors && Object.keys(theme.colors).length > 0 ? theme.colors : undefined;
  const fonts = theme.fonts && Object.keys(theme.fonts).length > 0 ? theme.fonts : undefined;
  return colors || fonts
    ? { ...(colors ? { colors } : {}), ...(fonts ? { fonts } : {}) }
    : undefined;
}

/** The page with this theme, or without one when it is empty. */
function withTheme(data: PageData, theme: Theme): PageData {
  const { theme: _old, ...rest } = data;
  const next = tidyTheme(theme);
  return next ? { ...rest, theme: next } : rest;
}

/**
 * The page the editor starts from: the host's, once it is checked, or an empty one, which has the
 * theme the host gave when that is a good one.
 */
function openPage(data: PageData | undefined, theme?: Theme): PageData {
  if (data === undefined)
    return theme && isTheme(theme) ? withTheme(emptyPage(), theme) : emptyPage();
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
  onChangeDebounce,
  status,
  onSave,
  headerActions,
  historyLimit,
  config,
}: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const [history, setHistory] = useState(() => createHistory(openPage(initialData, config?.theme)));
  const data = history.present;
  // The page as it was when it was last saved (or opened), to say whether there is more than that.
  const [savedPage, setSavedPage] = useState(data);
  // A save that stored a pending change first: the page it saved is the one that change makes.
  const marking = useRef(false);
  useEffect(() => {
    if (marking.current) {
      marking.current = false;
      setSavedPage(data);
    }
  }, [data]);
  /** Store a change as one step. */
  const setData = (change: (prev: PageData) => PageData) =>
    setHistory((h) => commit(h, change(h.present), historyLimit));
  // The page the host already has, so that `onChange` is called for a change and only once for it.
  const notified = useRef(data);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const wait =
    typeof onChangeDebounce === "number" ? onChangeDebounce : (onChangeDebounce?.wait ?? 0);
  const maxWait = typeof onChangeDebounce === "object" ? onChangeDebounce.maxWait : undefined;
  // Whether a change waits for its delayed `onChange`, so the header does not call it saved.
  const [waiting, setWaiting] = useState(false);
  const debounced = useMemo(
    () =>
      createDebounce<PageData>(
        (page) => {
          setWaiting(false);
          onChangeRef.current?.(page);
        },
        wait,
        maxWait,
      ),
    [wait, maxWait],
  );
  // The canvas zoom. Under 100% the page shows smaller, over it larger; its blocks keep their own px.
  const [zoom, setZoom] = useState(1);
  const [stageBox, setStageBox] = useState({ room: 0, page: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  // A change that waits is not lost when the editor goes away or the delay changes.
  useEffect(() => () => debounced.flush(), [debounced]);
  useEffect(() => {
    if (data === notified.current) return;
    notified.current = data;
    debounced.push(data);
    setWaiting(debounced.pending());
  }, [data, debounced]);
  const headerStatus = resolveStatus(status, {
    hasSave: onSave !== undefined,
    clean: data === savedPage,
    waiting,
  });
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
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The panel on the left shows the theme of the page instead of the blocks to add. The panel on the
  // right keeps the properties of the selected block, so both can be used together.
  const [tool, setTool] = useState<"blocks" | "assets" | "theme">("blocks");
  // Whether the panel of the tool is open. A narrow screen starts without it, to leave room for the page.
  const [panelOpen, setPanelOpen] = useState(
    () => typeof window === "undefined" || !window.matchMedia?.("(max-width: 1100px)").matches,
  );
  /** A tool of the rail: the panel shows it, and pressing the one that is shown shuts the panel. */
  const pickTool = (id: "blocks" | "assets" | "theme") => {
    if (id === tool && panelOpen) {
      setPanelOpen(false);
      return;
    }
    setTool(id);
    setPanelOpen(true);
  };
  // The words of a block being typed on the block itself, which block and which of its props.
  const [editing, setEditing] = useState<{ id: string; prop: string; multiline: boolean } | null>(
    null,
  );
  // The block whose children a press selects: the page at the start, a group once it is entered.
  const [scopeId, setScopeId] = useState(data.root.id);
  // More blocks selected with Shift, besides `selectedId`. They are children of the same parent.
  // The panel and the handles are for `selectedId` only; the others are drawn with an outline.
  const [picked, setPicked] = useState<string[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // The block a dragged block would go into if it were dropped now. A hint only, not in the data.
  const [dropId, setDropId] = useState<string | null>(null);
  // The box a person is dragging out on the empty page to select the blocks it touches, in screen px.
  const [marquee, setMarquee] = useState<Edges | null>(null);
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  // What the zoomed stage needs to know: the room the workspace has, the width the page has at
  // 100% and the height of the stage before it is scaled. Measured again when any of them changes.
  useEffect(() => {
    const box = stage.current;
    if (!workspace || !box || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const look = getComputedStyle(workspace);
      const room =
        workspace.clientWidth - parseFloat(look.paddingLeft) - parseFloat(look.paddingRight);
      const page = box.querySelector<HTMLElement>("[data-midito-render]");
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
  const [block, setBlock] = useState<HTMLElement | null>(null);
  const gesture = useRef<{
    before: FreeNode;
    start: Rect;
    container: Container;
    /** Where the block was on the screen when the gesture began. */
    screen: DOMRect;
    /** The other selected blocks, which a drag moves along. */
    others: { before: FreeNode; start: Rect }[];
  } | null>(null);
  const editorRoot = useRef<HTMLDivElement>(null);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const [draft, setDraft] = useState<(PanelPatch & { id: string }) | null>(null);
  const shown = useMemo<PageData>(
    () => (draft ? withDraft(data, draft, frame, registry) : data),
    [data, draft, frame, registry],
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

  // The block a press would select, outlined while the pointer rests on it, like a design tool does.
  // Inline, for the same reason as the marks above: the block's own `all: revert` beats a rule.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    const target = workspace && hoverId ? elementOf(workspace, hoverId) : null;
    if (!target) return;
    const colour = "color-mix(in srgb, var(--_focus) 70%, transparent)";
    target.style.outline = `2px solid ${colour}`;
    target.style.outlineOffset = "-1px";
    // The outline fades in, so moving across the page reads as a soft trail and not a flicker.
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      target.animate?.([{ outlineColor: "transparent" }, { outlineColor: colour }], {
        duration: 120,
        easing: "ease-out",
      });
    }
    return () => {
      target.style.removeProperty("outline");
      target.style.removeProperty("outline-offset");
    };
  }, [workspace, hoverId, shown]);

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

  /** The pointer moved over the canvas: the block a press here would select is the one to outline. */
  const hover = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    let next: string | null = null;
    // Nothing is outlined while a button is down (a drag, a box) or over the selected block's handles.
    if (event.buttons === 0 && !editing && !isMoveableLayer(target)) {
      const id = target.closest<HTMLElement>("[data-midito-id]")?.dataset.miditoId;
      const hit = id === undefined ? undefined : pickBlock(data.root, scopeId, id);
      if (hit && hit.id !== data.root.id && hit.id !== selectedId && !picked.includes(hit.id)) {
        next = hit.id;
      }
    }
    setHoverId((now) => (now === next ? now : next));
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
    // A block whose kind has words to type on it opens them, when the pointer is over that block.
    const edit = selectedDef?.inlineText;
    const own = workspace ? elementOf(workspace, selectedId) : null;
    if (edit && own) {
      const rect = own.getBoundingClientRect();
      const over =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (over) {
        if (draft) commitPatch(draft.id, draft);
        setEditing({ id: selectedId, prop: edit.prop, multiline: edit.multiline === true });
        return;
      }
    }
    const under = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => !isMoveableLayer(element) && element.closest("[data-midito-id]"));
    const id = under?.closest<HTMLElement>("[data-midito-id]")?.dataset.miditoId;
    const hit = id === undefined ? undefined : pickBlock(data.root, selectedId, id);
    if (!hit) return;
    setSelectedId(hit.id);
    setScopeId(hit.scopeId);
  };

  /** One field of the page info changed: stored as one step of history. An emptied field is removed. */
  const changeMeta = (patch: Partial<Record<keyof PageMeta, string | undefined>>) =>
    setData((prev) => {
      const merged: PageMeta = { ...prev.meta };
      for (const [key, value] of Object.entries(patch) as [keyof PageMeta, string | undefined][]) {
        if (value === undefined) delete merged[key];
        else merged[key] = value;
      }
      const { meta: _old, ...rest } = prev;
      const next = tidyMeta(merged);
      return next ? { ...rest, meta: next } : rest;
    });

  /** Store one change on a node, once. The draft is over. */
  const commitPatch = (id: string, patch: PanelPatch) => {
    setDraft(null);
    setData((prev) => {
      const root = updateNode(prev.root, id, (n) => applyPatch(n, patch, frame, registry));
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
      others: picked.flatMap((id) => {
        const other = findNode(data.root, id);
        return other && isFreeNode(other)
          ? [{ before: other, start: resolveRect(boxFor(other, frame), container) }]
          : [];
      }),
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
   * hold it. A parent may be turned: both are measured as frames.
   */
  const dropTarget = (g: NonNullable<typeof gesture.current>, dist: { x: number; y: number }) => {
    const from = block?.parentElement;
    if (onPhone || !block || !from || g.others.length > 0) return undefined;
    // `dist` is in the page's own px; the screen is `zoom` times that.
    const x = g.screen.left + g.screen.width / 2 + dist.x * zoom;
    const y = g.screen.top + g.screen.height / 2 + dist.y * zoom;
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
    // Each parent as a frame on the screen: its padding box, where its middle is (the middle of a
    // turned element is the middle of the box around it) and how far it and its parents are turned.
    const frameOf = (el: HTMLElement): Frame => {
      const box = el.getBoundingClientRect();
      return {
        size: { w: el.clientWidth, h: el.clientHeight },
        center: { x: (box.left + box.width / 2) / zoom, y: (box.top + box.height / 2) / zoom },
        rotation: turnOf(data.root, el.dataset.miditoId ?? "", frame),
      };
    };
    return { id, options: { from: frameOf(from), to: frameOf(hit) } };
  };

  /** Tell the page where a drag would drop, so the block there is outlined. Only a changed target is stored. */
  const dragMove = (dist: { x: number; y: number } | null) => {
    const g = gesture.current;
    setDropId(g && dist ? (dropTarget(g, dist)?.id ?? null) : null);
  };

  const endDrag = (dist: { x: number; y: number }) => {
    const g = gesture.current;
    if (g && g.others.length > 0) {
      // Several blocks: all move by the same distance on the screen, and stay in their parent.
      gesture.current = null;
      const turn = boxFor(g.before, frame).rotation;
      const all = [{ before: g.before, start: g.start }, ...g.others];
      setData((prev) => ({
        ...prev,
        root: all.reduce(
          (root, { before, start }) =>
            updateNode(root, before.id, (n) =>
              isFreeNode(n)
                ? withBoxFor(
                    n,
                    frame,
                    inferBox(boxFor(before, frame), moveRect(start, dist, turn), g.container),
                  )
                : n,
            ),
          prev.root,
        ),
      }));
      return;
    }
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
    if (!selectedNode) return;
    const placed = isFreeNode(selectedNode) && selectedNode.phone !== undefined;
    if (!placed && !selectedNode.phoneProps) return;
    const id = selectedNode.id;
    setData((prev) => ({
      ...prev,
      root: updateNode(prev.root, id, (n) =>
        Object.keys(n.phoneProps ?? {}).reduce(
          (node, name) => withPhoneProp(node, name, undefined),
          isFreeNode(n) ? withPhoneBox(n, undefined) : n,
        ),
      ),
    }));
  };

  /** The size of the parent of the selected block, which `groupNodes` and `ungroupNode` measure in. */
  const parentSize = () => {
    const parent = block?.parentElement;
    return parent ? { w: parent.clientWidth, h: parent.clientHeight } : undefined;
  };

  /**
   * The selected blocks moved by `make`, which is given where they are in their parent and answers
   * where they should be. One history step. Only free blocks have a place to change.
   */
  const arrange = (make: (rects: Rect[], container: { w: number; h: number }) => Rect[]) => {
    const container = parentSize();
    if (!selectedId || selectedId === data.root.id || !container) return;
    if (draft) commitPatch(draft.id, draft);
    const ids = [selectedId, ...picked];
    setData((prev) => {
      const nodes = ids.flatMap((id) => {
        const node = findNode(prev.root, id);
        return node && isFreeNode(node) ? [node] : [];
      });
      if (nodes.length === 0) return prev;
      const next = make(
        nodes.map((node) => resolveRect(boxFor(node, frame), container)),
        container,
      );
      const root = nodes.reduce(
        (tree, node, i) =>
          updateNode(tree, node.id, (current) =>
            isFreeNode(current) && next[i]
              ? withBoxFor(current, frame, inferBox(boxFor(current, frame), next[i], container))
              : current,
          ),
        prev.root,
      );
      return root === prev.root ? prev : { ...prev, root };
    });
  };

  /** Line the selected blocks up with each other, or one block with its parent. */
  const alignSelected = (to: AlignTo) =>
    arrange((rects, container) =>
      alignRects(
        rects,
        to,
        picked.length === 0 ? { x: 0, y: 0, w: container.w, h: container.h } : undefined,
      ),
    );

  /** Equal gaps between three or more selected blocks. */
  const distributeSelected = (axis: "x" | "y") => {
    if (picked.length < 2) return;
    arrange((rects) => distributeRects(rects, axis));
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

  // The theme, one step of history for each change. A colour that goes is baked into the blocks that
  // used it, and one that is renamed is followed by them.
  const setThemeColor = (name: string, color: string) =>
    setData((prev) =>
      withTheme(prev, {
        ...prev.theme,
        colors: { ...prev.theme?.colors, [name]: color },
      }),
    );
  const renameThemeColor = (from: string, to: string) =>
    setData((prev) => {
      const colors = Object.fromEntries(
        Object.entries(prev.theme?.colors ?? {}).map(([key, value]) => [
          key === from ? to : key,
          value,
        ]),
      );
      const renamed = withTheme(prev, { ...prev.theme, colors });
      return { ...renamed, root: replaceColor(renamed.root, registry, from, colorRef(to)) };
    });
  const deleteThemeColor = (name: string) =>
    setData((prev) => {
      const { [name]: gone, ...colors } = prev.theme?.colors ?? {};
      const kept = withTheme(prev, { ...prev.theme, colors });
      return gone === undefined
        ? kept
        : { ...kept, root: replaceColor(kept.root, registry, name, gone) };
    });
  const setThemeFont = (which: "body" | "heading", stack: string | undefined) =>
    setData((prev) => {
      const { [which]: _old, ...others } = prev.theme?.fonts ?? {};
      return withTheme(prev, {
        ...prev.theme,
        fonts: stack === undefined ? others : { ...others, [which]: stack },
      });
    });

  /**
   * A number of the rect of the selected block was typed: x, y, width or height. `withRect` works out
   * the placement for this screen, with the proportions kept when the block keeps them, and one that
   * changes nothing stores nothing.
   */
  const setRect = (field: "x" | "y" | "w" | "h", value: number) => {
    const container = parentSize();
    if (!selectedNode || !isFreeNode(selectedNode) || !container) return;
    if (draft) commitPatch(draft.id, draft);
    const id = selectedNode.id;
    const options = {
      minSize: minSize(selectedNode.styles),
      lockRatio: keepsRatio(selectedNode, selectedDef),
    };
    setData((prev) => {
      const root = updateNode(prev.root, id, (n) => {
        if (!isFreeNode(n)) return n;
        const before = boxFor(n, frame);
        const after = withRect(before, { [field]: value }, container, options);
        return after === before ? n : withBoxFor(n, frame, after);
      });
      return root === prev.root ? prev : { ...prev, root };
    });
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

  // The block whose words are being typed, the element that draws it, and the limit of the field.
  const editingNode = editing ? findNode(data.root, editing.id) : undefined;
  const editingElement = editing && workspace ? elementOf(workspace, editing.id) : null;
  const editingDef =
    editingNode && Object.hasOwn(registry, editingNode.type)
      ? registry[editingNode.type]
      : undefined;
  const editingField = editing && editingDef ? editingDef.fields[editing.prop] : undefined;
  const editingLimit = editingField?.type === "text" ? editingField.maxLength : undefined;
  // A block that is gone (undone, say) ends the edit.
  useEffect(() => {
    if (editing && !editingNode) setEditing(null);
  }, [editing, editingNode]);
  // The words of the block are hidden while they are typed over it, so they are not seen twice.
  useLayoutEffect(() => {
    if (!editingElement) return;
    const before = editingElement.style.color;
    editingElement.style.color = "transparent";
    return () => {
      editingElement.style.color = before;
    };
  }, [editingElement]);

  // Where the selected block is on this screen, in its parent's px: what the number fields show.
  const parentOfSelected = parentSize();
  const selectedRect =
    selectedNode && isFreeNode(selectedNode) && parentOfSelected
      ? resolveRect(boxFor(selectedNode, frame), parentOfSelected)
      : undefined;

  const endResize = ({ w, h, handle }: ResizeResult) =>
    endGesture((g) => resizeRotated(g.start, boxFor(g.before, frame).rotation, handle, w, h));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it
    <div
      ref={editorRoot}
      className={rootClass}
      style={pageWidthVariables}
      data-midito-editor=""
      data-panel={panelOpen ? "open" : "closed"}
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
        if ((event.ctrlKey || event.metaKey) && ["=", "+", "-", "0"].includes(event.key)) {
          // The browser's own page zoom would scale the whole editor; here it is the canvas.
          event.preventDefault();
          setZoom((z) => (event.key === "0" ? 1 : stepZoom(z, event.key === "-" ? -1 : 1)));
          return;
        }
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
        <div className={styles.toolbarStart}>
          <span className={styles.logo} aria-hidden="true">
            M
          </span>
          <button
            type="button"
            className={`${styles.button} ${styles.ghost} ${styles.icon}`}
            aria-label="Undo"
            disabled={!canUndo(history)}
            title="Undo (Ctrl+Z)"
            onClick={() => step(undo)}
          >
            <Icon name="undo" size={18} />
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.ghost} ${styles.icon}`}
            aria-label="Redo"
            disabled={!canRedo(history)}
            title="Redo (Shift+Ctrl+Z)"
            onClick={() => step(redo)}
          >
            <Icon name="redo" size={18} />
          </button>
          {headerStatus && (
            <span className={styles.status} role="status" data-state={headerStatus}>
              {STATUS_TEXT[headerStatus]}
            </span>
          )}
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div className={styles.segmented} role="group" aria-label="Frame">
          <button
            type="button"
            className={styles.segment}
            aria-pressed={frame === "desktop"}
            onClick={() => setFrame("desktop")}
          >
            <Icon name="desk" />
            Desktop
          </button>
          <button
            type="button"
            className={styles.segment}
            aria-pressed={frame === "phone"}
            onClick={() => setFrame("phone")}
          >
            <Icon name="phone" />
            Phone
          </button>
        </div>
        <div className={styles.toolbarEnd}>
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
          <div className={styles.zoomBar} role="group" aria-label="Zoom">
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.icon}`}
              aria-label="Zoom out"
              title="Zoom out (Ctrl or Cmd and -)"
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((z) => stepZoom(z, -1))}
            >
              −
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.zoomValue}`}
              title="Back to 100% (Ctrl or Cmd and 0)"
              onClick={() => setZoom(1)}
            >
              {zoomText(zoom)}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.icon}`}
              aria-label="Zoom in"
              title="Zoom in (Ctrl or Cmd and +)"
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((z) => stepZoom(z, 1))}
            >
              +
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.ghost}`}
              title="Make the whole page fit the canvas"
              onClick={() => {
                const look = workspace ? getComputedStyle(workspace) : undefined;
                const roomHeight = workspace
                  ? workspace.clientHeight -
                    Number.parseFloat(look?.paddingTop ?? "0") -
                    Number.parseFloat(look?.paddingBottom ?? "0")
                  : 0;
                setZoom(fitZoom(stageBox.room, stageBox.page, roomHeight, stageBox.height));
              }}
            >
              Fit
            </button>
          </div>
          {headerActions}
          {onSave && (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={status === "saving"}
              onClick={() => {
                // A change that is still pending is stored first, and it is part of what is saved.
                const pending = draft;
                if (pending) {
                  marking.current = true;
                  commitPatch(pending.id, pending);
                } else {
                  setSavedPage(data);
                }
                onSave(pending ? withDraft(data, pending, frame, registry) : data);
              }}
            >
              Save
            </button>
          )}
        </div>
      </header>
      <nav className={styles.rail} aria-label="Tools">
        {(
          [
            ["blocks", "Blocks", "grid"],
            ["assets", "Assets", "img"],
            ["theme", "Theme", "palette"],
          ] as const
        ).map(([id, name, icon]) => (
          <button
            key={id}
            type="button"
            className={styles.railButton}
            aria-current={tool === id && panelOpen ? "true" : undefined}
            title={tool === id && panelOpen ? `Hide ${name}` : name}
            onClick={() => pickTool(id)}
          >
            <Icon name={icon} size={18} />
            {name}
          </button>
        ))}
      </nav>
      <aside
        className={`${styles.panel} ${styles.start}`}
        aria-label={tool === "theme" ? "Page theme" : tool === "assets" ? "Assets" : "Blocks"}
      >
        {tool === "theme" && (
          <ThemePanel
            theme={data.theme}
            onSetColor={setThemeColor}
            onRenameColor={renameThemeColor}
            onDeleteColor={deleteThemeColor}
            onSetFont={setThemeFont}
          />
        )}
        {tool === "assets" && (
          <>
            <input ref={chooser} type="file" accept="image/*" hidden onChange={addPicture} />
            <AssetsPanel
              page={data.root}
              theme={data.theme}
              disabled={onPhone}
              upload={
                config?.uploadImage
                  ? {
                      busy: adding.busy,
                      error: adding.error,
                      onChoose: () => chooser.current?.click(),
                    }
                  : undefined
              }
              uploadImage={config?.uploadImage}
              meta={data.meta}
              onMeta={changeMeta}
              onPreview={(patch) => setDraft({ id: data.root.id, ...patch })}
              onCommit={(patch) => commitPatch(data.root.id, patch)}
            />
          </>
        )}
        {tool === "blocks" && (
          <BlocksPanel registry={registry} disabled={onPhone} onAdd={(type) => addBlockOf(type)} />
        )}
      </aside>
      <section
        ref={setWorkspace}
        className={styles.workspace}
        aria-label="Canvas"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard
        tabIndex={0}
        onPointerDown={press}
        onPointerMove={hover}
        onPointerLeave={() => setHoverId(null)}
        onDoubleClick={enter}
      >
        <div
          className={styles.zoomOuter}
          style={
            zoom === 1
              ? undefined
              : {
                  inlineSize: stageWidth(stageBox.room, stageBox.page, zoom) * zoom,
                  blockSize: stageBox.height * zoom,
                  marginInline: "auto",
                }
          }
        >
          <div
            ref={stage}
            className={styles.zoomOuter}
            style={
              zoom === 1
                ? undefined
                : ({
                    inlineSize: stageWidth(stageBox.room, stageBox.page, zoom),
                    // Its own height, not the scaled one the outer box has, or each measure would grow it.
                    flex: "none",
                    transform: `scale(${zoom})`,
                    transformOrigin: "0 0",
                    "--_zoom-page": `${stageBox.page}px`,
                  } as CSSProperties)
            }
          >
            <Render
              data={shown}
              device={frame}
              links="inert"
              renderers={config?.renderers}
              className={frame === "phone" ? `${styles.page} ${styles.phone}` : styles.page}
            />
          </div>
        </div>
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
        {editing && editingElement && editingNode && (
          <InlineEdit
            element={editingElement}
            value={String(editingNode.props[editing.prop] ?? "")}
            multiline={editing.multiline}
            maxLength={editingLimit}
            rotation={turnOf(data.root, editing.id, frame)}
            zoom={zoom}
            onDone={(value) => {
              setEditing(null);
              if (editingNode.props[editing.prop] !== value) {
                commitPatch(editing.id, { key: "prop", name: editing.prop, value });
              }
            }}
            onCancel={() => setEditing(null)}
          />
        )}
        {block && workspace && !editing && selectedId && selectedId !== data.root.id && (
          <QuickActions
            target={block}
            workspace={workspace}
            disabled={onPhone}
            canGroup={picked.length > 0}
            canUngroup={selectedNode?.type === "Group"}
            onForward={() => reorderSelected("forward")}
            onBackward={() => reorderSelected("backward")}
            onDuplicate={duplicateSelected}
            onDelete={deleteBlock}
            onGroup={groupSelected}
            onUngroup={ungroupSelected}
            onFront={() => reorderSelected("front")}
            onBack={() => reorderSelected("back")}
          />
        )}
        <SelectionBox
          target={editing ? null : block}
          container={workspace}
          className={styles.selection}
          companions={picked.flatMap((id) => (workspace ? (elementOf(workspace, id) ?? []) : []))}
          lockRatio={selectedNode ? keepsRatio(selectedNode, selectedDef) : false}
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
          selectedCount={1 + picked.length}
          onAlign={alignSelected}
          onDistribute={distributeSelected}
          actions={config?.actions}
          def={selectedDef}
          onPreview={(patch) => selectedNode && setDraft({ id: selectedNode.id, ...patch })}
          onCommit={(patch) => selectedNode && commitPatch(selectedNode.id, patch)}
          onDiscard={() => setDraft(null)}
          onAnchor={changeAnchor}
          rect={selectedRect}
          onRect={setRect}
          theme={data.theme}
          uploadImage={config?.uploadImage}
        />
      </aside>
    </div>
  );
}
