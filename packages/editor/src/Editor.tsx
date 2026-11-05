import {
  boxFor,
  builtInRegistry,
  canInsert,
  clipboardText,
  copyNodes,
  drawsPhoneFlow,
  emptyPage,
  findNode,
  isFreeNode,
  isTheme,
  type JsonValue,
  lowestPageHeight,
  migratePage,
  type NewNodeOverrides,
  newNode,
  type PageData,
  parentOf,
  parseClipboard,
  type Registry,
  resolveRect,
  type SavedTheme,
  type Theme,
  type TreeNode,
  turnOf,
  validatePage,
  validateRegistry,
} from "@miditor/core";
import type { Renderer } from "@miditor/render";
import {
  type ClipboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActionDef } from "./actions";
import { type Appearance, appearanceVariables, schemeOf } from "./appearance";
import { CanvasView } from "./canvas/CanvasView";
import { clientRect, elementsAtClient, frameDocumentOf } from "./canvas/client-rect";
import { firstAccepting } from "./canvas/drop-target";
import { elementOf } from "./canvas/element-of";
import { useDropCommit } from "./canvas/use-drop-commit";
import { useStageSize } from "./canvas/useStageSize";
import { createApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { attachController, type EditorController } from "./controller";
import type { CustomFieldInput } from "./custom-field";
import { localPoint } from "./drop-place";
import styles from "./Editor.module.css";
import { isEditableTarget } from "./editable";
import { type AskedSource, type ExternalSource, withMetadata } from "./external-field";
import type { FontDef } from "./fonts";
import type { HideName } from "./hide";
import { type HostTool, usableTools } from "./host-tool";
import { TContext } from "./i18n/context";
import { localiseRegistry } from "./i18n/registry";
import { createT, type I18n } from "./i18n/translate";
import { type IconComponent, IconsContext, usableIcons } from "./icons";
import type { LibraryImage } from "./images";
import { matchKey } from "./keymap";
import { isNudgeKey } from "./nudge";
import { openSteps } from "./open-history";
import { HostContexts, type Overrides } from "./overrides";
import { pageWidthVariables } from "./page-width";
import {
  DefaultLayout,
  EditorBlocks,
  EditorCanvas,
  EditorHeader,
  EditorImages,
  EditorLayers,
  EditorProperties,
  EditorRail,
  EditorStartPanel,
  EditorThemes,
  EditorTool,
} from "./parts";
import { useRenders } from "./perf";
import { PermissionsContext } from "./permissions-context";
import { drawnBox, measureRoot } from "./phone-freeze";
import { applyPlugins, type EditorPlugin } from "./plugins";
import { resolveStatus, type SaveStatus } from "./save-status";
import { RootContext, type Shell, ShellContext } from "./shell";
import {
  type CommandName,
  canCheck,
  checkPage,
  createEditorStore,
  createNotifier,
  type Denial,
  type EditorAction,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialSourcesState,
  initialViewState,
  metadataKey,
  type Permissions,
  StoreProvider,
  sourceReport,
  unansweredKey,
  useDocumentCommands,
  useEditorState,
  useHostRules,
  useHostSync,
  useRun,
  useSelectionCommands,
  useStoreApi,
  useViewCommands,
  withDraft,
  withTheme,
} from "./store";
import { allowed } from "./store/permissions";
import type { HostTheme } from "./ThemesPanel";
import { stepSelection } from "./tab-order";
import type { UploadImage } from "./upload-image";
import { fitZoom, widthZoom } from "./zoom";

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
   * The steps of an earlier session, so that Undo and Redo work after the page is opened again: `{ past, future }`,
   * from `controller.getHistory()`. `data` is the page shown; `past` are the pages before it (the oldest first)
   * and `future` the ones undo took away (the nearest first). Read once, like `data`. The pages are opened like
   * `data` is and share what they have in common with it; if one cannot be opened the editor opens without any
   * history and warns once. Only the newest `historyLimit` steps are kept. Every step is a whole page, so keep
   * only the last few. Opening them is not a change: nothing is told to `onChange` or `onAction`. Experimental.
   */
  initialHistory?: { past?: readonly PageData[]; future?: readonly PageData[] };
  /**
   * How long to wait, in ms, after the last change before `onChange` is called, so a run of changes
   * is one call with the latest page. Without it, or with 0, `onChange` is called at once for each
   * change. A change that is still waiting is called when the editor unmounts, so none is lost. Give
   * an object to also set `maxWait`: the longest a change may wait while more keep coming.
   */
  onChangeDebounce?: number | { wait: number; maxWait?: number };
  /**
   * Anything about the host's side that its sources need to answer (a language, a shop, who is editing),
   * as plain JSON. It is given to the `search` of every source as `ctx.metadata`, to every renderer of a
   * kind (`config.renderers`) as `context.metadata`, and is not stored in the
   * page. Experimental.
   */
  metadata?: JsonValue;
  /**
   * Where the page is drawn while it is edited: `"iframe"` (the default) in a frame of its own,
   * or `"inline"` in the page that holds the editor. In a frame the blocks have a width of their own (`@media` and `vw` in
   * the blocks of your kinds see the width of the page, as they do when it is published), the style of the
   * editor cannot reach them and theirs cannot reach the editor, and what hangs over the edge of the page is
   * cut. The style sheets of the page that holds the editor are copied into the frame, so the classes your
   * kinds use are there.
   */
  canvas?: "inline" | "iframe";
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
   * A controller from `useCreateEditor()`, to drive this editor from code outside its tree: a bar of
   * your own app with a Publish button, a panel next to the editor. The editor attaches to it when it
   * opens and lets go when it closes. One controller belongs to one editor at a time: a second editor
   * given the same one is ignored and an error is logged.
   */
  controller?: EditorController;
  /**
   * Places of the editor to wrap or replace with components of your own: the header, its actions, the
   * input of a property, the rail, the two panels, the quick actions and the lines of the right-click
   * menu. Each gets `editor` and, to wrap, the editor's own part as `children`. Keep the object stable.
   * Experimental.
   */
  overrides?: Overrides;
  /**
   * Bundles of overrides, tools, hidden parts, permissions, looks, words and config, applied in order,
   * with your own props last (they win). A later plugin wraps the overrides of the earlier ones; hidden
   * parts are joined; permissions are the AND of all; the rest merges by key, the later one winning.
   * Keep the array stable (a constant or `useMemo`). Experimental.
   */
  plugins?: readonly EditorPlugin[];
  /**
   * Parts of the interface not to draw, by name: the places (`header`, `rail`, `panelStart`,
   * `panelEnd`, `quickActions`, `contextMenu`), parts of the header (`header.undo`, `header.redo`,
   * `header.frame`, `header.zoom`, `header.save`, `header.status`), tools (`tool.blocks`,
   * `tool.layers`, `tool.images`, `tool.themes`) and parts of the block panel (`props.align`,
   * `props.anchors`, `props.phone`). Hiding never stops a command; only `permissions` do. An unknown
   * name is ignored with a warning.
   * @experimental
   */
  hide?: readonly HideName[];
  /**
   * What people may do, each a boolean or a function of the block (`canEdit`, `canDelete`,
   * `canDuplicate`, `canDrag`, `canAdd`). A change that is refused is refused whatever way it was
   * asked for: a button, a key, a drag, a paste, or a call of the control API. This stops the editor;
   * the page is plain data and your server must check it again before storing it. Experimental.
   */
  permissions?: Permissions;
  /**
   * Called after each change of the page that was kept, with what was done (`action.type`: `"block.add"`,
   * `"block.edit"`, `"block.delete"`, `"history.undo"`, `"sources.update"`...), the blocks it was about
   * (`action.ids`), the page after it and the page before it. Not gathered over time like `onChange`: one
   * call for each command, so a run of arrow keys is a run of calls. Not called for what is only being
   * dragged or typed, for a change that was refused or for one that changed nothing. Sending anything to a
   * server, or comparing the two pages, is up to you. Experimental.
   */
  onAction?: (action: EditorAction, page: PageData, prevPage: PageData) => void;
  /**
   * Called when a change is refused, with the kind of change and the block it concerned. A repeat of
   * the same refusal within a second is told once. Experimental.
   */
  onDenied?: (denial: Denial) => void;
  /**
   * How the editor looks: a `scheme` (`light` or `dark`) to start from, `colors` by name, the corner
   * `radius`, the `control` height and the `font`. Anything left out keeps the default of the scheme.
   * The same can be done with the `--miditor-*` variables in CSS; this is the typed way.
   */
  appearance?: Appearance;
  /**
   * The language of the editor: a `locale`, a translation in `messages` (English is built in; the
   * other languages are in `@miditor/editor/locales/*`) and, for a system that has its own
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
     * The inputs you draw for your own `custom` fields, by the `kind` the field names:
     * `{ "product-picker": ProductPicker }`. Each is a component that gets the value, `onChange` for a
     * new value (any JSON), `readOnly` and the control object of the editor. A field whose kind has no
     * input here shows a note instead. Experimental.
     */
    customFields?: Readonly<Record<string, CustomFieldInput>>;
    /**
     * Tools of your own on the rail, after the editor's, each with a panel you draw beside the canvas:
     * `{ id: "products", label: "Products", icon: <ShopIcon />, panel: ProductsPanel }`. The panel gets
     * `editor` (the control object) and its `label`. Experimental.
     */
    tools?: readonly HostTool[];
    /**
     * The lists you keep, for `external` fields, by the `source` the field names:
     * `{ pages: { search: (query, signal) => fetchPages(query, signal) } }`. `search` answers with
     * `{ id, label }` items and should stop when `signal` is aborted. Experimental.
     */
    sources?: Readonly<Record<string, ExternalSource>>;
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
     * the editor's icon. The stroke of the editor's own icons is set with `--miditor-icon-stroke`.
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
      `[miditor] \`data\` is not a page this editor can open: ${why} (check it with migratePage)`,
    );
  }
  return opened.page;
}

