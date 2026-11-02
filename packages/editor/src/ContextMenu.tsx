import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./ContextMenu.module.css";
import { useT } from "./i18n/context";

/** One line of the menu, or a rule between two groups. */
export type ContextMenuItem =
  | {
      /** A stable identity for the line; the row is keyed by it, or by its label and place. */
      id?: string;
      label: string;
      /** The shortcut, shown at the right end, such as "Ctrl+D". Only said, not wired here. */
      hint?: string;
      disabled?: boolean;
      danger?: boolean;
      onSelect: () => void;
    }
  | "separator";

export interface ContextMenuProps {
  /** Where the pointer was pressed, in screen px: the menu opens with its corner here. */
  x: number;
  y: number;
  items: readonly ContextMenuItem[];
  /** The menu is done: an item was chosen, Esc was pressed, or the pointer went elsewhere. */
  onClose: () => void;
}

/** The room kept between the menu and the edge of the window, in px. */
const EDGE = 8;

/** The lines of the menu that can be chosen now, in order. */
const choosable = (menu: HTMLElement | null) => [
  ...(menu?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []),
];

/**
 * The menu that opens at the pointer on a right press. It keeps inside the window, is reached with
 * the arrow keys (Home and End too), takes an item with Enter or Space, and shuts with Esc, a press
 * anywhere else, a scroll or a resize. The first item that can be chosen has the focus when it opens.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: x, top: y });

  // Keep inside the window once the menu has a size.
  useLayoutEffect(() => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    setPlace({
      left: Math.max(EDGE, Math.min(x, window.innerWidth - box.width - EDGE)),
      top: Math.max(EDGE, Math.min(y, window.innerHeight - box.height - EDGE)),
    });
  }, [x, y]);

  // The editor makes a new `onClose` on every render; the menu must not start again for each one.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    choosable(root.current)[0]?.focus();
    const shut = () => close.current();
    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) shut();
    };
    // `capture`: a press on the canvas must not select first and then find the menu still open.
    document.addEventListener("pointerdown", away, true);
    window.addEventListener("resize", shut);
    window.addEventListener("blur", shut);
    document.addEventListener("scroll", shut, true);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      window.removeEventListener("resize", shut);
      window.removeEventListener("blur", shut);
      document.removeEventListener("scroll", shut, true);
    };
  }, []);

  const keys = (event: KeyboardEvent) => {
    const list = choosable(root.current);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const go = (index: number) => {
      event.preventDefault();
      list[(index + list.length) % list.length]?.focus();
    };
    if (event.key === "ArrowDown") go(at + 1);
    else if (event.key === "ArrowUp") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(list.length - 1);
    else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div
      ref={root}
      role="menu"
      aria-label={t("menu.label")}
      className={styles.menu}
      style={place}
      onKeyDown={keys}
      // The menu sits inside the canvas: a press on an item must not reach it and clear the selection.
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) =>
        item === "separator" ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the list is fixed, and a rule has no identity
          <hr key={index} className={styles.rule} />
        ) : (
          <button
            key={item.id ?? `${item.label}:${index}`}
            type="button"
            role="menuitem"
            className={`${styles.item} ${item.danger ? styles.danger : ""}`}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            <span>{item.label}</span>
            {item.hint && <span className={styles.hint}>{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  );
}
