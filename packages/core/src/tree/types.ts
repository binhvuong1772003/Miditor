import type { Axis, FreeBox, Size } from "../position/types";
import type { BackgroundPosition, BackgroundRepeat, BackgroundSize } from "../styles/background";
import type { PageMeta } from "../styles/page-meta";
import type { Theme } from "../styles/theme";

/** Anything that survives `JSON.stringify` and `JSON.parse` unchanged. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * How a node looks. Every value is typed: a colour is a stored `#rrggbb` or a reference to a colour
 * of the page's theme such as `@primary` (see `isColorValue`) and a
 * length is a number of px (see `isPixelLength`), never free-form CSS. More fields (border, radius, text) come when something can edit and draw them.
 */
export interface NodeStyles {
  /** The fill colour, stored as `#rrggbb` in lowercase, or a theme colour such as `@primary`. */
  background?: string;
  /** The border width in px, from 0 to `MAX_PIXEL_LENGTH`. Without it nothing is drawn. */
  borderWidth?: number;
  /**
   * How tall the page is, in px, on the root only: a whole number from `MIN_PAGE_HEIGHT` to
   * `MAX_PAGE_HEIGHT`. Without it the page is as tall as the editor and the host make it.
   */
  minHeight?: number;
  /** The border colour, stored as `#rrggbb` or a theme colour. A border without one is drawn in the text colour. */
  borderColor?: string;
  /** The radius of all four corners in px, from 0 to `MAX_PIXEL_LENGTH`. */
  borderRadius?: number;
  /**
   * A picture behind the block's content and over its fill colour: an address `isImageUrl` accepts.
   * Nothing but an address can be set, so no CSS goes in with it.
   */
  backgroundImage?: string;
  /** How the background picture is sized. Without it, `cover`. */
  backgroundSize?: BackgroundSize;
  /** Where the background picture sits. Without it, `center`. */
  backgroundPosition?: BackgroundPosition;
  /** Whether the background picture is tiled. Without it, `no-repeat`. */
  backgroundRepeat?: BackgroundRepeat;
}

/** What every node has, whatever the way it is placed. */
interface NodeBase {
  /** Unique in the whole tree, made by the client. */
  id: string;
  /** The kind of component; the registry decides which kinds exist and what they may hold. */
  type: string;
  /** The content of the component, for example the text of a heading. */
  props: Record<string, JsonValue>;
  /**
   * Props that a person set by hand for the phone, over the ones above: only the props of a field that
   * is marked `perDevice` in the registry. Without it, or for a prop that is not in it, the phone has
   * the same value as the desktop. See `propsFor`.
   */
  phoneProps?: Record<string, JsonValue>;
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
  phone?: never;
  lockRatio?: never;
}

/** A node placed by constraints against its container. It needs a size and a rotation. */
export interface FreeNode extends NodeBase {
  position: { mode: "free"; x: Axis; y: Axis };
  size: { w: Size; h: Size };
  /** Degrees, around the centre of the unrotated rect. */
  rotation: number;
  /**
   * The placement on a phone, when a person set it by hand there: all of the position, the size and
   * the rotation, as `FreeBox` has them. Without it the phone gets its placement from the one above.
   */
  phone?: FreeBox;
  /**
   * Whether resizing keeps the width to height ratio of this block. Without it the block follows its
   * kind (`ComponentDef.lockRatio`). See `keepsRatio`.
   */
  lockRatio?: boolean;
}

/** A nested tree: a node holds its children directly. */
export type TreeNode = FlowNode | FreeNode;

/** The whole saved page. Plain JSON. */
export interface PageData {
  schemaVersion: number;
  root: TreeNode;
  /** The colours and fonts the blocks can share. Without it a page has only the colours it holds. */
  theme?: Theme;
  /** The title, description and share picture of the page. Without it a page says nothing about itself. */
  meta?: PageMeta;
}