/** How close together, in ms, arrow-key presses are one step of history. */
const NUDGE_MERGE_MS = 500;

/** What `<EditorProvider>` takes: the props of `<Editor>`, and the parts the host places. */
export type EditorProviderProps = EditorProps & { children?: ReactNode };

/**
 * The editor's state and keys, with the parts placed by the host as its children (`<Editor.Header />`,
 * `<Editor.Canvas />`...). Without children it draws the default layout, which is what `<Editor>` is.
 * @experimental
 */
export function EditorProvider(given: EditorProviderProps) {
  // The plugins applied; without any, the very props that were given.
  const props = applyPlugins(given);
  // Made when the editor opens (not in an effect, which StrictMode runs twice), one for each editor.
  // The page it opens with is made here, once, because the selection starts on its root.
  const [firstPage] = useState(() => openPage(props.data, props.config?.theme));
  // The steps of an earlier session the host kept, opened once with the page.
  const [firstSteps] = useState(() =>
    openSteps(props.initialHistory, firstPage, props.historyLimit),
  );
  const [store] = useState(() =>
    createEditorStore<EditorState>({
      ...initialViewState({
        narrow:
          typeof window !== "undefined" && !!window.matchMedia?.("(max-width: 1100px)").matches,
      }),
      ...initialSelectionState(firstPage.root.id),
      ...initialDocumentState(firstPage, firstSteps),
      ...initialHostState({ hostStatus: props.status, hasSave: props.onSave !== undefined }),
      ...initialSourcesState(),
    }),
  );
  return (
    <StoreProvider store={store}>
      <EditorBody {...props} />
    </StoreProvider>
  );
}

