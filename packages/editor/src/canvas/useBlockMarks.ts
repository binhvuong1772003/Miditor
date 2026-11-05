import type { PageData } from "@miditor/core";
import { useLayoutEffect } from "react";
import { elementOf } from "./element-of";

/**
 * What the blocks look like to the person editing: the other selected blocks, the one the pointer
 * rests on, the ones being dragged and the one a drag would drop into. The elements belong to
 * `<Render>`, so each mark is put on after a render and taken off before the next.
 */
export function useBlockMarks({
  workspace,
  selectedId,
  picked,
  hoverId,
  dragging,
  shown,
}: {
  workspace: HTMLElement | null;
  selectedId: string | null;
  picked: readonly string[];
  hoverId: string | null;
  dragging: boolean;
  /** The page as it is drawn; a new one can make the elements again. */
  shown: PageData;
}): void {
  // Mark the other selected blocks. The elements belong to `<Render>`, so the mark is put on after
  // each render and taken off again before the next. It is an inline style: every block has an
  // inline `all: revert`, which a class could never beat.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    if (!workspace) return;
    const marked = picked.flatMap((id) => elementOf(workspace, id) ?? []);
    for (const element of marked) {
      element.dataset.miditorPicked = "";
      element.style.outline = "2px solid var(--_focus)";
      element.style.outlineOffset = "1px";
    }
    return () => {
      for (const element of marked) {
        delete element.dataset.miditorPicked;
        element.style.removeProperty("outline");
        element.style.removeProperty("outline-offset");
      }
    };
  }, [workspace, picked, shown]);

  // The block a press would select, outlined while the pointer rests on it, like a design tool does.
  // Inline, for the same reason as the marks above: the block's own `all: revert` beats a rule.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    const target = workspace && hoverId ? elementOf(workspace, hoverId) : null;
    if (!target) return;
    const colour = "color-mix(in srgb, var(--_focus) 70%, transparent)";
    target.style.outline = `2px solid ${colour}`;
    target.style.outlineOffset = "-1px";
    // The outline fades in, so moving across the page reads as a soft trail and not a flicker.
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      target.animate?.([{ outlineColor: "transparent" }, { outlineColor: colour }], {
        duration: 120,
        easing: "ease-out",
      });
    }
    return () => {
      target.style.removeProperty("outline");
      target.style.removeProperty("outline-offset");
    };
  }, [workspace, hoverId, shown]);

  // While a block is dragged, the cursor is the cross of the move. Not before: a block at rest, even
  // the selected one, keeps the plain cursor, and so does one that is only pointed at.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` is a render of the page, which can make the elements again
  useLayoutEffect(() => {
    if (!workspace || !dragging) return;
    const own = [selectedId, ...picked].flatMap((id) =>
      id ? (elementOf(workspace, id) ?? []) : [],
    );
    for (const element of own) element.style.cursor = "move";
    return () => {
      for (const element of own) element.style.removeProperty("cursor");
    };
  }, [workspace, dragging, selectedId, picked, shown]);
}
