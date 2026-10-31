import { useEffect, useLayoutEffect, useState } from "react";
import styles from "./BlockLabel.module.css";

export interface BlockLabelProps {
  /** The element of the block, which the label sits on the top left corner of. */
  target: HTMLElement;
  /** The scrolling canvas, which keeps the label inside what is on the screen. */
  workspace: HTMLElement;
  /** The name of the kind of block, such as "Button". */
  text: string;
  /** `selected` is stronger than `hover`: the block that is selected has a solid tag. */
  tone: "hover" | "selected";
}

/** The room the label needs above the block, in px: its height and a small gap. */
const ABOVE = 22;

/**
 * The name of a block, in a small tag on the corner of its frame, so a person knows what they point
 * at, above all when blocks lie over each other. It follows the block when the canvas scrolls or the
 * window changes, goes under the block when there is no room above, and waits while the block is
 * dragged. It is not turned with a block that is rotated: it stays readable.
 */
export function BlockLabel({ target, workspace, text, tone }: BlockLabelProps) {
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const locate = () => {
    const box = target.getBoundingClientRect();
    const view = workspace.getBoundingClientRect();
    const x = Math.min(Math.max(box.left, view.left + 4), view.right - 60);
    const above = box.top - ABOVE;
    const y = above < view.top + 4 ? box.bottom + 4 : above;
    setPlace((now) => (now && now.x === x && now.y === y ? now : { x, y }));
  };

  // After every render, since the block may have moved or changed size.
  useLayoutEffect(locate);

  useEffect(() => {
    workspace.addEventListener("scroll", locate, { passive: true });
    window.addEventListener("resize", locate);
    return () => {
      workspace.removeEventListener("scroll", locate, { passive: true } as EventListenerOptions);
      window.removeEventListener("resize", locate);
    };
  });

  // While a gesture is on, the block carries `data-dragging`; the label waits for it to end. Watched
  // for as long as this is the block, not again after every render: a change that came between two
  // renders would be missed, and the label would stay away. It also looks once at the start, for a
  // gesture that began before the watch did.
  useEffect(() => {
    const sync = () => setDragging(target.hasAttribute("data-dragging"));
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(target, { attributes: true, attributeFilter: ["data-dragging"] });
    return () => watch.disconnect();
  }, [target]);

  if (!place || dragging) return null;
  return (
    <div
      aria-hidden="true"
      className={`${styles.label} ${tone === "selected" ? styles.selected : styles.hover}`}
      style={{ left: place.x, top: place.y }}
    >
      {text}
    </div>
  );
}
