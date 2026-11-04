import {
  boxFor,
  type Container,
  canMove,
  drawsPhoneFlow,
  type Frame,
  type FreeNode,
  findNode,
  isFreeNode,
  moveRect,
  type PageData,
  parentOf,
  type Rect,
  type Registry,
  resizeRotated,
  resolveRect,
  turnOf,
} from "@miditor/core";
import { useRef, useState } from "react";
import { isHtmlElement } from "../dom";
import { type Gap, gapsAround } from "../gaps";
import { centreOf, rectAt, turnGroup } from "../group-math";
import { drawnBox, freezeRoot } from "../phone-freeze";
import type { useDocumentCommands } from "../store";
import { onWindows } from "./client-rect";
import { elementOf } from "./element-of";
import type { ResizeResult, SelectionControls } from "./SelectionBox";

/** The frame laid over several selected blocks (see `groupInfo` in the editor). */
export interface GroupInfo {
  placed: { node: FreeNode; rect: Rect; rotation: number }[];
  container: Container;
  pivot: { x: number; y: number };
}

export interface GesturesInput {
  workspace: HTMLElement | null;
  /** The element of the selected block. */
  block: HTMLElement | null;
  groupInfo: GroupInfo | null;
  data: PageData;
  registry: Registry;
  frame: "desktop" | "phone";
  zoom: number;
  selectedId: string | null;
  picked: readonly string[];
  hoverId: string | null;
  onPhone: boolean;
  documents: ReturnType<typeof useDocumentCommands>;
}

/**
 * The drags, resizes and turns of the selected blocks, and the hints they draw while they are on:
 * the distances to the neighbours, the block a drag would drop into. A gesture ends by storing the
 * boxes it ended in, once, through `documents`.
 */
