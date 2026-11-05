import {
  boxFor,
  drawsPhoneFlow,
  findNode,
  isFreeNode,
  keepsRatio,
  lowestPageHeight,
  minSize,
  type NewNodeOverrides,
  type PageData,
  parentOf,
  type Registry,
  resolveRect,
  turnOf,
} from "@miditor/core";
import type { Render } from "@miditor/render";
import {
  type MutableRefObject,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { BlockLabel } from "../BlockLabel";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import type { EditorApi } from "../control-api";
import { DropFeedback } from "../DropFeedback";
import styles from "../Editor.module.css";
import { GapLabels } from "../GapLabels";
import { boundsOf, centreOf } from "../group-math";
import { useHidden } from "../hide";
import { InlineEdit } from "../InlineEdit";
import { useT } from "../i18n/context";
import { KEY_HINTS } from "../keymap";
import { applyContextMenu, OverrideSlot, OverridesContext } from "../overrides";
import { PageEdge } from "../PageEdge";
import { usePermissions } from "../permissions-context";
import { drawnBox } from "../phone-freeze";
import { QuickActions, quickOffs } from "../QuickActions";
import type { Run } from "../store";
import {
  canRun,
  drawnPage,
  type useDocumentCommands,
  useEditorState,
  type useSelectionCommands,
  withDraft,
} from "../store";
import { allowed } from "../store/permissions";
import { clientRect } from "./client-rect";
import { elementOf } from "./element-of";
import { InFrame } from "./FrameStage";
import { Marquee } from "./Marquee";
import { SelectionBox } from "./SelectionBox";
import { StagePage } from "./StagePage";
import type { DropCommit } from "./use-drop-commit";
import { useAltHeld } from "./useAltHeld";
import { useBlockMarks } from "./useBlockMarks";
import { useGestures } from "./useGestures";
import { usePointer } from "./usePointer";

export interface CanvasViewProps {
  registry: Registry;
  /** The kinds as the person reads them, in the language of the editor. */
  shownRegistry: Registry;
  documents: ReturnType<typeof useDocumentCommands>;
  selecting: ReturnType<typeof useSelectionCommands>;
  run: Run;
  api: EditorApi;
  renderers: Parameters<typeof Render>[0]["renderers"];
  /** The `metadata` of the editor, for the renderers of the host's kinds. */
  metadata: Parameters<typeof Render>[0]["metadata"];
  /** Draw the page in a frame of its own (`canvas="iframe"`). */
  inFrame: boolean;
  addBlockOf: (kind: string, overrides?: NewNodeOverrides) => void;
  /** The editor's root element, which takes the focus back when the menu closes. */
  editorRoot: MutableRefObject<HTMLDivElement | null>;
  /** The scrolling canvas and the selected block's element: state of the provider, filled from here. */
  workspace: HTMLElement | null;
  setWorkspace: (element: HTMLElement | null) => void;
  block: HTMLElement | null;
  setBlock: (element: HTMLElement | null) => void;
  stage: RefObject<HTMLDivElement | null>;
  stageBox: { room: number; page: number; height: number };
  /** Told by the canvas for the keys of the provider: whether a gesture is on. */
  gesturing: MutableRefObject<(() => boolean) | null>;
  /** Which block a drag, from the library or on the page, would go into. */
  drop: DropCommit;
}

/** The page and everything drawn over it; it keeps the state only the canvas needs. */
export function CanvasView({
  registry,
  shownRegistry,
  documents,
  selecting,
  run,
  api,
  renderers,
  metadata,
  inFrame,
  addBlockOf,
  editorRoot,
  workspace,
  setWorkspace,
  block,
  setBlock,
  stage,
  stageBox,
  gesturing,
  drop,
}: CanvasViewProps) {
  const t = useT();
  // When the page is drawn in a frame of its own, its blocks are in the document of that frame: that is
  // where they are looked for. The workspace around the frame stays where the panels and menus measure.
  const [frameDoc, setFrameDoc] = useState<Document | null>(null);
  const scope: HTMLElement | null = frameDoc ? frameDoc.body : workspace;
  const permissions = usePermissions();
  const overrides = useContext(OverridesContext);
  const hideContextMenu = useHidden("contextMenu");
  const data = useEditorState((state) => state.history.present);
  const history = useEditorState((state) => state.history);
  const frame = useEditorState((state) => state.frame);
  const zoom = useEditorState((state) => state.zoom);
  const selectedId = useEditorState((state) => state.selectedId);
  const picked = useEditorState((state) => state.picked);
  const hoverId = useEditorState((state) => state.hoverId);
  const editing = useEditorState((state) => state.editing);
  const scopeId = useEditorState((state) => state.scopeId);
  const draft = useEditorState((state) => state.draft);
  const onPhone = frame === "phone";
  // The page has a height for each screen; the edge of the page changes the one being shown.
  const heightKey = onPhone ? "phoneMinHeight" : "minHeight";
  const setDraft = documents.setDraft;
  const altHeld = useAltHeld();
  const [frameEl, setFrameEl] = useState<HTMLElement | null>(null);
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;
  const selectedDef =
    selectedNode && Object.hasOwn(registry, selectedNode.type)
      ? registry[selectedNode.type]
      : undefined;
  const shownDef =
    selectedNode && Object.hasOwn(shownRegistry, selectedNode.type)
      ? shownRegistry[selectedNode.type]
      : undefined;
  // Words cannot be typed on a block that `canEdit` refuses.
  const mayType = !selectedNode || allowed(permissions?.canEdit, selectedNode);

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
    // A phone that draws the page as a flow shows a block where the flow puts it, not where its data say.
    const flowing = frame === "phone" && drawsPhoneFlow(data.root);
    const placed = nodes.map((node) => ({
      node,
      rect: (() => {
        const element = flowing && scope ? elementOf(scope, node.id) : null;
        return element ? drawnBox(element) : resolveRect(boxFor(node, frame), container);
      })(),
      rotation: boxFor(node, frame).rotation,
    }));
    const bounds = boundsOf(placed);
    if (!bounds) return null;
    const parentBox = clientRect(parentElement);
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
    workspace: scope,
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
    drop,
  });

  // The fields that keep a reference are drawn with the data their source gave; it is never stored.
  const sourceAnswers = useEditorState((state) => state.sourceAnswers);
  const shown = useMemo<PageData>(
    () =>
      drawnPage(draft ? withDraft(data, draft, frame, registry) : data, registry, sourceAnswers),
    [data, draft, frame, registry, sourceAnswers],
  );
  useBlockMarks({ workspace: scope, selectedId, picked, hoverId, dragging, shown });

  // The block under the pointer, for its name tag. Its element comes from the last render.
  const hoverNode = hoverId ? findNode(data.root, hoverId) : undefined;
  const hoverElement = scope && hoverId ? elementOf(scope, hoverId) : null;

  const { menuAt, setMenuAt, marquee, press, hover, openMenu, enter } = usePointer({
    scope,
    editorRoot,
    data,
    selectedDef: mayType ? selectedDef : undefined,
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

  // `<Render>` owns the elements, so look up the one for the selected node after every render.
  useLayoutEffect(() => {
    setBlock(scope && selectedId ? elementOf(scope, selectedId) : null);
  });

  // The box has the block that was just pressed: the press, if it is still down, goes on to drag it.
  useLayoutEffect(() => {
    const pending = pendingDrag.current;
    if (!pending || !block || block.dataset.miditorId !== selectedId) return;
    pendingDrag.current = null;
    if (!pending.up) dragControls.current?.dragStart(pending.press);
  }, [block, selectedId, pendingDrag, dragControls]);

  // The canvas tells the keys and the library drag what only it knows.
  gesturing.current = () => gesture.current !== null;
  useEffect(() => {
    return () => {
      gesturing.current = null;
    };
  }, [gesturing]);

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

  // The blocks that are selected cannot be moved if `canDrag` refuses any of them.
  const lockedBlocks = [selectedId, ...picked].some((id) => {
    const node = id ? findNode(data.root, id) : undefined;
    return node !== undefined && !allowed(permissions?.canDrag, node);
  });
  const canState = { frame, selectedId, picked, history, zoom, permissions };

  // The host's say on the menu is asked once each time it opens, not on every render while it is open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the lines are fixed for as long as the menu is open
  const shownMenu = useMemo(
    () => (menuAt ? applyContextMenu(overrides?.contextMenu, api, menuItems()) : undefined),
    [menuAt],
  );

  // The block whose words are being typed, the element that draws it, and the limit of the field.
  const editingNode = editing ? findNode(data.root, editing.id) : undefined;
  const editingElement = editing && scope ? elementOf(scope, editing.id) : null;
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

  // The frame of a group is worked out from the size of the page as it is drawn, which only changes
  // once the editor has drawn a new screen, zoom or page height. Draw once more then, or the frame
  // would be the size of the page before.
  const [, setLayoutTick] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the triggers, the effect reads none of them
  useLayoutEffect(
    () => setLayoutTick((n) => n + 1),
    [frame, zoom, stageBox, data.root.styles.minHeight, data.root.styles.phoneMinHeight],
  );

  // The page as it is drawn: its element, how tall it is and the bottom of the lowest block on it.
  const pageElement = scope ? elementOf(scope, data.root.id) : null;
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
    <section
      ref={setWorkspace}
      className={styles.workspace}
      aria-label={t("panel.canvas")}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard
      tabIndex={0}
      onPointerDown={press}
      onPointerMove={hover}
      onContextMenu={hideContextMenu ? undefined : openMenu}
      onPointerLeave={() => selecting.setHover(null)}
      onDoubleClick={enter}
    >
      <StagePage
        stage={stage}
        stageBox={stageBox}
        shown={shown}
        renderers={renderers}
        metadata={metadata}
        inFrame={inFrame}
        onFrame={setFrameDoc}
        onFrameWheel={(event, at) => {
          // The workspace zooms on this wheel; it did not hear of it, since it was over the frame.
          if (!workspace) return false;
          const copy = new WheelEvent("wheel", {
            clientX: at.x,
            clientY: at.y,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaMode: event.deltaMode,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            bubbles: true,
            cancelable: true,
          });
          workspace.dispatchEvent(copy);
          return copy.defaultPrevented;
        }}
        onFrameKey={(event) => {
          // Typing on a block (in the frame) keeps its keys. Any other key is the editor's: it is given to
          // its root as if it was pressed there, and what the root does with it (a shortcut) is kept.
          const root = editorRoot.current;
          if (editing || !root) return false;
          const copy = new KeyboardEvent(event.type, {
            key: event.key,
            code: event.code,
            location: event.location,
            repeat: event.repeat,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            bubbles: true,
            cancelable: true,
          });
          root.dispatchEvent(copy);
          return copy.defaultPrevented;
        }}
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
          items={shownMenu ?? []}
          onClose={() => {
            setMenuAt(null);
            // The keys of the editor work again where the pointer was.
            editorRoot.current?.focus({ preventScroll: true });
          }}
        />
      )}
      {workspace && dropId && scope && elementOf(scope, dropId) && (
        <DropFeedback
          target={elementOf(scope, dropId) as HTMLElement}
          workspace={workspace}
          text={
            dropId === data.root.id
              ? t("drop.page")
              : t("drop.into", {
                  name: shownRegistry[findNode(data.root, dropId)?.type ?? ""]?.label ?? "",
                })
          }
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
      {block && workspace && !editing && !menuAt && selectedId && selectedId !== data.root.id && (
        <OverrideSlot name="quickActions" props={{ disabled: onPhone }}>
          <QuickActions
            target={block}
            workspace={workspace}
            disabled={onPhone}
            allow={quickOffs(canState)}
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
        </OverrideSlot>
      )}
      {pageElement && workspace && !editing && (
        <PageEdge
          page={pageElement}
          workspace={workspace}
          zoom={zoom}
          floor={pageHeight.floor}
          onPreview={(height) => setDraft({ id: data.root.id, key: heightKey, value: height })}
          onCommit={(height) => commitPatch(data.root.id, { key: heightKey, value: height })}
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
      <InFrame enabled={inFrame} doc={frameDoc}>
        <SelectionBox
          target={editing ? null : groupInfo ? frameEl : block}
          container={scope}
          className={styles.selection}
          locked={lockedBlocks}
          controls={dragControls}
          group={groupInfo !== null}
          scale={groupInfo ? zoom : 1}
          onRotatePreview={previewGroupTurn}
          companions={
            groupInfo
              ? groupInfo.placed.flatMap((item) =>
                  scope ? (elementOf(scope, item.node.id) ?? []) : [],
                )
              : picked.flatMap((id) => (scope ? (elementOf(scope, id) ?? []) : []))
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
      </InFrame>
    </section>
  );
}
