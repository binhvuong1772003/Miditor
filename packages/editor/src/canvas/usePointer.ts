import {
  type Pick as BlockPick,
  type FreeNode,
  type PageData,
  parentOf,
  pickBlock,
  type Registry,
} from "@miditor/core";
import { type MouseEvent, type PointerEvent, type RefObject, useState } from "react";
import { isHtmlElement } from "../dom";
import { isEditableTarget } from "../editable";
import { nextLayer } from "../layers";
import { boxBetween, type Edges, touched } from "../marquee";
import type { useDocumentCommands, useSelectionCommands } from "../store";
import { clientPoint, clientRect, elementsAtClient, onWindows } from "./client-rect";
import { elementOf } from "./element-of";
import { isMoveableLayer, type SelectionControls } from "./SelectionBox";

export interface PointerInput {
  workspace: HTMLElement | null;
  /** Where the blocks are looked for: the workspace, or the document of the frame the page is drawn in. */
  scope: HTMLElement | null;
  /** The editor's own element, which takes the focus after a press so Esc reaches it. */
  editorRoot: RefObject<HTMLDivElement | null>;
  data: PageData;
  /** The kind of the selected node, or `undefined` for one nobody registered. */
  selectedDef: Registry[string] | undefined;
  selectedId: string | null;
  picked: readonly string[];
  scopeId: string;
  editing: unknown;
  /** The frame laid over several selected blocks, with the blocks it holds. */
  groupInfo: { placed: { node: FreeNode }[] } | null;
  /** A press on the frame that really moved or turned the blocks, or was only a click. */
  groupMoved: RefObject<boolean>;
  /** A press that just selected a block, still down: it drags the block once the box has it. */
  pendingDrag: RefObject<{ press: globalThis.PointerEvent; up: boolean } | null>;
  dragControls: RefObject<SelectionControls | null>;
  documents: ReturnType<typeof useDocumentCommands>;
  selecting: ReturnType<typeof useSelectionCommands>;
}

/**
 * What the pointer does on the canvas: a press selects or starts a box, a move outlines the block it
 * would select, a right press opens the menu, a double press goes into a block. `menuAt` and `marquee`
 * are what the canvas draws for the menu and the box.
 */
