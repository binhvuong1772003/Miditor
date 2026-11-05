import { Accessibility, defaultPreset } from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { canMove, findNode, type Registry, type TreeNode } from "@miditor/core";
import { type KeyboardEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "./i18n/context";
import { Icon, type IconName, isIconName } from "./icons";
import styles from "./LayersPanel.module.css";
import { type DropZone, type LayerPlace, placeFor, zoneAt } from "./layer-drop";
import { ancestorIds, type LayerRow, layerRows } from "./layer-tree";
import fieldStyles from "./PropertiesPanel.module.css";
import { useRenders } from "./perf";

export interface LayersPanelProps {
  root: TreeNode;
  /** The registry as it is read (names in the language of the editor), for the name and icon of each line. */
  registry: Registry;
  selectedId: string | null;
  /** The other blocks selected with it. */
  picked: readonly string[];
  /** The block the pointer is over, on the canvas or in the list. */
  hoverId: string | null;
  /** A line was pressed. `add` is true with Shift, Ctrl or Cmd. */
  onSelect: (id: string, parentId: string, add: boolean) => void;
  onHover: (id: string | null) => void;
  /**
   * A row was dragged to a new place: block `id` goes into `parentId` at `index` (see `moveNode`). Without it the
   * rows cannot be dragged.
   */
  onMove?: ((id: string, parentId: string, index: number) => void) | undefined;
  /** Rows are not dragged: on the phone screen, or when the editor is read only. */
  disabled?: boolean | undefined;
}

/** What a line of the list is, which a hook of its own needs a component for. */
interface LayerItemProps {
  row: LayerRow;
  name: string;
  snippet: string | undefined;
  icon: IconName;
  selected: boolean;
  primary: boolean;
  hovered: boolean;
  /** Where a drag in progress would drop, when it is over this row. */
  drop: DropZone | undefined;
  disabled: boolean;
  onHover: (id: string | null) => void;
  onSelect: LayersPanelProps["onSelect"];
  toggle: (id: string) => void;
}

/** What a line needs to be dragged: the refs of dnd-kit, and whether it is the one lifted. */
interface DragParts {
  place: (element: HTMLLIElement | null) => void;
  handleRef: (element: Element | null) => void;
  isDragging: boolean;
}

function LayerView({
  row: { node, parentId, depth, hasChildren, expanded },
  name,
  snippet,
  icon,
  selected,
  primary,
  hovered,
  drop,
  onHover,
  onSelect,
  toggle,
  drag,
}: Omit<LayerItemProps, "disabled"> & { drag?: DragParts | undefined }) {
  const t = useT();
  return (
    <li
      ref={drag?.place}
      className={styles.item}
      data-selected={selected}
      data-primary={primary}
      data-hover={hovered && !selected}
      data-dragging={drag?.isDragging || undefined}
      data-drop={drop}
      style={{ paddingInlineStart: `${depth * 1}rem` }}
      onPointerEnter={() => onHover(node.id)}
    >
      {hasChildren ? (
        <button
          type="button"
          tabIndex={-1}
          className={styles.fold}
          aria-label={t(expanded ? "layers.shut" : "layers.open", { name })}
          aria-expanded={expanded}
          onClick={() => toggle(node.id)}
        >
          <Icon name={expanded ? "chevronDown" : "chevronRight"} size={12} />
        </button>
      ) : (
        <span className={styles.fold} aria-hidden="true" />
      )}
      <button
        type="button"
        className={styles.line}
        data-layer={node.id}
        aria-pressed={selected}
        onClick={(event) =>
          onSelect(node.id, parentId, event.shiftKey || event.ctrlKey || event.metaKey)
        }
      >
        <Icon name={icon} size={14} />
        <span className={styles.name}>{name}</span>
        {snippet && <span className={styles.snippet}>{snippet}</span>}
      </button>
      {drag && (
        <button
          type="button"
          ref={drag.handleRef}
          className={styles.grip}
          data-layer-grip=""
          // Only the grip of the selected line is a stop of the Tab key; the others are for the pointer.
          tabIndex={primary ? 0 : -1}
          aria-label={t("layers.move", { name })}
        >
          <Icon name="more" size={14} />
        </button>
      )}
    </li>
  );
}

/**
 * A line that can be dragged. Its hooks register the line with dnd-kit, which marks it as a draggable button for a
 * screen reader and the Tab key and never takes that back, so a line that cannot be dragged is not this component.
 */
function DraggableLayer(props: Omit<LayerItemProps, "disabled">) {
  const id = props.row.node.id;
  const draggable = useDraggable({ id });
  const droppable = useDroppable({ id });
  const place = (element: HTMLLIElement | null) => {
    draggable.ref(element);
    droppable.ref(element);
  };
  return (
    <LayerView
      {...props}
      drag={{ place, handleRef: draggable.handleRef, isDragging: draggable.isDragging }}
    />
  );
}

const SNIPPET = 40;

/** The words a block shows, when its kind has some, cut short for the list. */
function snippetOf(node: TreeNode, registry: Registry): string | undefined {
  const prop = Object.hasOwn(registry, node.type)
    ? registry[node.type]?.inlineText?.prop
    : undefined;
  const value = prop === undefined ? undefined : node.props[prop];
  if (typeof value !== "string") return undefined;
  const line = value.replace(/\s+/g, " ").trim();
  if (line === "") return undefined;
  return line.length > SNIPPET ? `${line.slice(0, SNIPPET)}…` : line;
}

/** The plugins of dnd-kit with what it says to a screen reader in the language of the editor and not in its English. */
function announcingPlugins(
  latest: RefObject<{ root: TreeNode; registry: Registry; t: ReturnType<typeof useT> }>,
) {
  const nameOf = (id: unknown) => {
    const { root, registry } = latest.current;
    const node = findNode(root, String(id));
    return node ? (registry[node.type]?.label ?? node.type) : "";
  };
  return defaultPreset.plugins.map((plugin) =>
    plugin === Accessibility
      ? Accessibility.configure({
          announcements: {
            dragstart: ({ operation }: DragStartEvent) =>
              latest.current.t("layers.lifted", { name: nameOf(operation.source?.id) }),
            dragover: ({ operation }: DragOverEvent) =>
              operation.target && operation.target.id !== operation.source?.id
                ? latest.current.t("layers.over", { name: nameOf(operation.target.id) })
                : undefined,
            dragend: ({ canceled }: DragEndEvent) =>
              canceled ? latest.current.t("layers.cancelled") : undefined,
          },
          screenReaderInstructions: { draggable: latest.current.t("layers.instructions") },
        })
      : plugin,
  );
}

/**
 * The blocks of the page as a tree, like the layers of a design tool: the topmost block first, each
 * block with its own blocks under it, a line to press to select one, Shift to add blocks of the same
 * level, and a pointer over a line that lights the block on the page. A block that holds others can
 * be opened and shut, and the list opens the way to the selected block. The arrows move through
 * the list, Right and Left open and shut, Enter selects.
 */
export function LayersPanel({
  root,
  registry,
  selectedId,
  picked,
  hoverId,
  onSelect,
  onHover,
  onMove,
  disabled = false,
}: LayersPanelProps) {
  useRenders("layers");
  const t = useT();
  const [shut, setShut] = useState<ReadonlySet<string>>(new Set());
  const list = useRef<HTMLUListElement>(null);
  const rows = layerRows(root, shut);
  // Where a drag in progress would drop, for the line that shows it; the place is read when it ends.
  const [over, setOver] = useState<{ id: string; zone: DropZone } | null>(null);
  const place = useRef<LayerPlace | undefined>(undefined);
  // A row is lifted: the list says so, and the editor leaves the keys to the lift, or Escape would clear the selection
  // and the arrows nudge the block that is selected.
  const [lifted, setLifted] = useState(false);
  const dragDisabled = disabled || !onMove;
  // dnd-kit reads the options of its plugins once, when it is made, so they read what is current from here.
  const latest = useRef({ root, registry, t });
  latest.current = { root, registry, t };
  const plugins = useMemo(() => announcingPlugins(latest), []);

  // The list opens the way to a block that was selected somewhere else, on the page for example.
  useEffect(() => {
    if (selectedId === null) return;
    const inside = ancestorIds(root, selectedId);
    setShut((now) =>
      inside.some((id) => now.has(id))
        ? new Set([...now].filter((id) => !inside.includes(id)))
        : now,
    );
  }, [selectedId, root]);

  // ... and brings the line into view.
  useEffect(() => {
    if (selectedId === null) return;
    const line = [...(list.current?.querySelectorAll<HTMLElement>("[data-layer]") ?? [])].find(
      (element) => element.dataset.layer === selectedId,
    );
    line?.scrollIntoView?.({ block: "nearest" });
  }, [selectedId]);

  const toggle = (id: string) =>
    setShut((now) => {
      const next = new Set(now);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  if (rows.length === 0) {
    return (
      <div className={styles.panel}>
        <p className={fieldStyles.hint}>{t("layers.empty")}</p>
      </div>
    );
  }

  const keys = (event: KeyboardEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    const id = target.dataset.layer;
    if (id === undefined) return;
    const at = rows.findIndex((row) => row.node.id === id);
    const row = rows[at];
    const go = (to: number) => {
      const element = [...(list.current?.querySelectorAll<HTMLElement>("[data-layer]") ?? [])][to];
      if (element) {
        // The key is the list's: it must not go on to nudge the block that is selected.
        event.preventDefault();
        event.stopPropagation();
        element.focus();
      }
    };
    if (event.key === "ArrowDown") go(Math.min(rows.length - 1, at + 1));
    else if (event.key === "ArrowUp") go(Math.max(0, at - 1));
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(rows.length - 1);
    else if (event.key === "ArrowRight" && row?.hasChildren && !row.expanded) {
      event.preventDefault();
      event.stopPropagation();
      toggle(id);
    } else if (event.key === "ArrowLeft" && row) {
      event.preventDefault();
      event.stopPropagation();
      if (row.hasChildren && row.expanded) toggle(id);
      else {
        const parent = rows.findIndex((other) => other.node.id === row.parentId);
        if (parent >= 0) go(parent);
      }
    }
  };

  // The row under the drag, and where on it: the pointer for a drag by the mouse, the lifted row for the keyboard.
  const move = (event: DragMoveEvent | DragOverEvent) => {
    const { source, target, position } = event.operation;
    const element = target?.element;
    if (!source || !target || !element) {
      place.current = undefined;
      setOver(null);
      return;
    }
    const box = element.getBoundingClientRect();
    const draggedId = String(source.id);
    const overId = String(target.id);
    const zone = zoneAt(
      position.current.y - box.top,
      box.height,
      canMove(registry, root, draggedId, overId),
    );
    const found = placeFor({ root, registry, draggedId, overId, zone });
    place.current = found;
    setOver(found ? { id: overId, zone } : null);
  };
  const end = (event: DragEndEvent) => {
    // Not before the key that ended the lift has gone the whole way up: dnd-kit may hear it first, the editor after.
    setTimeout(() => setLifted(false), 0);
    const found = place.current;
    place.current = undefined;
    setOver(null);
    const id = event.operation.source?.id;
    if (event.canceled || !found || id === undefined) return;
    onMove?.(String(id), found.parentId, found.index);
  };

  return (
    <div className={styles.panel} data-lifted={lifted || undefined}>
      <DragDropProvider
        plugins={plugins}
        onDragStart={() => setLifted(true)}
        onDragMove={move}
        onDragOver={move}
        onDragEnd={end}
      >
        <ul
          ref={list}
          aria-label={t("layers.label")}
          className={styles.tree}
          onKeyDown={keys}
          onPointerLeave={() => onHover(null)}
        >
          {rows.map((row) => {
            const { node } = row;
            const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
            const selected = node.id === selectedId || picked.includes(node.id);
            const line = {
              row,
              name: def?.label ?? node.type,
              snippet: snippetOf(node, registry),
              icon: (def?.icon && isIconName(def.icon) ? def.icon : "box") as IconName,
              selected,
              primary: node.id === selectedId,
              hovered: node.id === hoverId,
              drop: over?.id === node.id ? over.zone : undefined,
              onHover,
              onSelect,
              toggle,
            };
            return dragDisabled ? (
              <LayerView key={node.id} {...line} />
            ) : (
              <DraggableLayer key={node.id} {...line} />
            );
          })}
        </ul>
      </DragDropProvider>
      <p className={fieldStyles.hint}>{t("layers.hint")}</p>
    </div>
  );
}
