import {
  boxFor,
  type Device,
  type FreeBox,
  type FreeNode,
  isFreeNode,
  type PageData,
  type Registry,
  type TreeNode,
  updateNode,
  withFreeBox,
  withLockRatio,
  withPhoneBox,
  withPhoneProp,
  withStyle,
} from "@midito-kitchen/core";
import type { PanelPatch, StylePatch } from "../patch";
import type { Draft } from "./state";

/**
 * The node with one style set. A switch, not one call: each case hands `withStyle` a key and a value
 * that TypeScript can tell go together.
 */
const withStylePatch = (node: TreeNode, patch: StylePatch): TreeNode => {
  switch (patch.key) {
    case "background":
    case "borderColor":
      return withStyle(node, patch.key, patch.value);
    case "borderWidth":
    case "borderRadius":
    case "minHeight":
      return withStyle(node, patch.key, patch.value);
    case "backgroundImage":
      return withStyle(node, "backgroundImage", patch.value);
    case "backgroundSize":
      return withStyle(node, "backgroundSize", patch.value);
    case "backgroundPosition":
      return withStyle(node, "backgroundPosition", patch.value);
    case "backgroundRepeat":
      return withStyle(node, "backgroundRepeat", patch.value);
  }
};

/**
 * The free node with the placement `box` for this screen: its own placement on the desktop, the one
 * set by hand for the phone on a phone, so a change made on a phone leaves the desktop as it was.
 */
export const withBoxFor = (node: FreeNode, device: Device, box: FreeBox): FreeNode =>
  device === "phone" ? withPhoneBox(node, box) : withFreeBox(node, box);

/** The node with the change of a patch applied. A rotation only changes a free node, on this screen. */
export const applyPatch = (
  node: TreeNode,
  patch: PanelPatch,
  device: Device,
  registry: Registry,
): TreeNode => {
  if (patch.key === "prop") {
    // A prop marked perDevice is kept apart for the phone, so the desktop keeps its own value.
    const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
    const field = def && Object.hasOwn(def.fields, patch.name) ? def.fields[patch.name] : undefined;
    if (device === "phone" && field?.perDevice === true) {
      return withPhoneProp(node, patch.name, patch.value);
    }
    return node.props[patch.name] === patch.value
      ? node
      : { ...node, props: { ...node.props, [patch.name]: patch.value } };
  }
  if (patch.key === "rotation") {
    if (!isFreeNode(node)) return node;
    const box = boxFor(node, device);
    return box.rotation === patch.value
      ? node
      : withBoxFor(node, device, { ...box, rotation: patch.value });
  }
  if (patch.key === "lockRatio") {
    return isFreeNode(node) ? withLockRatio(node, patch.value) : node;
  }
  if (patch.key === "phoneLayout") {
    // The phone starts from the placement it has now, which is made from the desktop one.
    return isFreeNode(node) && !node.phone ? withPhoneBox(node, boxFor(node, "phone")) : node;
  }
  return withStylePatch(node, patch);
};

/** The page with a pending change applied, for drawing it or for storing it. */
export const withDraft = (
  data: PageData,
  draft: Draft,
  device: Device,
  registry: Registry,
): PageData => ({
  ...data,
  root: updateNode(data.root, draft.id, (n) => applyPatch(n, draft, device, registry)),
});