export function usePointer({
  workspace,
  scope,
  editorRoot,
  data,
  selectedDef,
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
}: PointerInput) {
  // The menu of a right press on a block: where it opens. The blocks it acts on are the selected ones.
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  // The box a person is dragging out on the empty page to select the blocks it touches, in screen px.
  const [marquee, setMarquee] = useState<Edges | null>(null);

  /**
   * A drag from the empty page draws a box, and on release the blocks it touches are selected: the
   * first in tree order is the main one, the others are picked. They are the children of the page, or
   * with Shift of the parent of the selected block, to be added to it. A move under 4 px is a click.
   */
  const startMarquee = (event: PointerEvent<HTMLElement>) => {
    const from = clientPoint(event);
    const add = event.shiftKey && selectedId !== null;
    const parent = (add ? parentOf(data.root, selectedId as string) : undefined) ?? data.root;
    const box = (e: { clientX: number; clientY: number; target: EventTarget | null }) =>
      boxBetween(from, clientPoint(e));
    const dragged = (b: Edges) => b.right - b.left >= 4 || b.bottom - b.top >= 4;
    const move = (e: globalThis.PointerEvent) => {
      const b = box(e);
      setMarquee(dragged(b) ? b : null);
    };
    const stop = () => {
      stopMove();
      stopUp();
      stopCancel();
      setMarquee(null);
    };
    const up = (e: globalThis.PointerEvent) => {
      stop();
      const b = box(e);
      if (!scope || !dragged(b)) return;
      const items = parent.children.flatMap((child) => {
        const element = elementOf(scope, child.id);
        return element ? [{ id: child.id, rect: clientRect(element) }] : [];
      });
      const ids = touched(b, items);
      if (add && selectedId) {
        const more = ids.filter((id) => id !== selectedId && !picked.includes(id));
        selecting.addPicks(more);
      } else if (ids.length > 0) {
        selecting.selectMany(ids);
      }
    };
    const stopMove = onWindows(scope, "pointermove", move);
    const stopUp = onWindows(scope, "pointerup", up);
    const stopCancel = onWindows(scope, "pointercancel", stop);
  };

  /** The pointer moved over the canvas: the block a press here would select is the one to outline. */
  const hover = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    let next: string | null = null;
    // Nothing is outlined while a button is down (a drag, a box) or over the selected block's handles.
    if (event.buttons === 0 && !editing && !isMoveableLayer(target)) {
      const id = target.closest<HTMLElement>("[data-miditor-id]")?.dataset.miditorId;
      const hit = id === undefined ? undefined : pickBlock(data.root, scopeId, id);
      if (hit && hit.id !== data.root.id && hit.id !== selectedId && !picked.includes(hit.id)) {
        next = hit.id;
      }
    }
    selecting.setHover(next);
  };

  /** A right press on a block selects it, when it is not selected yet, and opens the menu of what can be done to it. */
  const openMenu = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as Element;
    const own = isMoveableLayer(target) ? selectedId : undefined;
    const id = own ?? target.closest<HTMLElement>("[data-miditor-id]")?.dataset.miditorId;
    const hit = id === undefined ? undefined : pickBlock(data.root, scopeId, id);
    // Off a block the browser's own menu stays.
    if (!hit || hit.id === data.root.id) return;
    event.preventDefault();
    documents.settleDraft();
    selecting.setHover(null);
    if (hit.id !== selectedId && !picked.includes(hit.id)) {
      selecting.selectOnly(hit.id, hit.scopeId);
    }
    setMenuAt({ x: event.clientX, y: event.clientY });
  };

  /** A press on a node selects it; a press on the page or the grey around it clears the selection. */
  const press = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (event.button !== 0) return;
    // What is still pending in the panel is applied before anything else changes. A field that is
    // being typed in applies its text when it loses the focus. A colour that was picked is only a
    // draft until the picker closes and sends its own `change`, which comes too late for a press
    // that changes the selection (the panel is gone by then), so the draft is stored here.
    const active = document.activeElement;
    if (active instanceof HTMLElement && isEditableTarget(active)) active.blur();
    documents.settleDraft();
    if (isMoveableLayer(target)) return;
    // What is pressed gets its own frame and tag; the ones for hovering go until the pointer moves.
    selecting.setHover(null);
    // Alt goes down through the blocks that lie over each other where it was pressed.
    if (event.altKey && !event.shiftKey) {
      const stack: BlockPick[] = [];
      const at = clientPoint(event);
      for (const element of elementsAtClient(scope?.ownerDocument ?? document, at.x, at.y)) {
        if (!isHtmlElement(element) || isMoveableLayer(element)) continue;
        if (!scope?.contains(element)) continue;
        const under = element.dataset.miditorId;
        const pick = under === undefined ? undefined : pickBlock(data.root, scopeId, under);
        if (pick && !stack.some((item) => item.id === pick.id)) stack.push(pick);
      }
      const next = nextLayer(
        stack.map((item) => item.id),
        selectedId,
      );
      const chosen = stack.find((item) => item.id === next);
      if (chosen) {
        selecting.selectOnly(chosen.id, chosen.scopeId);
        editorRoot.current?.focus({ preventScroll: true });
        return;
      }
    }
    const id = target.closest<HTMLElement>("[data-miditor-id]")?.dataset.miditorId;
    // The outermost block of the scope that holds what was pressed, so a block in a group selects
    // the group. A press on the page or the grey around it selects nothing and starts again at the page.
    const hit = id === undefined ? undefined : pickBlock(data.root, scopeId, id);
    // A press on a block of the frame keeps the group and goes on to move it. Let go without moving,
    // it is only a click, and picks that one block.
    if (
      hit &&
      groupInfo &&
      !event.shiftKey &&
      groupInfo.placed.some((item) => item.node.id === hit.id)
    ) {
      groupMoved.current = false;
      dragControls.current?.dragStart(event.nativeEvent);
      onWindows(
        scope,
        "pointerup",
        () =>
          setTimeout(() => {
            if (groupMoved.current) return;
            selecting.selectOnly(hit.id, hit.scopeId);
          }, 0),
        { once: true },
      );
      return;
    }
    // A press on the empty page may turn into a box drag; a plain click still just clears (below).
    if (!hit) {
      startMarquee(event);
      // Shift keeps what is selected, so the box can add to it.
      if (event.shiftKey && selectedId) return;
    }
    // Shift adds a block to the selection, or takes it out, when it has the same parent as the one
    // selected: they are the blocks that can be grouped.
    if (event.shiftKey && selectedId && hit) {
      const sameParent = parentOf(data.root, hit.id)?.id === parentOf(data.root, selectedId)?.id;
      if (sameParent && hit.id !== selectedId) {
        selecting.togglePick(hit.id);
      }
      return;
    }
    // A press on a block that is not selected yet selects it and, if it moves, drags it, as in
    // Canva. The box only has the block after the next render, so the drag starts then.
    if (hit && hit.id !== selectedId) {
      const pending = { press: event.nativeEvent, up: false };
      pendingDrag.current = pending;
      onWindows(
        scope,
        "pointerup",
        () => {
          pending.up = true;
        },
        { once: true },
      );
    }
    selecting.selectOnly(hit?.id ?? null, hit?.scopeId ?? data.root.id);
    // A press on a node keeps the keyboard inside the editor, so that Esc reaches it. The editor's
    // own element takes the focus: it has no ring, unlike the scrolling canvas.
    if (hit) editorRoot.current?.focus({ preventScroll: true });
  };

  /**
   * A double press on the selected block goes into it: the block under the pointer, one level down,
   * is selected. The pointer is over moveable's box, so the block is looked for under it.
   */
  const enter = (event: MouseEvent<HTMLElement>) => {
    if (!selectedId) return;
    // A block whose kind has words to type on it opens them, when the pointer is over that block.
    const edit = selectedDef?.inlineText;
    const own = scope ? elementOf(scope, selectedId) : null;
    if (edit && own) {
      const rect = clientRect(own);
      const at = clientPoint(event);
      const over =
        at.x >= rect.left && at.x <= rect.right && at.y >= rect.top && at.y <= rect.bottom;
      if (over) {
        documents.settleDraft();
        selecting.setEditing({
          id: selectedId,
          prop: edit.prop,
          multiline: edit.multiline === true,
        });
        return;
      }
    }
    const point = clientPoint(event);
    const under = elementsAtClient(scope?.ownerDocument ?? document, point.x, point.y).find(
      (element) => !isMoveableLayer(element) && element.closest("[data-miditor-id]"),
    );
    const id = under?.closest<HTMLElement>("[data-miditor-id]")?.dataset.miditorId;
    const hit = id === undefined ? undefined : pickBlock(data.root, selectedId, id);
    if (!hit) return;
    selecting.selectInside(hit.id, hit.scopeId);
  };

  return { menuAt, setMenuAt, marquee, press, hover, openMenu, enter };
}
