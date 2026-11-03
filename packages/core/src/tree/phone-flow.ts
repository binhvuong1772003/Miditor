import { resolveRect } from "../position/resolve-rect";
import type { Container } from "../position/types";
import { DEVICE_WIDTH } from "./device";
import { freeBoxOf, isFreeNode } from "./free-box";
import type { TreeNode } from "./types";

/** A block no wider than this and no taller than `COMPACT_HEIGHT`, in desktop px, keeps its own width on a phone. */
export const COMPACT_WIDTH = 300;
export const COMPACT_HEIGHT = 64;

/** The side of its parent a block sits on, on the desktop: where its auto margins push it on a phone. */
export type FlowSide = "start" | "center" | "end";

/** What a free block gets on a phone that is drawn as a flow (see `isPhoneAuto`). */
export interface FlowItem {
  /** Where it comes among its siblings: reading order, in bands of blocks that overlap vertically. */
  order: number;
  /** A button, a logo, an icon: it keeps its own width, and shares a row when it fits. Else full width. */
  compact: boolean;
  side: FlowSide;
  /** Width over height on the desktop, for a block that keeps its ratio. */
  ratio: number;
  /** Its own width and height on the desktop, in px. */
  width: number;
  height: number;
  /** When it overlaps a sibling: the cluster it is drawn in, and its place in it, in percent of the cluster. */
  cluster?: string;
  place?: { left: number; top: number; width: number; height: number };
  /** When it shares a row with others: the row it is in (see `FlowBand`). */
  band?: string;
  /** Small blocks of a row that would not fit side by side share its width: this one's part of it, and the gaps to take off. */
  share?: { part: number; gaps: number };
}

/** Blocks that sit side by side on the desktop: a row of their own, so another row cannot take their room. */
export interface FlowBand {
  /** The id of the first block of the row in the tree, which stands for it. */
  id: string;
  order: number;
}

/** Blocks that overlap one another, drawn as one piece that keeps its shape (a cup made of ellipses). */
export interface FlowCluster {
  /** The id of its first member in the tree, which stands for it. */
  id: string;
  members: string[];
  order: number;
  side: FlowSide;
  /** Its width and height on the desktop, in px. */
  width: number;
  height: number;
}

/** What `phoneFlowOf` works out for the free children of one parent. */
export interface PhoneLayout {
  items: Map<string, FlowItem>;
  clusters: Map<string, FlowCluster>;
  bands: Map<string, FlowBand>;
}

/** Shapes and pictures this close (px) belong together, like the beans around a cup. */
export const NEAR = 48;
/** The room a row of small blocks has, in px, below which they share it instead of wrapping. */
export const ROW_ROOM = 330;
/** The gap between blocks of a row, in px; the same one the render draws. */
export const ROW_GAP = 12;

/**
 * Whether the page is drawn as a flow on a phone: no node in it has a placement of its own for the
 * phone. One block placed by hand there and the page keeps every other block where the shrunk desktop
 * puts it, since a block taken out of the flow would leave a hole in it.
 */
export function isPhoneAuto(root: TreeNode): boolean {
  if (isFreeNode(root) && root.phone) return false;
  return root.children.every(isPhoneAuto);
}

/** Whether any block in the tree is placed freely: a page of the flow alone has nothing to lay out for a phone. */
const hasFreeNode = (node: TreeNode): boolean =>
  node.children.some((child) => isFreeNode(child) || hasFreeNode(child));

/** Whether a phone draws this page as a flow: it has free blocks, and none is placed by hand for the phone. */
export const drawsPhoneFlow = (root: TreeNode): boolean => isPhoneAuto(root) && hasFreeNode(root);

/** The size a text gets on a phone when the page is a flow: as it is up to 20 px, half the rest above. */
export function phoneTextSize(size: number): number {
  return size <= 20 ? size : Math.round(20 + (size - 20) / 2);
}

type Placed = {
  id: string;
  type: string;
  rect: { x: number; y: number; w: number; h: number };
  /** The side a text says its words sit on, which the block sits on too. */
  align?: FlowSide;
};

const overlap = (a: Placed["rect"], b: Placed["rect"]) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const near = (a: Placed["rect"], b: Placed["rect"]) =>
  Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)) <= NEAR &&
  Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)) <= NEAR;

/** A text keeps its words on the side it says: its block sits there on a phone, not where its box happens to be. */
const alignOf = (node: TreeNode): { align?: FlowSide } => {
  const align = node.type === "Text" ? node.props.align : undefined;
  if (align === "left") return { align: "start" };
  if (align === "right") return { align: "end" };
  return align === "center" ? { align: "center" } : {};
};

const drawing = (type: string) => type === "Shape" || type === "Image";

const sideOf = (rect: Placed["rect"], width: number): FlowSide => {
  const middle = (rect.x + rect.w / 2) / (width || DEVICE_WIDTH.desktop);
  return middle < 0.4 ? "start" : middle > 0.6 ? "end" : "center";
};

/**
 * The flow of the free children of a parent, worked out from their desktop boxes in a parent of this
 * size: blocks that overlap are one cluster (unless one spans the page, like a background), clusters
 * and the other blocks come in bands from the top down (one that starts above the bottom of the band
 * before is in it), and by x inside a band.
 */
