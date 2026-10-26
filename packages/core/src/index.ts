export { cssFor, type PositionStyle } from "./position/css-for";
export { inferBox } from "./position/infer-box";
export { moveRect } from "./position/move-rect";
export { resolveRect } from "./position/resolve-rect";
export type { Axis, Container, FreeBox, Rect, Size } from "./position/types";
export { isHexColor, parseHexColor } from "./styles/hex-color";
export { freeBoxOf, isFreeNode, withFreeBox } from "./tree/free-box";
export { findNode, updateNode } from "./tree/nodes";
export type { FlowNode, FreeNode, JsonValue, PageData, TreeNode } from "./tree/types";

export const SCHEMA_VERSION = 1;
