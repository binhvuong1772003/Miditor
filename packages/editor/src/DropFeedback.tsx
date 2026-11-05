import { useEffect, useLayoutEffect, useState } from "react";
import { clientRect } from "./canvas/client-rect";
import styles from "./DropFeedback.module.css";

export interface DropFeedbackProps {
  /** The element of the block the drag would go into. */
  target: HTMLElement;
  /** The scrolling canvas, whose scroll and the window's size move the block on the screen. */
  workspace: HTMLElement;
  /** What the drop will do, such as "Into Box". */
  text: string;
}

/**
 * Shows where a drop will land: the block is tinted and framed, and its corner says what will happen. It is
 * drawn over the page and does not touch the block, whose style the page draws and the handles measure.
 */
export function DropFeedback({ target, workspace, text }: DropFeedbackProps) {
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const locate = () => {
    const rect = clientRect(target);
    setBox((now) =>
      now &&
      now.left === rect.left &&
      now.top === rect.top &&
      now.width === rect.width &&
      now.height === rect.height
        ? now
        : { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    );
  };
  useLayoutEffect(locate);
  useEffect(() => {
    workspace.addEventListener("scroll", locate, { passive: true });
    window.addEventListener("resize", locate);
    return () => {
      workspace.removeEventListener("scroll", locate, { passive: true } as EventListenerOptions);
      window.removeEventListener("resize", locate);
    };
  });
  if (!box) return null;
  return (
    <div aria-hidden="true" className={styles.tint} style={box}>
      <span className={styles.chip}>{text}</span>
    </div>
  );
}
