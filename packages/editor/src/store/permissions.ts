import type { PageData, TreeNode } from "@midito-kitchen/core";

// What the host lets people do. A change of the page is compared with the page before it and sorted
// into kinds (added, removed, moved, edited); each kind is asked of the permission for the node
// concerned. Nothing here knows how the change was made, so every way of making one is covered.

type OnNode = boolean | ((node: TreeNode) => boolean);

export interface Permissions {
  /** Change the props or the looks of a block, or the page's own settings, theme and fonts. */
  canEdit?: OnNode;
  /** Take a block away, with what is inside it. */
  canDelete?: OnNode;
  /** Make a copy of a block. */
  canDuplicate?: OnNode;
  /** Move, resize or turn a block, change its anchors or its place among the others. */
  canDrag?: OnNode;
  /** Put a new block of this kind in `parent`. */
  canAdd?: boolean | ((parent: TreeNode, kind: string) => boolean);
}

export type Action = "edit" | "delete" | "duplicate" | "drag" | "add";

/** What was refused: the kind of change and the block it concerned (the parent, for an add). */
export type Denial = { action: Action; nodeId: string | null };

/** What the command that made the change says about it, when the pages alone cannot tell. */
export type Intent = { kind: "duplicate"; originals: readonly string[] } | undefined;

type Entry = { node: TreeNode; parentId: string | null };

function index(root: TreeNode): Map<string, Entry> {
  const found = new Map<string, Entry>();
  const walk = (node: TreeNode, parentId: string | null) => {
    found.set(node.id, { node, parentId });
    for (const child of node.children) walk(child, node.id);
  };
  walk(root, null);
  return found;
}

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((key) => left[key] !== undefined);
  const others = Object.keys(right).filter((key) => right[key] !== undefined);
  return keys.length === others.length && keys.every((key) => same(left[key], right[key]));
}

/** Answers for a node are kept while the node object and the function are the same. */
const answers = new WeakMap<object, WeakMap<object, boolean>>();

function allowed(permission: OnNode | undefined, node: TreeNode): boolean {
  if (permission === undefined) return true;
  if (typeof permission === "boolean") return permission;
  let byNode = answers.get(permission);
  if (!byNode) {
    byNode = new WeakMap();
    answers.set(permission, byNode);
  }
  const known = byNode.get(node);
  if (known !== undefined) return known;
  const answer = permission(node);
  byNode.set(node, answer);
  return answer;
}

/** Where a block is, how big, turned how, placed how on the phone: all that `canDrag` is about. */
const placed = (node: TreeNode) => ({
  position: node.position,
  size: node.size,
  rotation: node.rotation,
  phone: node.phone,
  lockRatio: node.lockRatio,
});

/** What `canEdit` is about: the content and the looks of a block. */
const content = (node: TreeNode) => ({
  props: node.props,
  phoneProps: node.phoneProps,
  styles: node.styles,
});

/** The place of each block among the siblings that stayed with its parent, before and after. */
function ranks(parent: TreeNode, other: Map<string, Entry>): Map<string, number> {
  const kept = parent.children.filter((child) => other.get(child.id)?.parentId === parent.id);
  return new Map(kept.map((child, at) => [child.id, at]));
}

/**
 * The first thing the change does that the permissions refuse, or `null` when they allow all of it (or
 * there are none). A change is allowed whole or not at all.
 */
export function guard(
  before: PageData,
  after: PageData,
  permissions: Permissions | undefined,
  intent?: Intent,
): Denial | null {
  if (!permissions || before === after) return null;
  const was = index(before.root);
  const now = index(after.root);

  // Added: only the root of a new subtree is asked.
  if (intent?.kind !== "duplicate") {
    for (const [id, entry] of now) {
      if (was.has(id) || entry.parentId === null || !was.has(entry.parentId)) continue;
      const parent = now.get(entry.parentId)?.node as TreeNode;
      const ok =
        permissions.canAdd === undefined ||
        (typeof permissions.canAdd === "boolean"
          ? permissions.canAdd
          : permissions.canAdd(parent, entry.node.type));
      if (!ok) return { action: "add", nodeId: parent.id };
    }
  }

  // Removed: only the root of a removed subtree is asked.
  for (const [id, entry] of was) {
    if (now.has(id) || entry.parentId === null || !now.has(entry.parentId)) continue;
    if (!allowed(permissions.canDelete, entry.node)) return { action: "delete", nodeId: id };
  }

  if (intent?.kind === "duplicate") {
    for (const id of intent.originals) {
      const original = was.get(id)?.node;
      if (original && !allowed(permissions.canDuplicate, original)) {
        return { action: "duplicate", nodeId: id };
      }
    }
  }

  // Blocks that are still there: moved, then edited.
  const rankBefore = new Map<string, number>();
  const rankAfter = new Map<string, number>();
  for (const [id, entry] of was) {
    if (entry.node.children.length === 0 || !now.has(id)) continue;
    const after = (now.get(id) as Entry).node;
    for (const [child, at] of ranks(entry.node, now)) rankBefore.set(child, at);
    for (const [child, at] of ranks(after, was)) rankAfter.set(child, at);
  }
  for (const [id, entry] of was) {
    const next = now.get(id);
    if (!next) continue;
    const moved =
      entry.parentId !== next.parentId ||
      !same(placed(entry.node), placed(next.node)) ||
      rankBefore.get(id) !== rankAfter.get(id);
    if (moved && !allowed(permissions.canDrag, entry.node)) return { action: "drag", nodeId: id };
    if (
      !same(content(entry.node), content(next.node)) &&
      !allowed(permissions.canEdit, entry.node)
    ) {
      return { action: "edit", nodeId: id };
    }
  }

  // The page's own theme and information belong to the root.
  if (
    (!same(before.theme, after.theme) || !same(before.meta, after.meta)) &&
    !allowed(permissions.canEdit, before.root)
  ) {
    return { action: "edit", nodeId: before.root.id };
  }
  return null;
}
