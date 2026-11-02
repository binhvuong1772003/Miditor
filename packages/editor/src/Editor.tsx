import {
  boxFor,
  builtInRegistry,
  canInsert,
  clipboardText,
  copyNodes,
  emptyPage,
  findNode,
  isFreeNode,
  isTheme,
  keepsRatio,
  lowestPageHeight,
  migratePage,
  minSize,
  type NewNodeOverrides,
  newNode,
  type PageData,
  parentOf,
  parseClipboard,
  type Registry,
  resolveRect,
  type SavedTheme,
  type Theme,
  turnOf,
  validatePage,
  validateRegistry,
} from "@midito-kitchen/core";
import type { Renderer } from "@midito-kitchen/render";
import {
  type ClipboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActionDef } from "./actions";
import { type Appearance, appearanceVariables, schemeOf } from "./appearance";
import { BlockLabel } from "./BlockLabel";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { elementOf } from "./canvas/element-of";
import { Marquee } from "./canvas/Marquee";
import { SelectionBox } from "./canvas/SelectionBox";
import { StagePage } from "./canvas/StagePage";
import { useAltHeld } from "./canvas/useAltHeld";
import { useBlockMarks } from "./canvas/useBlockMarks";
import { useGestures } from "./canvas/useGestures";
import { usePointer } from "./canvas/usePointer";
import { useStageSize } from "./canvas/useStageSize";
import { createApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { localPoint } from "./drop-place";
import styles from "./Editor.module.css";
import { EndPanel } from "./EndPanel";
import { isEditableTarget } from "./editable";
import type { FontDef } from "./fonts";
import { GapLabels } from "./GapLabels";
import { boundsOf, centreOf } from "./group-math";
import { InlineEdit } from "./InlineEdit";
import { TContext } from "./i18n/context";
import { localiseRegistry } from "./i18n/registry";
import { createT, type I18n } from "./i18n/translate";
import { type IconComponent, IconsContext, usableIcons } from "./icons";
import type { LibraryImage } from "./images";
import { KEY_HINTS, matchKey } from "./keymap";
import { isNudgeKey } from "./nudge";
import { PageEdge } from "./PageEdge";
import { pageWidthVariables } from "./page-width";
import { useRenders } from "./perf";
import { QuickActions } from "./QuickActions";
import { Rail } from "./Rail";
import { StartPanel } from "./StartPanel";
import { resolveStatus, type SaveStatus } from "./save-status";
import {
  type CommandName,
  canRun,
  createEditorStore,
  createNotifier,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  StoreProvider,
  useDocumentCommands,
  useEditorState,
  useHostSync,
  useRun,
  useSelectionCommands,
  useStoreApi,
  useViewCommands,
  withDraft,
  withTheme,
} from "./store";
import type { HostTheme } from "./ThemesPanel";
import { Toolbar } from "./Toolbar";
import { stepSelection } from "./tab-order";
import type { UploadImage } from "./upload-image";
import { fitZoom } from "./zoom";

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
   * The mark at the left end of the header. Without it the editor draws its own "M"; give `null` for
   * none, or your own element (a logo, a back link) to put your product there.
   */
  logo?: ReactNode;
  /**
   * Extra content of the host at the left end of the header, after the mark and before Undo: a
   * "Back to pages" link, the name of the page. The editor draws it as given and styles nothing of it.
   */
  headerStart?: ReactNode;
  /**
   * How the editor looks: a `scheme` (`light` or `dark`) to start from, `colors` by name, the corner
   * `radius`, the `control` height and the `font`. Anything left out keeps the default of the scheme.
   * The same can be done with the `--midito-*` variables in CSS; this is the typed way.
   */
  appearance?: Appearance;
  /**
   * The language of the editor: a `locale`, a translation in `messages` (English is built in; the
   * other languages are in `@midito-kitchen/editor/locales/*`) and, for a system that has its own
   * translator, a `translate` function that is asked first. See `I18n`.
   */
  i18n?: I18n;
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
   * `uploadImage` adds an Upload image button to the Images panel: it is called with the file the person
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
    /**
     * The fonts people can choose from, for the page and for each text and button. Each is a name
     * and a font stack (`{ name: "Inter", stack: "Inter, system-ui, sans-serif" }`). Nothing else can
     * be typed. The host loads the fonts itself (Google Fonts, `@font-face`); without a list, the
     * fonts every browser has are offered.
     */
    fonts?: readonly FontDef[];
    /**
     * The pictures of the host's library, shown in the Images panel to add to the page: an `url` each,
     * and when known a `name`, a smaller `thumb`, the natural `width` and `height`, a `folder` and
     * `tags`. The editor lays them out in their own shapes, can search them by name, folder and tag
     * and groups them by folder. Passing a picture uploaded just now is the host's job: add it to the
     * list in `uploadImage` and pass the list again.
     */
    images?: readonly LibraryImage[];
    /**
     * Icons of your own in place of the editor's, by name (`undo`, `redo`, `img`, `trash`...; the
     * names are in `ICON_NAMES`). Each is a component that takes the `size` in px, so an icon of a
     * library such as lucide-react can be given as it is: `{ undo: Undo2 }`. Names you leave out keep
     * the editor's icon. The stroke of the editor's own icons is set with `--midito-icon-stroke`.
     */
    icons?: Readonly<Record<string, IconComponent>>;
    /**
     * The themes of the host, kept by the host: an id, a name, named colours and a font each, for
     * example `{ id: "sea", name: "Sea", colors: { primary: "#0e7490", paper: "#ecfeff" }, font: "Lora, serif" }`.
     * One with `readonly: true` is a suggestion, shown under Suggested; the others are the ones a
     * person kept, shown under Your themes. Pressing one puts it on the page. Give every theme the
     * same colour names (`primary`, `accent`...), so the blocks that use a colour by name change with
     * the theme. The page keeps no list of themes: the host stores them and passes the list again
     * after it changed.
     */
    themes?: readonly HostTheme[];
    /**
     * Called when a person keeps the theme of the page under a name. The host stores it, gives it an
     * id and passes the new list in `themes`. Without it there is no Save button. If it throws or
     * rejects, the panel says so and keeps nothing.
     */
    onThemeSave?: (theme: Omit<SavedTheme, "id">) => void | Promise<void>;
    /** Called when a person renames one of their themes. Without it, themes cannot be renamed. */
    onThemeRename?: (id: string, name: string) => void | Promise<void>;
    /** Called when a person deletes one of their themes. Without it, themes cannot be deleted. */
    onThemeDelete?: (id: string) => void | Promise<void>;
    /** The theme of a new page, for a host that has its own colours and fonts. */
    theme?: Theme;
  };
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