export function phoneFlowOf(parent: TreeNode, size: Container): PhoneLayout {
  const placed: Placed[] = parent.children.flatMap((child) =>
    isFreeNode(child)
      ? [
          {
            id: child.id,
            type: child.type,
            rect: resolveRect(freeBoxOf(child), size),
            ...alignOf(child),
          },
        ]
      : [],
  );
  // Overlapping blocks are joined into groups; a block as wide as the page joins nothing.
  const group = new Map(placed.map((item) => [item.id, item.id]));
  const find = (id: string): string => {
    let at = id;
    while (group.get(at) !== at) at = group.get(at) as string;
    return at;
  };
  const joinable = placed.filter((item) => item.rect.w < size.w * 0.9);
  for (let i = 0; i < joinable.length; i++) {
    for (let j = i + 1; j < joinable.length; j++) {
      const a = joinable[i] as Placed;
      const b = joinable[j] as Placed;
      // Overlapping blocks are one piece; so are shapes and pictures that are close (the beans of a cup).
      if (overlap(a.rect, b.rect) || (drawing(a.type) && drawing(b.type) && near(a.rect, b.rect))) {
        group.set(find(a.id), find(b.id));
      }
    }
  }
  const members = new Map<string, Placed[]>();
  for (const item of placed) {
    const key = find(item.id);
    members.set(key, [...(members.get(key) ?? []), item]);
  }
  // Each group is one piece with a box: the block itself, or the box that holds a cluster.
  const pieces = [...members.values()].map((group) => {
    const x = Math.min(...group.map((m) => m.rect.x));
    const y = Math.min(...group.map((m) => m.rect.y));
    const right = Math.max(...group.map((m) => m.rect.x + m.rect.w));
    const bottom = Math.max(...group.map((m) => m.rect.y + m.rect.h));
    return { group, rect: { x, y, w: right - x, h: bottom - y } };
  });
  pieces.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const bands: (typeof pieces)[] = [];
  let bottom = Number.NEGATIVE_INFINITY;
  for (const piece of pieces) {
    if (bands.length > 0 && piece.rect.y < bottom) {
      bands[bands.length - 1]?.push(piece);
      bottom = Math.max(bottom, piece.rect.y + piece.rect.h);
    } else {
      bands.push([piece]);
      bottom = piece.rect.y + piece.rect.h;
    }
  }
  const items = new Map<string, FlowItem>();
  const clusters = new Map<string, FlowCluster>();
  const bandsOut = new Map<string, FlowBand>();
  const index = new Map(parent.children.map((child, i) => [child.id, i]));
  let order = 0;
  for (const band of bands) {
    band.sort((a, b) => a.rect.x - b.rect.x);
    // A row is a box of its own when it has two or more pieces, or one that does not fill the width: a
    // small block or a cluster would otherwise share a line with a small block of the next row.
    const [only] = band;
    const shared =
      band.length > 1 ||
      (only !== undefined &&
        (only.group.length > 1 || (only.rect.w <= COMPACT_WIDTH && only.rect.h <= COMPACT_HEIGHT)));
    const bandId = shared
      ? (parent.children[
          Math.min(...band.flatMap((piece) => piece.group.map((m) => index.get(m.id) ?? 0)))
        ]?.id ?? "")
      : "";
    if (shared) bandsOut.set(bandId, { id: bandId, order });
    // Small blocks that would not fit side by side share the room of the row.
    const smalls = band.every(
      (piece) =>
        piece.group.length === 1 && piece.rect.w <= COMPACT_WIDTH && piece.rect.h <= COMPACT_HEIGHT,
    );
    const total = band.reduce((sum, piece) => sum + piece.rect.w, 0);
    const gaps = (band.length - 1) * ROW_GAP;
    const squeeze = shared && smalls && total + gaps > ROW_ROOM && total > 0;
    for (const { group, rect } of band) {
      const side = sideOf(rect, size.w);
      const first = parent.children.find((child) => group.some((m) => m.id === child.id));
      if (group.length > 1 && first) {
        clusters.set(first.id, {
          id: first.id,
          members: group.map((m) => m.id),
          order: order++,
          side,
          width: rect.w,
          height: rect.h,
        });
      }
      for (const { id, rect: own, align } of group) {
        const inCluster = group.length > 1 && rect.w > 0 && rect.h > 0;
        items.set(id, {
          order: inCluster ? -1 : order++,
          compact: own.w <= COMPACT_WIDTH && own.h <= COMPACT_HEIGHT,
          side: align ?? sideOf(own, size.w),
          ratio: own.h > 0 ? own.w / own.h : 1,
          width: own.w,
          height: own.h,
          ...(shared ? { band: bandId } : {}),
          ...(squeeze ? { share: { part: own.w / total, gaps } } : {}),
          ...(inCluster && first
            ? {
                cluster: first.id,
                place: {
                  left: ((own.x - rect.x) / rect.w) * 100,
                  top: ((own.y - rect.y) / rect.h) * 100,
                  width: (own.w / rect.w) * 100,
                  height: (own.h / rect.h) * 100,
                },
              }
            : {}),
        });
      }
    }
  }
  return { items, clusters, bands: bandsOut };
}