function EditorRoot(props: EditorProps) {
  return <EditorProvider {...props} />;
}

/**
 * The editor: toolbar, left panel, canvas with a page drawn from data, right panel. The parts it is made
 * of are on it too (`Editor.Header`, `Editor.Canvas`...), to place inside an `<EditorProvider>`.
 */
export const Editor = Object.assign(EditorRoot, {
  Provider: EditorProvider,
  Header: EditorHeader,
  Rail: EditorRail,
  StartPanel: EditorStartPanel,
  Blocks: EditorBlocks,
  Layers: EditorLayers,
  Images: EditorImages,
  Themes: EditorThemes,
  Canvas: EditorCanvas,
  Properties: EditorProperties,
  Tool: EditorTool,
});

function EditorBody({
  className,
  onChange,
  onChangeDebounce,
  metadata,
  canvas = "iframe",
  status,
  onSave,
  headerActions,
  logo,
  headerStart,
  controller,
  children,
  overrides,
  hide,
  permissions,
  onDenied,
  onAction,
  appearance,
  i18n,
  historyLimit,
  config,
}: EditorProviderProps) {
  useRenders("editor");
  const t = useMemo(() => createT(i18n), [i18n]);
  const icons = useMemo(() => usableIcons(config?.icons), [config?.icons]);
  const rootClass = className ? `${styles.root} ${className}` : styles.root;
  const viewing = useViewCommands();
  const selecting = useSelectionCommands();
  const components = config?.components;
  // The panels ask the sources through here, each `search` with the editor's `metadata` as it is when the
  // search starts. The wrappers are kept per source of the host, so a new `config` object does not restart a search.
  const metadataNow = useRef(metadata);
  metadataNow.current = metadata;
  const askedSources = useRef(new WeakMap<ExternalSource, AskedSource>());
  const sources = withMetadata(config?.sources, () => metadataNow.current, askedSources.current);
  const registry = useMemo<Registry>(() => ({ ...builtInRegistry, ...components }), [components]);
  // The element the page is drawn in, for the measures of a phone that draws the page as a flow.
  const workspaceRef = useRef<HTMLElement | null>(null);
  const hostRules = useHostRules(
    permissions,
    onDenied,
    viewing.announce,
    t("a11y.denied"),
    onAction,
  );
  const rules = {
    ...hostRules,
    measurePhone: (root: TreeNode) =>
      workspaceRef.current ? measureRoot(workspaceRef.current, root) : null,
  };
  const documents = useDocumentCommands(historyLimit, registry, rules);
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
      console.error(`[miditor] config.components.${type}${key ? `.${key}` : ""}: ${code}`);
    }
  }, [registry]);
  // The selection belongs to the editor, not to the page data: Save does not include it.
  const selectedId = useEditorState((state) => state.selectedId);
  // Whether the panel of the tool is open. A narrow screen starts without it, to leave room for the page.
  const panelOpen = useEditorState((state) => state.panelOpen);
  // The block whose children a press selects: the page at the start, a group once it is entered.
  const scopeId = useEditorState((state) => state.scopeId);
  // More blocks selected with Shift, besides `selectedId`. They are children of the same parent.
  // The panel and the handles are for `selectedId` only; the others are drawn with an outline.
  const picked = useEditorState((state) => state.picked);
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
  workspaceRef.current = workspace;
  const { stage, stageBox } = useStageSize(workspace);
  // A page has the width of its screen, whatever the room is, so a narrow room shows it smaller instead of
  // cutting it. The canvas fits the page across the room by itself until the person zooms it.
  const autoZoom = useRef({ last: 1, manual: false });
  useEffect(() => {
    if (zoom !== autoZoom.current.last) autoZoom.current.manual = true;
  }, [zoom]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new room or page width is the trigger
  useEffect(() => {
    if (autoZoom.current.manual) return;
    const next = widthZoom(stageBox.room, stageBox.page);
    if (next === autoZoom.current.last) return;
    autoZoom.current.last = next;
    viewing.setZoom(next);
  }, [stageBox.room, stageBox.page]);
  const [block, setBlock] = useState<HTMLElement | null>(null);

  const editorRoot = useRef<HTMLDivElement | null>(null);
  // The root element is also state, for `useEditorRoot` (a dialog the host portals into it).
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);
  const setEditorRoot = useCallback((element: HTMLDivElement | null) => {
    editorRoot.current = element;
    setRootElement(element);
  }, []);
  const canvasClaim = useRef<symbol | null>(null);
  // What the canvas tells the provider: whether a gesture is on (the keys wait for it) and which block
  // a card dragged from the library would land in (outlined by the canvas).
  const gesturing = useRef<(() => boolean) | null>(null);
  // Which block a drag, from the library or on the page, would go into; one value for what is lit and where the drop lands.
  const drop = useDropCommit(data.root.id);
  // A colour that is being picked or typed. It is only drawn, never stored: Save does not include it.
  const draft = useEditorState((state) => state.draft);
  const setDraft = documents.setDraft;
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;
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
  // Words cannot be typed on a block that `canEdit` refuses.
  const mayType = !selectedNode || allowed(permissions?.canEdit, selectedNode);

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
    // The blocks are in the frame the page is drawn in, when there is one.
    const surface = frameDocumentOf(workspace);
    const scope = surface ? surface.body : workspace;
    return firstAccepting(
      elementsAtClient(surface ?? document, point.x, point.y).filter((element) =>
        scope.contains(element),
      ),
      (id) => canInsert(registry, data.root, id, probe),
    );
  };

  /** A card is over the page: say which block it would land in, so that block is lit once it has rested there. */
  const dragFromLibrary = (kind: string, point: { x: number; y: number } | null) => {
    const landing = point ? landingFor(kind, point) : undefined;
    drop.setCandidate(landing ? landing.id : null);
  };

  /** A card was let go at `point`: a block of its kind is added there, centred on the pointer. */
  const dropFromLibrary = (
    kind: string,
    point: { x: number; y: number },
    input?: { alt: boolean },
  ) => {
    const found = landingFor(kind, point);
    if (!found) return;
    // It lands in what is lit: the page, or a block the pointer rested on. Alt, or a pass over a block, means the page.
    const pageElement = workspace ? elementOf(workspace, data.root.id) : null;
    const lit = found.id === data.root.id || found.id === drop.committedRef.current;
    const landing =
      pageElement && (input?.alt === true || !lit)
        ? { id: data.root.id, element: pageElement }
        : found;
    const { id: parentId, element } = landing;
    const container = { w: element.clientWidth, h: element.clientHeight };
    const rect = clientRect(element);
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
  const run = useRun(
    historyLimit,
    registry,
    {
      parentSize: () => parentSize() ?? null,
      note: (done) => {
        note.current = t(done === "duplicated" ? "a11y.duplicated" : "a11y.deleted");
      },
    },
    undefined,
    rules,
  );

  // The control object: made once, it reads the latest render through a ref, as `useRun` does.
  const store = useStoreApi<EditorState>();
  const latest = useRef<{
    save: typeof save;
    addBlockOf: typeof addBlockOf;
    fit: typeof fit;
    checkSources?: () => Promise<void>;
  }>({ save, addBlockOf, fit });
  latest.current.save = save;
  latest.current.addBlockOf = addBlockOf;
  latest.current.fit = fit;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // The check of the stored items against the host's sources: when the editor opens, when `metadata`
  // changes, and when the host asks. A new check stops the one before it, and closing the editor stops it.
  const checking = useRef<AbortController | null>(null);
  // The ids the latest check was started for, so an item that comes into the page later (a paste, an undo)
  // is asked about once, and a check already under way for the same ids is not started again.
  const asked = useRef("");
  const checkSources = async () => {
    checking.current?.abort();
    const controller = new AbortController();
    checking.current = controller;
    const page = store.getState().history.present;
    asked.current = unansweredKey(page, registry, new Map(), config?.sources);
    try {
      const answers = await checkPage(
        store.getState().history.present,
        registry,
        config?.sources,
        controller.signal,
        { metadata: metadataNow.current },
        permissions,
      );
      if (!controller.signal.aborted) documents.setSourceAnswers(answers);
    } catch {
      // Stopped by a newer check or by closing the editor: nothing to say.
    }
  };
  latest.current.checkSources = checkSources;
  const sourceAnswers = useEditorState((state) => state.sourceAnswers);
  const hostSources = config?.sources;
  const checkedSource = useCallback(
    (name: string) =>
      canCheck(hostSources && Object.hasOwn(hostSources, name) ? hostSources[name] : undefined),
    [hostSources],
  );
  const report = useMemo(
    () => sourceReport(data, sourceAnswers, registry, checkedSource, permissions),
    [data, sourceAnswers, registry, checkedSource, permissions],
  );
  const unanswered = useMemo(
    () => unansweredKey(data, registry, sourceAnswers, hostSources),
    [data, registry, sourceAnswers, hostSources],
  );
  const metadataText = metadataKey(metadata);
  // biome-ignore lint/correctness/useExhaustiveDependencies: it runs for the metadata the host gave, read through a ref
  useEffect(() => {
    void latest.current.checkSources?.();
    return () => checking.current?.abort();
  }, [metadataText]);
  useEffect(() => {
    if (unanswered !== "" && unanswered !== asked.current) void latest.current.checkSources?.();
  }, [unanswered]);
  const limitNow = useRef(historyLimit);
  limitNow.current = historyLimit;
  const [api] = useState(() =>
    createApi({
      run,
      getState: store.getState,
      save: () => latest.current.save(),
      addBlock: (kind, overrides) => latest.current.addBlockOf(kind, overrides),
      fit: () => latest.current.fit(),
      checkSources: () => latest.current.checkSources?.() ?? Promise.resolve(),
      historyLimit: () => limitNow.current,
      alive: () => alive.current,
    }),
  );

  // Hand the control object to the controller the host gave, for as long as this editor is open.
  useEffect(
    () => (controller ? (attachController(controller, { api, store }) ?? undefined) : undefined),
    [controller, api, store],
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

  // Where the selected block is on this screen, in its parent's px: what the number fields show.
  const parentOfSelected = parentSize();
  // A phone that draws the page as a flow shows a block where the flow puts it: read from the page.
  const drawnSelected =
    selectedNode && workspace && frame === "phone" && drawsPhoneFlow(data.root)
      ? elementOf(workspace, selectedNode.id)
      : null;
  const selectedRect =
    selectedNode && isFreeNode(selectedNode) && parentOfSelected
      ? drawnSelected
        ? drawnBox(drawnSelected)
        : resolveRect(boxFor(selectedNode, frame), parentOfSelected)
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

  const shell: Shell = {
    header: {
      logo,
      headerStart,
      headerActions,
      status: headerStatus,
      saving: status === "saving",
      onSave:
        onSave &&
        (() => {
          void save();
        }),
      onFit: fit,
      newer: new Set(report.changed.map((ref) => ref.nodeId)).size,
      onUpdateSources: () => documents.refreshSources(checkedSource),
      run,
    },
    rail: { run, hostTools: usableTools(config?.tools) },
    start: {
      registry: shownRegistry,
      config,
      onAddBlock: addBlockOf,
      onDragMove: dragFromLibrary,
      onDrop: dropFromLibrary,
      onApplyTheme: documents.putTheme,
    },
    end: {
      config,
      sources,
      documents,
      selecting,
      parentSize,
      pageHeight,
      selectedRect,
      shownDef,
    },
    canvas: (
      <CanvasView
        registry={registry}
        shownRegistry={shownRegistry}
        documents={documents}
        selecting={selecting}
        run={run}
        api={api}
        renderers={config?.renderers}
        metadata={metadata}
        inFrame={canvas === "iframe"}
        addBlockOf={addBlockOf}
        editorRoot={editorRoot}
        workspace={workspace}
        setWorkspace={setWorkspace}
        block={block}
        setBlock={setBlock}
        stage={stage}
        stageBox={stageBox}
        gesturing={gesturing}
        drop={drop}
      />
    ),
    canvasClaim,
  };

  return (
    <ControlProvider api={api}>
      <HostContexts overrides={overrides} hide={hide}>
        <PermissionsContext.Provider value={permissions}>
          <TContext.Provider value={t}>
            <IconsContext.Provider value={icons}>
              <ShellContext.Provider value={shell}>
                <RootContext.Provider value={rootElement}>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: shortcuts listen on the container for keys that bubble from the controls inside it */}
                  <div
                    ref={setEditorRoot}
                    className={rootClass}
                    style={{ ...appearanceVariables(appearance), ...pageWidthVariables }}
                    data-scheme={schemeOf(appearance)}
                    lang={i18n?.locale}
                    data-miditor-editor=""
                    data-panel={panelOpen ? "open" : "closed"}
                    data-layout={children === undefined ? "default" : undefined}
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
                        const scope =
                          scopeId === data.root.id ? undefined : findNode(data.root, scopeId);
                        if (selectedId && scope) {
                          selecting.selectOnly(
                            scope.id,
                            parentOf(data.root, scope.id)?.id ?? data.root.id,
                          );
                        } else {
                          selecting.clearSelection();
                        }
                        return;
                      }
                      if (gesturing.current?.()) return;
                      if (
                        event.key === "Enter" &&
                        selectedId &&
                        mayType &&
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
                        const merge =
                          same && event.timeStamp - lastNudge.current.at < NUDGE_MERGE_MS;
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
                        (run as (name: CommandName, args?: unknown) => boolean)(
                          given.name,
                          given.args,
                        );
                      }
                    }}
                  >
                    <div role="status" aria-live="polite" className={styles.visuallyHidden}>
                      {announcement}
                    </div>
                    {children ?? <DefaultLayout />}
                  </div>
                </RootContext.Provider>
              </ShellContext.Provider>
            </IconsContext.Provider>
          </TContext.Provider>
        </PermissionsContext.Provider>
      </HostContexts>
    </ControlProvider>
  );
}