/** How close together, in ms, arrow-key presses are one step of history. */
const NUDGE_MERGE_MS = 500;

/** The editor shell: toolbar, left panel, canvas with a page drawn from data, right panel. */
export function Editor(props: EditorProps) {
  // Made when the editor opens (not in an effect, which StrictMode runs twice), one for each editor.
  // The page it opens with is made here, once, because the selection starts on its root.
  const [firstPage] = useState(() => openPage(props.data, props.config?.theme));
  const [store] = useState(() =>
    createEditorStore<EditorState>({
      ...initialViewState({
        narrow:
          typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 1100px)").matches,
      }),
      ...initialSelectionState(firstPage.root.id),
      ...initialDocumentState(firstPage),
      ...initialHostState({ hostStatus: props.status, hasSave: props.onSave !== undefined }),
    }),
  );
  return (
    <StoreProvider store={store}>
      <EditorBody {...props} />
    </StoreProvider>
  );
}

function EditorBody({
  className,
  onChange,
  onChangeDebounce,
  status,
  onSave,
  headerActions,
  logo,
  headerStart,
  appearance,
  i18n,
  historyLimit,
  config,
}: EditorProps) {
  useRenders("editor");
  const t = useMemo(() => createT(i18n), [i18n]);
  const icons = useMemo(() => usableIcons(config?.icons), [config?.icons]);
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const viewing = useViewCommands();
  const selecting = useSelectionCommands();
  const components = config?.components;
  const registry = useMemo<Registry>(() => ({ ...builtInRegistry, ...components }), [components]);
  const documents = useDocumentCommands(historyLimit, registry);
  const history = useEditorState((state) => state.history);
  const data = history.present;
  // The page as it was when it was last saved (or opened), to say whether there is more than that.
  const savedPage = useEditorState((state) => state.savedPage);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const wait =
    typeof onChangeDebounce === "number" ? onChangeDebounce : (onChangeDebounce?.wait ?? 0);
  const maxWait = typeof onChangeDebounce === "object" ? onChangeDebounce.maxWait : undefined;
  // Whether a change waits for its delayed `onChange`, so the header does not call it saved.
  const waiting = useEditorState((state) => state.waiting);
  // What calls `onChange` for a change, only once for it: the page the host already has is this one.
  const [notifier] = useState(() =>
    createNotifier<PageData>(data, (page) => onChangeRef.current?.(page), documents.setWaiting),
  );
  // The canvas zoom. Under 100% the page shows smaller, over it larger; its blocks keep their own px.
  const zoom = useEditorState((state) => state.zoom);
  // A change that waits is not lost when the editor goes away or the delay changes.
  useEffect(() => {
    notifier.configure({ wait, maxWait });
    return () => notifier.flush();
  }, [notifier, wait, maxWait]);
  useEffect(() => notifier.push(data), [notifier, data]);
  // What the host says is in the store too, for a part that reads the status of the header.
  useHostSync(status, onSave !== undefined);
  const headerStatus = resolveStatus(status, {
    hasSave: onSave !== undefined,
    clean: data === savedPage,
    waiting,
  });
  // The width the page is shown at. A view setting only: it is not in the page data and not in the history.
  const frame = useEditorState((state) => state.frame);
  // Adding, deleting and grouping change the blocks every screen shares, so they are done on the desktop.
  const onPhone = frame === "phone";
  const shownRegistry = useMemo(() => localiseRegistry(t, registry), [t, registry]);
  // A mistake in the host's kinds is told once per registry, and the editor goes on with it.
  useEffect(() => {
    for (const { type, key, code } of validateRegistry(registry)) {
      console.error(`[midito] config.components.${type}${key ? `.${key}` : ""}: ${code}`);
    }
  }, [registry]);
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const selectedId = useEditorState((state) => state.selectedId);
  // Whether the panel of the tool is open. A narrow screen starts without it, to leave room for the page.
  const panelOpen = useEditorState((state) => state.panelOpen);
  // The words of a block being typed on the block itself, which block and which of its props.
  const editing = useEditorState((state) => state.editing);
  // The block whose children a press selects: the page at the start, a group once it is entered.
  const scopeId = useEditorState((state) => state.scopeId);
  // More blocks selected with Shift, besides `selectedId`. They are children of the same parent.
  // The panel and the handles are for `selectedId` only; the others are drawn with an outline.
  const picked = useEditorState((state) => state.picked);
  const hoverId = useEditorState((state) => state.hoverId);
  // What a screen reader is told, in a region that is not drawn: what is selected, added or removed.
  const announcement = useEditorState((state) => state.announcement);
  const announce = viewing.announce;
  // What was just done (added, removed), to be said together with the selection that follows it.
  const note = useRef("");
  const heard = useRef(false);
  // The selection and the time of the last arrow-key move, so a run of them is one step of history.
  const lastNudge = useRef({ key: "", at: Number.NEGATIVE_INFINITY });
  const selectionKey = `${selectedId ?? ""}|${picked.join()}`;
  // Elements as state, not refs: moveable needs them on the render after they mount.
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const { stage, stageBox } = useStageSize(workspace);
  // Whether Alt is held: the distances to neighbours are shown only then, as in Figma.
  const altHeld = useAltHeld();
  const [block, setBlock] = useState<HTMLElement | null>(null);
  // The frame laid over several selected blocks, and what a gesture on it starts from.
  const [frameEl, setFrameEl] = useState<HTMLElement | null>(null);

  /**
   * With several free blocks of one parent selected, the frame that holds them all, in the page's own
   * px and on the screen, so they can be moved and turned as one. Nothing for a parent that is turned
   * (its px are not upright on the screen), for one block, or when the blocks have different parents.
   */
  const groupInfo = (() => {
    if (picked.length === 0 || !selectedId || !block || !workspace) return null;
    const parentElement = block.parentElement;
    const parentNode = parentOf(data.root, selectedId);
    if (!parentElement || !parentNode || turnOf(data.root, parentNode.id, frame) !== 0) return null;
    const container = { w: parentElement.clientWidth, h: parentElement.clientHeight };
    const nodes = [selectedId, ...picked].flatMap((id) => {
      const node = findNode(data.root, id);
      return node && isFreeNode(node) && parentOf(data.root, id)?.id === parentNode.id
        ? [node]
        : [];
    });
    if (nodes.length < 2) return null;
    const placed = nodes.map((node) => ({
      node,
      rect: resolveRect(boxFor(node, frame), container),
      rotation: boxFor(node, frame).rotation,
    }));
    const bounds = boundsOf(placed);
    if (!bounds) return null;
    const parentBox = parentElement.getBoundingClientRect();
    const view = workspace.getBoundingClientRect();
    return {
      placed,
      container,
      bounds,
      pivot: centreOf(bounds),
      // In the scrolling canvas's own coordinates, so the frame scrolls with the page.
      box: {
        left:
          parentBox.left +
          (parentElement.clientLeft + bounds.x) * zoom -
          view.left +
          workspace.scrollLeft -
          workspace.clientLeft,
        top:
          parentBox.top +
          (parentElement.clientTop + bounds.y) * zoom -
          view.top +
          workspace.scrollTop -
          workspace.clientTop,
        width: bounds.w * zoom,
        height: bounds.h * zoom,
      },
    };
  })();
  const {
    dragging,
    measure,
    dropId,
    setDropId,
    gesture,
    groupMoved,
    pendingDrag,
    dragControls,
    startGesture,
    dragMove,
    previewGroupTurn,
    endDrag,
    endRotate,
    endResize,
    measureBetween,
  } = useGestures({
    workspace,
    block,
    groupInfo,
    data,
    registry,
    frame,
    zoom,
    selectedId,
    picked,
    hoverId,
    onPhone,
    documents,
  });
  const editorRoot = useRef<HTMLDivElement>(null);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const draft = useEditorState((state) => state.draft);
  const setDraft = documents.setDraft;
  const shown = useMemo<PageData>(
    () => (draft ? withDraft(data, draft, frame, registry) : data),
    [data, draft, frame, registry],
  );
  useBlockMarks({ workspace, selectedId, picked, hoverId, dropId, dragging, shown });
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;
  // The block under the pointer, for its name tag. Its element comes from the last render.
  const hoverNode = hoverId ? findNode(data.root, hoverId) : undefined;
  const hoverElement = workspace && hoverId ? elementOf(workspace, hoverId) : null;
  // The kind of the selected node, or `undefined` for one nobody registered.
  const selectedDef =
    selectedNode && Object.hasOwn(registry, selectedNode.type)
      ? registry[selectedNode.type]
      : undefined;
  // The same kind with its name and labels in the language of the editor, for what is drawn.
  const shownDef =
    selectedNode && Object.hasOwn(shownRegistry, selectedNode.type)
      ? shownRegistry[selectedNode.type]
      : undefined;
  const { menuAt, setMenuAt, marquee, press, hover, openMenu, enter } = usePointer({
    workspace,
    editorRoot,
    data,
    selectedDef,
    selectedId,
    picked,
    scopeId,
    editing,
    groupInfo,
    groupMoved,
    pendingDrag,
    dragControls,
    documents,
    selecting,
  });

  // Say what is selected whenever the selection changes, and what was done to get there.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the selection is the trigger
  useEffect(() => {
    if (!heard.current) {
      heard.current = true;
      return;
    }
    const level = selectedId ? parentOf(data.root, selectedId) : undefined;
    const at = level ? level.children.findIndex((child) => child.id === selectedId) : -1;
    const what =
      picked.length > 0
        ? t("props.manySelected", { n: 1 + picked.length })
        : selectedNode
          ? level && at >= 0
            ? t("a11y.selectedAt", {
                name: shownDef?.label ?? selectedNode.type,
                at: at + 1,
                total: level.children.length,
              })
            : t("a11y.selected", { name: shownDef?.label ?? selectedNode.type })
          : t("props.emptyTitle");
    announce(note.current ? t("a11y.joined", { note: note.current, what }) : what);
    note.current = "";
  }, [selectedId, picked.length]);

  // `<Render>` owns the elements, so look up the one for the selected node after every render.
  useLayoutEffect(() => {
    setBlock(workspace && selectedId ? elementOf(workspace, selectedId) : null);
  });

  // The box has the block that was just pressed: the press, if it is still down, goes on to drag it.
  useLayoutEffect(() => {
    const pending = pendingDrag.current;
    if (!pending || !block || block.dataset.miditoId !== selectedId) return;
    pendingDrag.current = null;
    if (!pending.up) dragControls.current?.dragStart(pending.press);
  }, [block, selectedId, pendingDrag, dragControls]);

  /** The lines of the menu. Everything that changes the blocks waits for the Desktop screen, like the toolbar. */
  const menuItems = (): ContextMenuItem[] => [
    {
      label: t("quick.duplicate"),
      hint: KEY_HINTS["block.duplicate"],
      disabled: !canRun(canState, "block.duplicate"),
      onSelect: () => run("block.duplicate"),
    },
    {
      label: t("quick.delete"),
      hint: KEY_HINTS["block.delete"],
      disabled: !canRun(canState, "block.delete"),
      danger: true,
      onSelect: () => run("block.delete"),
    },
    "separator",
    ...(
      [
        ["menu.forward", "forward"],
        ["menu.backward", "backward"],
        ["quick.front", "front"],
        ["quick.back", "back"],
      ] as const
    ).map(([label, to]) => ({
      label: t(label),
      disabled: !canRun(canState, "block.reorder", to),
      onSelect: () => run("block.reorder", to),
    })),
    "separator",
    {
      label: t("quick.group"),
      hint: KEY_HINTS["block.group"],
      disabled: !canRun(canState, "block.group"),
      onSelect: () => run("block.group"),
    },
    {
      label: t("quick.ungroup"),
      hint: KEY_HINTS["block.ungroup"],
      disabled: !canRun(canState, "block.ungroup"),
      onSelect: () => run("block.ungroup"),
    },
  ];

  /** Store one change on a node, once. The draft is over. */
  const commitPatch = documents.commitPatch;

  /**
   * A new block of the chosen kind, selected. It goes inside the selected block when that kind lets
   * blocks in, and on the page otherwise, in the middle of whichever it goes into. A pending change
   * is stored first.
   */
  const addBlockOf = (kind: string, overrides?: NewNodeOverrides) => {
    if (onPhone) return;
    note.current = t("a11y.added");
    const sizeOf = (element: HTMLElement | null) => ({
      w: element?.clientWidth ?? 0,
      h: element?.clientHeight ?? 0,
    });
    // The page as it is drawn now, to find its middle down the page.
    const page = workspace ? elementOf(workspace, data.root.id) : null;
    documents.addBlock({ kind, overrides, inside: sizeOf(block), page: sizeOf(page) });
  };

  /**
   * The block a card dragged from the library would land in at `point` on the screen: the topmost
   * block under it that can hold this kind. Nothing when the pointer is off the page, or on the phone.
   */
  const landingFor = (kind: string, point: { x: number; y: number }) => {
    const probe = newNode(registry, kind, "probe", { w: 1, h: 1 });
    if (!probe || onPhone || !workspace) return undefined;
    for (const element of document.elementsFromPoint(point.x, point.y)) {
      if (!(element instanceof HTMLElement) || !workspace.contains(element)) continue;
      const id = element.dataset.miditoId;
      if (id !== undefined && canInsert(registry, data.root, id, probe)) return { id, element };
    }
    return undefined;
  };

  /** A card is over the page: outline the block it would land in (the page itself needs no outline). */
  const dragFromLibrary = (kind: string, point: { x: number; y: number } | null) => {
    const landing = point ? landingFor(kind, point) : undefined;
    setDropId(landing && landing.id !== data.root.id ? landing.id : null);
  };

  /** A card was let go at `point`: a block of its kind is added there, centred on the pointer. */
  const dropFromLibrary = (kind: string, point: { x: number; y: number }) => {
    const landing = landingFor(kind, point);
    if (!landing) return;
    const { id: parentId, element } = landing;
    const container = { w: element.clientWidth, h: element.clientHeight };
    const rect = element.getBoundingClientRect();
    // A parent that is turned has no simple map from the screen: the block goes in its middle.
    const at =
      turnOf(data.root, parentId, frame) === 0
        ? localPoint(
            point,
            // Not a spread: the numbers of a DOMRect are not its own properties.
            {
              left: rect.left,
              top: rect.top,
              clientLeft: element.clientLeft,
              clientTop: element.clientTop,
            },
            zoom,
          )
        : null;
    documents.dropBlock({ kind, parentId, container, at });
  };

  /** The size of the parent of the selected block, which `groupNodes` and `ungroupNode` measure in. */
  const parentSize = () => {
    const parent = block?.parentElement;
    return parent ? { w: parent.clientWidth, h: parent.clientHeight } : undefined;
  };

  /** What a button or a menu line looks at to be on, from the state this part already draws from. */
  const canState = { frame, selectedId, picked, history, zoom };
  const fit = () => {
    const look = workspace ? getComputedStyle(workspace) : undefined;
    const roomHeight = workspace
      ? workspace.clientHeight -
        Number.parseFloat(look?.paddingTop ?? "0") -
        Number.parseFloat(look?.paddingBottom ?? "0")
      : 0;
    viewing.setZoom(fitZoom(stageBox.room, stageBox.page, roomHeight, stageBox.height));
  };
  /** Save like the button: true once `onSave` has settled, false when it could not run. */
  const save = async (): Promise<boolean> => {
    if (!onSave || status === "saving") return false;
    // A change that is still pending is stored first, and it is part of what is saved.
    const pending = draft;
    documents.save();
    try {
      await onSave(pending ? withDraft(data, pending, frame, registry) : data);
      return true;
    } catch {
      return false;
    }
  };
  const run = useRun(historyLimit, registry, {
    parentSize: () => parentSize() ?? null,
    note: (done) => {
      note.current = t(done === "duplicated" ? "a11y.duplicated" : "a11y.deleted");
    },
  });

  // The control object: made once, it reads the latest render through a ref, as `useRun` does.
  const store = useStoreApi<EditorState>();
  const latest = useRef({ save, addBlockOf, fit });
  latest.current = { save, addBlockOf, fit };
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [api] = useState(() =>
    createApi({
      run,
      getState: store.getState,
      save: () => latest.current.save(),
      addBlock: (kind, overrides) => latest.current.addBlockOf(kind, overrides),
      fit: () => latest.current.fit(),
      alive: () => alive.current,
    }),
  );

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
    if (event.defaultPrevented) run("block.delete");
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
    documents.settleDraft();
    const parent = (selectedId ? parentOf(data.root, selectedId) : undefined) ?? data.root;
    const element = elementOf(workspace, parent.id);
    if (!element) return;
    const container = { w: element.clientWidth, h: element.clientHeight };
    // The same text pasted again goes another step further down and to the right.
    const times = pasted.current.text === text ? pasted.current.times + 1 : 1;
    const shift = { x: 16 * times, y: 16 * times };
    if (documents.pasteBlocks({ nodes, parentId: parent.id, container, shift })) {
      pasted.current = { text, times };
    }
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
  // A block that is gone (undone, deleted) ends the edit: `reconcile` lets go of it with the page change.
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

  // The frame of a group is worked out from the size of the page as it is drawn, which only changes
  // once the editor has drawn a new screen, zoom or page height. Draw once more then, or the frame
  // would be the size of the page before.
  const [, setLayoutTick] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the triggers, the effect reads none of them
  useLayoutEffect(
    () => setLayoutTick((n) => n + 1),
    [frame, zoom, stageBox, data.root.styles.minHeight],
  );

  // The page as it is drawn: its element, how tall it is and the bottom of the lowest block on it.
  const pageElement = workspace ? elementOf(workspace, data.root.id) : null;
  const pageHeight = (() => {
    if (!pageElement) return { drawn: 0, floor: 0 };
    // The shortest page that still holds every block, worked out from how each one is placed.
    const boxes = data.root.children.flatMap((child) =>
      isFreeNode(child) ? [boxFor(child, frame)] : [],
    );
    return {
      drawn: pageElement.offsetHeight,
      floor: lowestPageHeight(boxes, pageElement.clientWidth),
    };
  })();

  // The distances to show, only with Alt held: those of a drag that is on, or else those to the block pointed at.
  const shownMeasure = altHeld ? (dragging ? measure : measureBetween()) : null;

  return (
    <ControlProvider api={api}>
      <TContext.Provider value={t}>
        <IconsContext.Provider value={icons}>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it */}
          <div
            ref={editorRoot}
            className={rootClass}
            style={{ ...appearanceVariables(appearance), ...pageWidthVariables }}
            data-scheme={schemeOf(appearance)}
            lang={i18n?.locale}
            data-midito-editor=""
            data-panel={panelOpen ? "open" : "closed"}
            tabIndex={-1}
            onCopy={copySelected}
            onCut={cutSelected}
            onPaste={pasteBlocks}
            onKeyDown={(event) => {
              // A field keeps its own Esc and its own undo.
              if (isEditableTarget(event.target)) return;
              // Tab on the canvas goes from block to block of the level the person is working in; at the end
              // of the level it goes on to the next control, so the keyboard is never stuck on the page.
              if (
                event.key === "Tab" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                (event.target === event.currentTarget || event.target === workspace)
              ) {
                const level =
                  (selectedId ? parentOf(data.root, selectedId) : undefined) ??
                  findNode(data.root, scopeId) ??
                  data.root;
                const next = stepSelection(
                  level.children.map((child) => child.id),
                  selectedId,
                  event.shiftKey,
                );
                if (next) {
                  event.preventDefault();
                  selecting.selectOnly(next, level.id);
                  return;
                }
              }
              if (event.key === "Escape") {
                setDraft(null);
                // Inside a group, Esc selects the group and goes up a level; at the page it selects nothing.
                const scope = scopeId === data.root.id ? undefined : findNode(data.root, scopeId);
                if (selectedId && scope) {
                  selecting.selectOnly(scope.id, parentOf(data.root, scope.id)?.id ?? data.root.id);
                } else {
                  selecting.clearSelection();
                }
                return;
              }
              if (gesture.current) return;
              if (
                event.key === "Enter" &&
                selectedId &&
                selectedDef?.inlineText &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                !event.shiftKey
              ) {
                // Enter on a block that has words goes into them, like a double press on the block does.
                event.preventDefault();
                documents.settleDraft();
                selecting.setEditing({
                  id: selectedId,
                  prop: selectedDef.inlineText.prop,
                  multiline: selectedDef.inlineText.multiline === true,
                });
                return;
              }
              if (
                event.key === "Enter" &&
                selectedNode?.type === "Group" &&
                selectedNode.children[0] &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                // Enter on a group goes into it, as Esc goes back up.
                event.preventDefault();
                selecting.selectOnly(selectedNode.children[0].id, selectedNode.id);
                return;
              }
              if (
                isNudgeKey(event.key) &&
                selectedId &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                // The arrows move the selected blocks, and do not scroll the canvas. Presses close together,
                // on the same blocks, are one step to undo.
                event.preventDefault();
                const same = lastNudge.current.key === selectionKey;
                const merge = same && event.timeStamp - lastNudge.current.at < NUDGE_MERGE_MS;
                lastNudge.current = { key: selectionKey, at: event.timeStamp };
                documents.nudgeSelected({
                  container: parentSize() ?? null,
                  key: event.key,
                  shift: event.shiftKey,
                  merge,
                });
                return;
              }
              // The browser's own page zoom would scale the whole editor, and the keys of the editor are
              // not the browser's: a key that is ours is stopped even when the command has nothing to do.
              const given = matchKey(event, selectedId);
              if (given) {
                event.preventDefault();
                (run as (name: CommandName, args?: unknown) => boolean)(given.name, given.args);
              }
            }}
          >
            <div role="status" aria-live="polite" className={styles.visuallyHidden}>
              {announcement}
            </div>
            <Toolbar
              logo={logo}
              headerStart={headerStart}
              headerActions={headerActions}
              status={headerStatus}
              saving={status === "saving"}
              onSave={
                onSave &&
                (() => {
                  void save();
                })
              }
              onFit={fit}
              run={run}
            />
            <Rail run={run} />
            <StartPanel
              registry={shownRegistry}
              config={config}
              onAddBlock={addBlockOf}
              onDragMove={dragFromLibrary}
              onDrop={dropFromLibrary}
              onApplyTheme={documents.putTheme}
            />
            <section
              ref={setWorkspace}
              className={styles.workspace}
              aria-label={t("panel.canvas")}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard
              tabIndex={0}
              onPointerDown={press}
              onPointerMove={hover}
              onContextMenu={openMenu}
              onPointerLeave={() => selecting.setHover(null)}
              onDoubleClick={enter}
            >
              <StagePage
                stage={stage}
                stageBox={stageBox}
                shown={shown}
                renderers={config?.renderers}
                empty={data.root.children.length === 0 && !editing}
                onAddFirst={() => addBlockOf("Container")}
              />
              {marquee && <Marquee box={marquee} />}
              {editing && editingElement && editingNode && (
                <InlineEdit
                  element={editingElement}
                  value={String(editingNode.props[editing.prop] ?? "")}
                  multiline={editing.multiline}
                  maxLength={editingLimit}
                  rotation={turnOf(data.root, editing.id, frame)}
                  zoom={zoom}
                  onDone={(value) => {
                    selecting.setEditing(null);
                    if (editingNode.props[editing.prop] !== value) {
                      commitPatch(editing.id, { key: "prop", name: editing.prop, value });
                    }
                  }}
                  onCancel={() => selecting.setEditing(null)}
                />
              )}
              {shownMeasure && <GapLabels gaps={shownMeasure.gaps} origin={shownMeasure.origin} />}
              {menuAt && (
                <ContextMenu
                  x={menuAt.x}
                  y={menuAt.y}
                  items={menuItems()}
                  onClose={() => {
                    setMenuAt(null);
                    // The keys of the editor work again where the pointer was.
                    editorRoot.current?.focus({ preventScroll: true });
                  }}
                />
              )}
              {workspace && !editing && hoverId && hoverElement && hoverNode && (
                <BlockLabel
                  target={hoverElement}
                  workspace={workspace}
                  text={shownRegistry[hoverNode.type]?.label ?? hoverNode.type}
                  tone="hover"
                />
              )}
              {block &&
                workspace &&
                !editing &&
                !groupInfo &&
                selectedNode &&
                selectedId !== data.root.id && (
                  <BlockLabel
                    target={block}
                    workspace={workspace}
                    text={shownDef?.label ?? selectedNode.type}
                    tone="selected"
                  />
                )}
              {block &&
                workspace &&
                !editing &&
                !menuAt &&
                selectedId &&
                selectedId !== data.root.id && (
                  <QuickActions
                    target={block}
                    workspace={workspace}
                    disabled={onPhone}
                    canGroup={picked.length > 0}
                    canUngroup={selectedNode?.type === "Group"}
                    onForward={() => run("block.reorder", "forward")}
                    onBackward={() => run("block.reorder", "backward")}
                    onDuplicate={() => run("block.duplicate")}
                    onDelete={() => run("block.delete")}
                    onGroup={() => run("block.group")}
                    onUngroup={() => run("block.ungroup")}
                    onFront={() => run("block.reorder", "front")}
                    onBack={() => run("block.reorder", "back")}
                  />
                )}
              {pageElement && workspace && !editing && (
                <PageEdge
                  page={pageElement}
                  workspace={workspace}
                  zoom={zoom}
                  floor={pageHeight.floor}
                  onPreview={(height) =>
                    setDraft({ id: data.root.id, key: "minHeight", value: height })
                  }
                  onCommit={(height) =>
                    commitPatch(data.root.id, { key: "minHeight", value: height })
                  }
                  onCancel={() => setDraft(null)}
                />
              )}
              {groupInfo && !editing && (
                <div
                  ref={setFrameEl}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: groupInfo.box.left,
                    top: groupInfo.box.top,
                    width: groupInfo.box.width,
                    height: groupInfo.box.height,
                    pointerEvents: "none",
                  }}
                />
              )}
              <SelectionBox
                target={editing ? null : groupInfo ? frameEl : block}
                container={workspace}
                className={styles.selection}
                controls={dragControls}
                group={groupInfo !== null}
                scale={groupInfo ? zoom : 1}
                onRotatePreview={previewGroupTurn}
                companions={
                  groupInfo
                    ? groupInfo.placed.flatMap((item) =>
                        workspace ? (elementOf(workspace, item.node.id) ?? []) : [],
                      )
                    : picked.flatMap((id) => (workspace ? (elementOf(workspace, id) ?? []) : []))
                }
                lockRatio={selectedNode ? keepsRatio(selectedNode, selectedDef) : false}
                minSize={minSize(selectedNode?.styles)}
                angle={
                  !groupInfo && selectedNode && isFreeNode(selectedNode)
                    ? boxFor(selectedNode, frame).rotation
                    : 0
                }
                onGestureStart={startGesture}
                onDragEnd={endDrag}
                onDragMove={dragMove}
                onResizeEnd={endResize}
                onRotateEnd={endRotate}
              />
            </section>
            <EndPanel
              config={config}
              documents={documents}
              selecting={selecting}
              parentSize={parentSize}
              pageHeight={pageHeight}
              selectedRect={selectedRect}
              shownDef={shownDef}
            />
          </div>
        </IconsContext.Provider>
      </TContext.Provider>
    </ControlProvider>
  );
}
