import type { Axis, Size } from "../position/types";

/** Anything that survives `JSON.stringify` and `JSON.parse` unchanged. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * How a node looks. Every value is typed: a colour is a stored `#rrggbb` (see `isHexColor`), never
 * free-form CSS. More fields (border, radius, text) come when something can edit and draw them.
 */
export interface NodeStyles {
  /** The fill colour, stored as `#rrggbb` in lowercase. */
  background?: string;
}

/** What every node has, whatever the way it is placed. */
interface NodeBase {
  /** Unique in the whole tree, made by the client. */
  id: string;
  /** The kind of component; the registry decides which kinds exist and what they may hold. */
  type: string;
  /** The content of the component, for example the text of a heading. */
  props: Record<string, JsonValue>;
  /** How the node looks. Always present, `{}` when nothing is set. */
  styles: NodeStyles;
  /** Always present, empty for a leaf. Which kinds may hold children is the registry's decision. */
  children: TreeNode[];
}

/**
 * A node the parent's own layout (flex) places. It has no coordinates, size or rotation of its own:
 * the `never` fields stop a free node's data from being stored on it by mistake.
 */
export interface FlowNode extends NodeBase {
  position: { mode: "flow"; x?: never; y?: never };
  size?: never;
  rotation?: never;
}

/** A node placed by constraints against its container. It needs a size and a rotation. */
export interface FreeNode extends NodeBase {
  position: { mode: "free"; x: Axis; y: Axis };
  size: { w: Size; h: Size };
  /** Degrees, around the centre of the unrotated rect. */
  rotation: number;
}

/** A nested tree: a node holds its children directly. */
export type TreeNode = FlowNode | FreeNode;

/** The whole saved page. Plain JSON. */
export interface PageData {
  schemaVersion: number;
  root: TreeNode;
}
