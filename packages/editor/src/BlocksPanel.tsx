import { libraryOf, type Registry } from "@midito-kitchen/core";
import { type PointerEvent, useEffect, useId, useRef, useState } from "react";
import styles from "./BlocksPanel.module.css";
import { useT } from "./i18n/context";
import { Icon, type IconName, isIconName } from "./icons";
import { useRenders } from "./perf";

export interface BlocksPanelProps {
  registry: Registry;
  /** Blocks cannot be added from this screen (the phone), so the cards are off. */
  disabled: boolean;
  /** A kind was chosen: add a block of it. */
  onAdd: (type: string) => void;
  /** A card is being dragged: where the pointer is now, or `null` when the drag is over. */
  onDragMove?: ((type: string, point: { x: number; y: number } | null) => void) | undefined;
  /** A card was dropped here, in screen px. Not called when the drag is cancelled with Esc. */
  onDrop?: ((type: string, point: { x: number; y: number }) => void) | undefined;
}

/** How far the pointer goes, in px, before a press on a card is a drag and not a click. */
const DRAG_FROM = 4;

/** The card that follows the pointer while one is dragged. */
interface Ghost {
  type: string;
  label: string;
  icon: IconName;
  x: number;
  y: number;
}

/** The icon of a kind: the one it names when the editor has it, or a plain box. */
const iconFor = (name: string | undefined): IconName => (name && isIconName(name) ? name : "box");

/**
 * The library of blocks: a search box and the kinds of the registry in groups, each a card that adds
 * a block when it is pressed. Which kinds there are, their groups and icons come from the registry.
 */
export function BlocksPanel({ registry, disabled, onAdd, onDragMove, onDrop }: BlocksPanelProps) {
  useRenders("blocks");
  const t = useT();
  const [query, setQuery] = useState("");
  const searchId = useId();
  const groups = libraryOf(registry, query);
  const nothing = groups.length === 0;
  const why = disabled ? t("blocks.disabled") : undefined;
  const [ghost, setGhost] = useState<Ghost | null>(null);
  // A drag ends with a click event on the card; that click must not add a second block.
  const dragged = useRef(false);
  // The newest callbacks, for the listeners of a drag that began some renders ago.
  const latest = useRef({ onDragMove, onDrop });
  latest.current = { onDragMove, onDrop };
  const stop = useRef<(() => void) | null>(null);
  // A drag is dropped when the panel goes away.
  useEffect(() => () => stop.current?.(), []);

  /** A press on a card: past `DRAG_FROM` px it becomes a drag that ends where the pointer is let go. */
  const press = (
    event: PointerEvent<HTMLButtonElement>,
    type: string,
    def: { label: string; icon?: string | undefined },
  ) => {
    if (disabled || event.button !== 0) return;
    // A drag that ended off the card sent no click to it, so the flag of that drag is stale.
    dragged.current = false;
    const from = { x: event.clientX, y: event.clientY };
    let moved = false;
    const info = { type, label: def.label, icon: iconFor(def.icon) };
    const move = (e: globalThis.PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - from.x, e.clientY - from.y) < DRAG_FROM) return;
      moved = true;
      const point = { x: e.clientX, y: e.clientY };
      setGhost({ ...info, ...point });
      latest.current.onDragMove?.(type, point);
    };
    const end = (cancelled: boolean, e?: globalThis.PointerEvent) => {
      stop.current?.();
      stop.current = null;
      setGhost(null);
      if (!moved) return;
      dragged.current = true;
      latest.current.onDragMove?.(type, null);
      if (!cancelled && e) latest.current.onDrop?.(type, { x: e.clientX, y: e.clientY });
    };
    const up = (e: globalThis.PointerEvent) => end(false, e);
    const cancel = () => end(true);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    stop.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  };

  return (
    <div className={styles.panel}>
      <label className={styles.search} htmlFor={searchId}>
        <Icon name="search" />
        <input
          id={searchId}
          type="search"
          placeholder={t("blocks.search")}
          aria-label={t("blocks.search")}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {groups.map((group) => (
        <section key={group.category} className={styles.group} aria-label={group.category}>
          <h3 className={styles.heading}>{group.category}</h3>
          <div className={styles.grid}>
            {group.items.map(({ type, def }) => (
              <button
                key={type}
                type="button"
                className={styles.card}
                disabled={disabled}
                title={why ?? def.description ?? t("blocks.add", { name: def.label })}
                onPointerDown={(event) => press(event, type, def)}
                onClick={() => {
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  onAdd(type);
                }}
              >
                <Icon name={iconFor(def.icon)} size={20} />
                {def.label}
              </button>
            ))}
          </div>
        </section>
      ))}
      {ghost && (
        <div aria-hidden="true" className={styles.ghost} style={{ left: ghost.x, top: ghost.y }}>
          <Icon name={ghost.icon} size={16} />
          {ghost.label}
        </div>
      )}
      {nothing && <p className={styles.empty}>No block matches “{query.trim()}”.</p>}
    </div>
  );
}