export function useGestures({
  workspace,
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
}: GesturesInput) {
  // A drag of the selected blocks is on, from the press to the release.
  const [dragging, setDragging] = useState(false);
  // A press that just selected a block, still down: it goes on to drag the block once the box has it.
  const dragControls = useRef<SelectionControls | null>(null);
  // Whether the last press on the frame really moved or turned the blocks, or was only a click.
  const groupMoved = useRef(false);
  const pendingDrag = useRef<{ press: globalThis.PointerEvent; up: boolean } | null>(null);
  // The distances to what is next to the block being dragged, and where they are on the screen.
  const [measure, setMeasure] = useState<{
    gaps: Gap[];
    origin: { left: number; top: number; scale: number };
  } | null>(null);
  // The block a dragged block would go into if it were dropped now. A hint only, not in the data.
  const [dropId, setDropId] = useState<string | null>(null);
  const groupGesture = useRef<{
    members: {
      node: FreeNode;
      rect: Rect;
      rotation: number;
      el: HTMLElement | null;
      transform: string;
    }[];
    container: Container;
    pivot: { x: number; y: number };
    /** Whether the gesture really moved or turned the blocks, for a plain press to tell from a drag. */
    changed: boolean;
  } | null>(null);
  const gesture = useRef<{
    before: FreeNode;
    start: Rect;
    container: Container;
    /** Where the block was on the screen when the gesture began. */
    screen: DOMRect;
    /** The other selected blocks, which a drag moves along. */
    others: { before: FreeNode; start: Rect }[];
  } | null>(null);

  // A phone that draws the page as a flow puts a block where the flow does, not where its data say:
  // what a gesture starts from is then what is drawn, read from the element.
  const flowing = frame === "phone" && drawsPhoneFlow(data.root) && workspace !== null;
  const drawnRect = (node: FreeNode): Rect | null => {
    const element = flowing && workspace ? elementOf(workspace, node.id) : null;
    return element ? drawnBox(element) : null;
  };
  const rectOf = (node: FreeNode, container: Container): Rect =>
    drawnRect(node) ?? resolveRect(boxFor(node, frame), container);
  /** The block as a gesture sees it before it begins: placed where it is drawn, when the page is a flow. */
  const placedBefore = (node: FreeNode): FreeNode => {
    const rect = drawnRect(node);
    return rect ? (freezeRoot(node, new Map([[node.id, rect]])) as FreeNode) : node;
  };

  /** A drag or a resize begins: remember the rect it starts from and the box it is measured in. */
  const startGesture = () => {
    if (groupInfo && workspace) {
      groupGesture.current = {
        members: groupInfo.placed.map((item) => {
          const el = elementOf(workspace, item.node.id);
          return { ...item, el, transform: el?.style.transform ?? "" };
        }),
        container: groupInfo.container,
        pivot: groupInfo.pivot,
        changed: false,
      };
    }
    setDragging(true);
    const over = () => {
      setDragging(false);
      // A press on the selected block that never became a drag leaves no end event to clear the
      // gesture, and the keys of the editor would wait for it for ever. Moveable's own end event
      // comes first, so only what it left behind is cleared.
      setTimeout(() => {
        gesture.current = null;
        groupGesture.current = null;
      }, 0);
      stopUp();
      stopCancel();
    };
    const stopUp = onWindows(workspace, "pointerup", over);
    const stopCancel = onWindows(workspace, "pointercancel", over);
    // A group has its own gesture, above; nothing of a single block's is made for it.
    if (groupGesture.current) return;
    const node = selectedId ? findNode(data.root, selectedId) : undefined;
    const parent = block?.parentElement;
    if (!node || !isFreeNode(node) || !parent) return;
    // The padding box of the node's real parent, which is what the position maths measure from.
    const container = { w: parent.clientWidth, h: parent.clientHeight };
    gesture.current = {
      before: placedBefore(node),
      start: rectOf(node, container),
      container,
      screen: block?.getBoundingClientRect() ?? new DOMRect(),
      others: picked.flatMap((id) => {
        const other = findNode(data.root, id);
        return other && isFreeNode(other)
          ? [{ before: placedBefore(other), start: rectOf(other, container) }]
          : [];
      }),
    };
  };

  /** Store the box a gesture ended in, once. `next` says which rect that is. */
  const endGesture = (next: (g: NonNullable<typeof gesture.current>) => Rect) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    documents.placeBoxes({ items: [{ before: g.before, rect: next(g) }], container: g.container });
  };

  /**
   * The block a dragged block was dropped on, with the sizes to measure in, or `undefined` when it
   * stays in its parent: on the phone, over its own parent or over nothing, over a block that may not
   * hold it. A parent may be turned: both are measured as frames.
   */
  const dropTarget = (g: NonNullable<typeof gesture.current>, dist: { x: number; y: number }) => {
    const from = block?.parentElement;
    if (onPhone || !block || !from || g.others.length > 0) return undefined;
    // `dist` is in the page's own px; the screen is `zoom` times that.
    const x = g.screen.left + g.screen.width / 2 + dist.x * zoom;
    const y = g.screen.top + g.screen.height / 2 + dist.y * zoom;
    // Topmost first, so the deepest block under the pointer is met before the ones around it.
    const under = block.ownerDocument
      .elementsFromPoint(x, y)
      .filter((el): el is HTMLElement => isHtmlElement(el) && el.dataset.miditorId !== undefined);
    const hit = under.find((el) =>
      canMove(registry, data.root, g.before.id, el.dataset.miditorId as string),
    );
    const id = hit?.dataset.miditorId;
    if (!hit || id === undefined || id === parentOf(data.root, g.before.id)?.id) return undefined;
    // Each parent as a frame on the screen: its padding box, where its middle is (the middle of a
    // turned element is the middle of the box around it) and how far it and its parents are turned.
    const frameOf = (el: HTMLElement): Frame => {
      const box = el.getBoundingClientRect();
      return {
        size: { w: el.clientWidth, h: el.clientHeight },
        center: { x: (box.left + box.width / 2) / zoom, y: (box.top + box.height / 2) / zoom },
        rotation: turnOf(data.root, el.dataset.miditorId ?? "", frame),
      };
    };
    return { id, options: { from: frameOf(from), to: frameOf(hit) } };
  };

  /**
   * The distances from the dragged block to the blocks next to it and to the edges of its parent, in
   * the parent's own px, with where the parent is on the screen. Nothing for several blocks, for a
   * parent that is turned (its px are not upright on the screen) or when there is no parent.
   */
  const measureAround = (
    g: NonNullable<typeof gesture.current>,
    dist: { x: number; y: number },
  ) => {
    const parentNode = parentOf(data.root, g.before.id);
    const parentElement = block?.parentElement;
    if (!parentNode || !parentElement || g.others.length > 0) return null;
    if (turnOf(data.root, parentNode.id, frame) !== 0) return null;
    const moving = moveRect(g.start, dist, boxFor(g.before, frame).rotation);
    const others = parentNode.children.flatMap((child) =>
      child.id !== g.before.id && isFreeNode(child) ? [rectOf(child, g.container)] : [],
    );
    const box = parentElement.getBoundingClientRect();
    return {
      gaps: gapsAround(moving, others, { x: 0, y: 0, w: g.container.w, h: g.container.h }),
      origin: {
        left: box.left + parentElement.clientLeft * zoom,
        top: box.top + parentElement.clientTop * zoom,
        scale: zoom,
      },
    };
  };

  /**
   * With Alt held and a block selected, the distances to the block the pointer rests on, when both
   * are free blocks of the same parent: the same lines as while dragging, for measuring a layout
   * without moving anything.
   */
  const measureBetween = () => {
    if (!block || !selectedId || !hoverId || hoverId === selectedId) return null;
    const parentNode = parentOf(data.root, selectedId);
    const parentElement = block.parentElement;
    if (!parentNode || !parentElement || parentOf(data.root, hoverId)?.id !== parentNode.id) {
      return null;
    }
    if (picked.length > 0 || turnOf(data.root, parentNode.id, frame) !== 0) return null;
    const own = findNode(data.root, selectedId);
    const other = findNode(data.root, hoverId);
    if (!own || !other || !isFreeNode(own) || !isFreeNode(other)) return null;
    const container = { w: parentElement.clientWidth, h: parentElement.clientHeight };
    const box = parentElement.getBoundingClientRect();
    return {
      gaps: gapsAround(rectOf(own, container), [rectOf(other, container)], {
        x: 0,
        y: 0,
        w: container.w,
        h: container.h,
      }),
      origin: {
        left: box.left + parentElement.clientLeft * zoom,
        top: box.top + parentElement.clientTop * zoom,
        scale: zoom,
      },
    };
  };

  /** Tell the page where a drag would drop, so the block there is outlined. Only a changed target is stored. */
  const dragMove = (dist: { x: number; y: number } | null) => {
    const g = gesture.current;
    setMeasure(g && dist ? measureAround(g, dist) : null);
    setDropId(g && dist ? (dropTarget(g, dist)?.id ?? null) : null);
  };

  /** The blocks of the frame shown turned with it, around its middle; `null` puts them back. */
  const previewGroupTurn = (turn: number | null) => {
    const gg = groupGesture.current;
    if (!gg) return;
    const turned =
      turn === null
        ? null
        : turnGroup(
            gg.members.map((member) => ({ rect: member.rect, rotation: member.rotation })),
            gg.pivot,
            turn,
          );
    gg.members.forEach((member, i) => {
      if (!member.el) return;
      const t = turned?.[i];
      if (!t || turn === null) {
        member.el.style.removeProperty("translate");
        member.el.style.transform = member.transform;
        return;
      }
      const middle = centreOf(member.rect);
      // `translate` is applied before the block's own `rotate`, so the shift is not turned with it.
      member.el.style.translate = `${t.centre.x - middle.x}px ${t.centre.y - middle.y}px`;
      member.el.style.transform = `rotate(${turn}deg)`;
    });
  };

  /**
   * The blocks of the frame, each one's box worked out from where its middle and turn are now, and
   * stored in one step. The previews the frame put on the blocks are taken off first.
   */
  const endGroup = (
    place: (member: NonNullable<typeof groupGesture.current>["members"][number]) => {
      rect: Rect;
      rotation: number;
    },
  ) => {
    const gg = groupGesture.current;
    if (!gg) return;
    groupGesture.current = null;
    gg.changed = true;
    documents.placeBoxes({
      items: gg.members.map((member) => {
        const next = place(member);
        return { before: member.node, rect: next.rect, rotation: next.rotation };
      }),
      container: gg.container,
    });
  };

  const endDrag = (dist: { x: number; y: number }) => {
    if (groupGesture.current) {
      // The frame is not scaled by the zoom, the page is: a distance on the screen is `zoom` times less in the page.
      const dx = dist.x / zoom;
      const dy = dist.y / zoom;
      groupMoved.current = true;
      endGroup((member) => ({
        rect: { ...member.rect, x: member.rect.x + dx, y: member.rect.y + dy },
        rotation: member.rotation,
      }));
      return;
    }
    const g = gesture.current;
    if (g && g.others.length > 0) {
      // Several blocks: all move by the same distance on the screen, and stay in their parent.
      gesture.current = null;
      const turn = boxFor(g.before, frame).rotation;
      const all = [{ before: g.before, start: g.start }, ...g.others];
      documents.placeBoxes({
        items: all.map(({ before, start }) => ({ before, rect: moveRect(start, dist, turn) })),
        container: g.container,
      });
      return;
    }
    const target = g ? dropTarget(g, dist) : undefined;
    if (!g || !target) {
      endGesture((done) => moveRect(done.start, dist, boxFor(done.before, frame).rotation));
      return;
    }
    gesture.current = null;
    documents.moveToParent({
      before: g.before,
      rect: moveRect(g.start, dist, boxFor(g.before, frame).rotation),
      container: g.container,
      targetId: target.id,
      options: target.options,
    });
  };

  // Position maths ignore the rotation, so a turn only changes the angle: no `inferBox`.
  const endRotate = (dist: number) => {
    const gg = groupGesture.current;
    if (gg) {
      groupMoved.current = true;
      const turned = turnGroup(
        gg.members.map((member) => ({ rect: member.rect, rotation: member.rotation })),
        gg.pivot,
        dist,
      );
      endGroup((member) => {
        const at = gg.members.indexOf(member);
        const t = turned[at];
        return t
          ? { rect: rectAt(member.rect, t.centre), rotation: t.rotation }
          : { rect: member.rect, rotation: member.rotation };
      });
      return;
    }
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    documents.turnBlock({ id: g.before.id, rotation: boxFor(g.before, frame).rotation + dist });
  };

  const endResize = ({ w, h, handle }: ResizeResult) =>
    endGesture((g) => resizeRotated(g.start, boxFor(g.before, frame).rotation, handle, w, h));

  return {
    dragging,
    measure,
    dropId,
    setDropId,
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
  };
}
