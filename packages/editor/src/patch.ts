import type {
  BackgroundPosition,
  BackgroundRepeat,
  BackgroundSize,
  JsonValue,
} from "@miditor/core";

/** One change to the background picture of a block, made by a field below. `undefined` removes it. */
export type BackgroundPatch =
  | { key: "backgroundImage"; value: string | undefined }
  | { key: "backgroundSize"; value: BackgroundSize }
  | { key: "backgroundPosition"; value: BackgroundPosition }
  | { key: "backgroundRepeat"; value: BackgroundRepeat };

/** One style of one node, and the value it should have. `undefined` removes the style. */
export type StylePatch =
  | { key: "background" | "borderColor"; value: string | undefined }
  | { key: "borderWidth" | "borderRadius" | "minHeight"; value: number | undefined }
  | BackgroundPatch;

/** What the panel changes besides styles: the rotation, which every free node has and never loses. */
export type RotationPatch = { key: "rotation"; value: number };

/** Whether resizing keeps the proportions of this block. `undefined` takes the choice back to its kind's. */
export type LockRatioPatch = { key: "lockRatio"; value: boolean | undefined };

/** The phone gets a placement of its own for this block, to start from the one it has now. */
export type PhoneLayoutPatch = { key: "phoneLayout"; value: "separate" };

/** One prop of the node, set by a field that its kind in the registry declares. */
export type PropPatch = { key: "prop"; name: string; value: JsonValue };

/** One change to one node, from any field of the panel. */
export type PanelPatch = StylePatch | RotationPatch | PropPatch | LockRatioPatch | PhoneLayoutPatch;
