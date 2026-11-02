import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import styles from "./QuickActions.module.css";
import { type CanState, canRun } from "./store";

/** Which buttons the permissions leave on, from the same answers a menu line is drawn from. */
export function quickOffs(state: CanState) {
  return {
    reorder: canRun(state, "block.reorder", "forward"),
    duplicate: canRun(state, "block.duplicate"),
    delete: canRun(state, "block.delete"),
  };
}

export interface QuickActionsProps {
  /** The element of the selected block, which the toolbar sits under. */
  target: HTMLElement;
  /** The scrolling canvas, which keeps the toolbar inside what is on the screen. */
  workspace: HTMLElement;
  /** Blocks cannot be added, moved or deleted from this screen (the phone), so every button is off. */
  disabled: boolean;
  /** What `quickOffs` says; a button is off when it is false. Default: all on. */
  allow?: ReturnType<typeof quickOffs> | undefined;
  /** More than one block is selected, so they can be grouped. */
  canGroup: boolean;
  /** The selected block is a group, so it can be taken apart. */
  canUngroup: boolean;
  onForward: () => void;
  onBackward: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onFront: () => void;
  onBack: () => void;
}

/** How far under the block the toolbar sits, in px: out of the way of the handle that turns the block. */
const GAP = 14;

/**
 * The few things a person does to the block they just selected, in a small toolbar under it, as the
 * mock draws them: move it up or down in the stack, copy it, delete it, and a menu for the rest.
 * It follows the block when the canvas scrolls or the window changes, and it is out of the way while
 * the block is being dragged.
 */
export function QuickActions(props: QuickActionsProps) {
  const t = useT();
  const { target, workspace, disabled } = props;
  const allow = props.allow ?? { reorder: true, duplicate: true, delete: true };
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const menuId = useId();

  /** Work out where the toolbar goes from where the block is now. */
  const place_ = () => {
    const box = target.getBoundingClientRect();
    const view = workspace.getBoundingClientRect();
    const half = (bar.current?.offsetWidth ?? 180) / 2;
    const height = bar.current?.offsetHeight ?? 44;
    const x = Math.min(
      Math.max(box.left + box.width / 2, view.left + half + 8),
      view.right - half - 8,
    );
    const y = Math.min(box.bottom + GAP, view.bottom - height - 8);
    setPlace((now) => (now && now.x === x && now.y === y ? now : { x, y }));
  };

  // After every render, since the block may have moved or changed size.
  useLayoutEffect(place_);

  useEffect(() => {
    workspace.addEventListener("scroll", place_, { passive: true });
    window.addEventListener("resize", place_);
    return () => {
      workspace.removeEventListener("scroll", place_, { passive: true } as EventListenerOptions);
      window.removeEventListener("resize", place_);
    };
  });

  // While a gesture is on, the block carries `data-dragging`; the toolbar waits for it to end. Watched
  // for as long as this is the block (see `BlockLabel`), with one look at the start.
  useEffect(() => {
    const sync = () => setDragging(target.hasAttribute("data-dragging"));
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(target, { attributes: true, attributeFilter: ["data-dragging"] });
    return () => watch.disconnect();
  }, [target]);

  // The menu closes when something else is pressed.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  if (!place || dragging) return null;
  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const off = disabled ? t("quick.disabled") : undefined;

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label={t("quick.label")}
      className={styles.bar}
      style={{ left: place.x, top: place.y }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={styles.button}
        aria-label={t("quick.up")}
        title={off ?? t("quick.upTitle")}
        disabled={disabled || !allow.reorder}
        onClick={props.onForward}
      >
        <Icon name="up" />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={t("quick.down")}
        title={off ?? t("quick.downTitle")}
        disabled={disabled || !allow.reorder}
        onClick={props.onBackward}
      >
        <Icon name="down" />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={t("quick.duplicate")}
        title={off ?? t("quick.duplicateTitle")}
        disabled={disabled || !allow.duplicate}
        onClick={props.onDuplicate}
      >
        <Icon name="copy" />
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.danger}`}
        aria-label={t("quick.delete")}
        title={off ?? t("quick.deleteTitle")}
        disabled={disabled || !allow.delete}
        onClick={props.onDelete}
      >
        <Icon name="trash" />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label={t("quick.more")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((now) => !now)}
      >
        <Icon name="more" />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label={t("quick.moreActions")} className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={!props.canGroup}
            title={props.canGroup ? t("quick.groupTitle") : t("quick.groupNeedMore")}
            onClick={choose(props.onGroup)}
          >
            {t("quick.group")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={!props.canUngroup}
            onClick={choose(props.onUngroup)}
          >
            {t("quick.ungroup")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={choose(props.onFront)}
          >
            {t("quick.front")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={choose(props.onBack)}
          >
            {t("quick.back")}
          </button>
        </div>
      )}
    </div>
  );
}
