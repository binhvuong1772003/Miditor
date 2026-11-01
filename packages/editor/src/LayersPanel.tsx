import type { Registry, TreeNode } from "@midito-kitchen/core";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useT } from "./i18n/context";
import { Icon, type IconName, isIconName } from "./icons";
import styles from "./LayersPanel.module.css";
import { ancestorIds, layerRows } from "./layer-tree";
import fieldStyles from "./PropertiesPanel.module.css";

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
}: LayersPanelProps) {
  const t = useT();
  const [shut, setShut] = useState<ReadonlySet<string>>(new Set());
  const list = useRef<HTMLUListElement>(null);
  const rows = layerRows(root, shut);

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
        event.preventDefault();
        element.focus();
      }
    };
    if (event.key === "ArrowDown") go(Math.min(rows.length - 1, at + 1));
    else if (event.key === "ArrowUp") go(Math.max(0, at - 1));
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(rows.length - 1);
    else if (event.key === "ArrowRight" && row?.hasChildren && !row.expanded) {
      event.preventDefault();
      toggle(id);
    } else if (event.key === "ArrowLeft" && row) {
      event.preventDefault();
      if (row.hasChildren && row.expanded) toggle(id);
      else {
        const parent = rows.findIndex((other) => other.node.id === row.parentId);
        if (parent >= 0) go(parent);
      }
    }
  };

  return (
    <div className={styles.panel}>
      <ul
        ref={list}
        aria-label={t("layers.label")}
        className={styles.tree}
        onKeyDown={keys}
        onPointerLeave={() => onHover(null)}
      >
        {rows.map(({ node, parentId, depth, hasChildren, expanded }) => {
          const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
          const name = def?.label ?? node.type;
          const snippet = snippetOf(node, registry);
          const selected = node.id === selectedId || picked.includes(node.id);
          const icon: IconName = def?.icon && isIconName(def.icon) ? def.icon : "box";
          return (
            <li
              key={node.id}
              className={styles.item}
              data-selected={selected}
              data-primary={node.id === selectedId}
              data-hover={node.id === hoverId && !selected}
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
            </li>
          );
        })}
      </ul>
      <p className={fieldStyles.hint}>{t("layers.hint")}</p>
    </div>
  );
}
