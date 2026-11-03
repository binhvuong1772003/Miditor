import {
  type AlignTo,
  type AxisAnchor,
  alignRects,
  boxFor,
  distributeRects,
  drawsPhoneFlow,
  type Frame,
  type FreeNode,
  findNode,
  inferBox,
  isFreeNode,
  keepsRatio,
  minSize,
  normalizeAngle,
  type PageData,
  type Rect,
  reparentNode,
  resolveRect,
  setAnchor,
  type TreeNode,
  updateNode,
  withPhoneBox,
  withPhoneProp,
  withRect,
} from "@miditor/core";
import type { History } from "../history";
import { nudgeRect } from "../nudge";
import { freezeRoot } from "../phone-freeze";
import { withBoxFor } from "./apply-patch";
import { change } from "./change";
import type { EditorStore } from "./create-editor-store";
import { type Env, edit, editInLastStep, runner } from "./document";
import { type Size, type State, settle } from "./structure";

// The commands that put blocks somewhere: lining up, nudging, typed numbers, anchors, the phone layout
// and the end of a drag, a resize or a turn. The part that took the measures (the size of the parent
// of the selected block, the rect a gesture started from) hands them in.

const rootOf = (state: State): TreeNode => state.history.present.root;
const withRoot =
  (make: (root: TreeNode) => TreeNode) =>
  (page: PageData): PageData => {
    const root = make(page.root);
    return root === page.root ? page : { ...page, root };
  };

/** The selected block and the ones picked with it, the main one first. */
const selection = (state: State): string[] =>
  state.selectedId === null ? [] : [state.selectedId, ...state.picked];

/**
 * The selected blocks moved by `make`, which is given where they are in their parent and answers where
 * they should be. One step of history, or part of the one before when `merge` is set, so a run of
 * small moves such as a held arrow key is one step to undo. Only free blocks have a place to change.
 */
export function arrangeSelected<S extends State>(
  state: S,
  args: {
    container: Size | null;
    make: (rects: Rect[], container: Size) => Rect[];
    merge?: boolean;
  },
  env: Env,
): S {
  const { container } = args;
  if (!state.selectedId || state.selectedId === rootOf(state).id || !container) return state;
  const settled = settle(state, env);
  const ids = selection(settled);
  const frame = settled.frame;
  const change = withRoot((root) => {
    const nodes = ids.flatMap((id) => {
      const node = findNode(root, id);
      return node && isFreeNode(node) ? [node] : [];
    });
    if (nodes.length === 0) return root;
    const next = args.make(
      nodes.map((node) => resolveRect(boxFor(node, frame), container)),
      container,
    );
    return nodes.reduce(
      (tree, node, i) =>
        updateNode(tree, node.id, (current) =>
          isFreeNode(current) && next[i]
            ? withBoxFor(current, frame, inferBox(boxFor(current, frame), next[i], container))
            : current,
        ),
      root,
    );
  });
  return args.merge ? editInLastStep(settled, change, env) : edit(settled, change, env);
}

/** Line the selected blocks up with each other, or one block with its parent. */
export const alignSelected = <S extends State>(
  state: S,
  args: { container: Size | null; to: AlignTo },
  env: Env,
): S =>
  arrangeSelected(
    state,
    {
      container: args.container,
      make: (rects, container) =>
        alignRects(
          rects,
          args.to,
          state.picked.length === 0 ? { x: 0, y: 0, w: container.w, h: container.h } : undefined,
        ),
    },
    env,
  );

/** Equal gaps between three or more selected blocks. */
export const distributeSelected = <S extends State>(
  state: S,
  args: { container: Size | null; axis: "x" | "y" },
  env: Env,
): S =>
  state.picked.length < 2
    ? state
    : arrangeSelected(
        state,
        { container: args.container, make: (rects) => distributeRects(rects, args.axis) },
        env,
      );

/** The arrow keys: the selected blocks a step further, `merge` when it goes on a run of presses. */
export const nudgeSelected = <S extends State>(
  state: S,
  args: { container: Size | null; key: string; shift: boolean; merge: boolean },
  env: Env,
): S =>
  arrangeSelected(
    state,
    {
      container: args.container,
      merge: args.merge,
      make: (rects) => rects.map((rect) => nudgeRect(rect, args.key, args.shift)),
    },
    env,
  );

/** Anchor one axis of the selected free block another way; it stays where it is on the page. */
export function changeAnchor<S extends State>(
  state: S,
  args: { axis: "x" | "y"; anchor: AxisAnchor; container: Size | null },
  env: Env,
): S {
  const selected = state.selectedId ? findNode(rootOf(state), state.selectedId) : undefined;
  if (!selected || !isFreeNode(selected) || !args.container) return state;
  const settled = settle(state, env);
  const { container } = args;
  const frame = settled.frame;
  return edit(
    settled,
    withRoot((root) =>
      updateNode(root, selected.id, (n) => {
        if (!isFreeNode(n)) return n;
        const before = boxFor(n, frame);
        const after = setAnchor(before, args.axis, args.anchor, container);
        return after === before ? n : withBoxFor(n, frame, after);
      }),
    ),
    env,
  );
}

/** The selected block gets its automatic phone placement again; the desktop one is not touched. */
export function resetPhone<S extends State>(state: S, env: Env): S {
  const selected = state.selectedId ? findNode(rootOf(state), state.selectedId) : undefined;
  if (!selected) return state;
  const placed = isFreeNode(selected) && selected.phone !== undefined;
  if (!placed && !selected.phoneProps) return state;
  const id = selected.id;
  return edit(
    state,
    withRoot((root) =>
      updateNode(root, id, (n) =>
        Object.keys(n.phoneProps ?? {}).reduce(
          (node, name) => withPhoneProp(node, name, undefined),
          isFreeNode(n) ? withPhoneBox(n, undefined) : n,
        ),
      ),
    ),
    env,
  );
}

/** The node, and the nodes in it, with no placement and no text size of their own for the phone. */
function withoutPhone(node: TreeNode): TreeNode {
  const children = node.children.map(withoutPhone);
  const same = children.every((child, i) => child === node.children[i]);
  let next: TreeNode = same ? node : { ...node, children };
  if (isFreeNode(next)) next = withPhoneBox(next, undefined);
  return withPhoneProp(next, "size", undefined);
}

/**
 * Every block gives back what it was set for the phone, so no block has a place of its own there and
 * a phone that draws the page as a flow draws this one as a flow again. One step of history.
 */
export function arrangePhone<S extends State>(state: S, env: Env): S {
  return edit(state, withRoot(withoutPhone), env);
}

/**
 * A number of the rect of the selected block was typed: x, y, width or height. `withRect` works out the
 * placement for this screen, with the proportions kept when the block keeps them, and one that changes
 * nothing stores nothing.
 */
export function setRect<S extends State>(
  state: S,
  args: { field: "x" | "y" | "w" | "h"; value: number; container: Size | null },
  env: Env,
): S {
  const selected = state.selectedId ? findNode(rootOf(state), state.selectedId) : undefined;
  if (!selected || !isFreeNode(selected) || !args.container) return state;
  const settled = settle(state, env);
  const def = Object.hasOwn(env.registry, selected.type) ? env.registry[selected.type] : undefined;
  const options = { minSize: minSize(selected.styles), lockRatio: keepsRatio(selected, def) };
  const { container } = args;
  const frame = settled.frame;
  return edit(
    settled,
    withRoot((root) =>
      updateNode(root, selected.id, (n) => {
        if (!isFreeNode(n)) return n;
        const before = boxFor(n, frame);
        const after = withRect(before, { [args.field]: args.value }, container, options);
        return after === before ? n : withBoxFor(n, frame, after);
      }),
    ),
    env,
  );
}

/** A block of a gesture: how it was when the gesture began, and the rect it ends in. */
export type Placed = { before: FreeNode; rect: Rect; rotation?: number };

/**
 * Where drags, resizes and turns of one or several blocks ended: each block's box is worked out from
 * its rect, in the px of the parent (`container`), and the box it had when the gesture began. With a
 * `rotation` the block is turned to it. All of them are one step.
 */
export function placeBoxes<S extends State>(
  state: S,
  args: { items: readonly Placed[]; container: Size },
  env: Env,
): S {
  const frame = state.frame;
  return edit(
    state,
    withRoot((root) =>
      args.items.reduce(
        (tree, item) =>
          updateNode(tree, item.before.id, (n) => {
            if (!isFreeNode(n)) return n;
            const box = inferBox(boxFor(item.before, frame), item.rect, args.container);
            return withBoxFor(
              n,
              frame,
              item.rotation === undefined
                ? box
                : { ...box, rotation: normalizeAngle(item.rotation) },
            );
          }),
        root,
      ),
    ),
    env,
  );
}

/** Turned to `rotation` and nothing else changed: position maths ignore the turn, so no `inferBox`. */
export function turnBlock<S extends State>(
  state: S,
  args: { id: string; rotation: number },
  env: Env,
): S {
  const frame = state.frame;
  const rotation = normalizeAngle(args.rotation);
  return edit(
    state,
    withRoot((root) =>
      updateNode(root, args.id, (n) => {
        if (!isFreeNode(n)) return n;
        const box = boxFor(n, frame);
        return box.rotation === rotation ? n : withBoxFor(n, frame, { ...box, rotation });
      }),
    ),
    env,
  );
}

/** Moved in its old parent first, then carried into the one it was dropped on, where it stands. */
export function moveToParent<S extends State>(
  state: S,
  args: {
    before: FreeNode;
    rect: Rect;
    container: Size;
    targetId: string;
    options: { from: Frame; to: Frame };
  },
  env: Env,
): S {
  const frame = state.frame;
  const moved = inferBox(boxFor(args.before, frame), args.rect, args.container);
  return edit(
    state,
    withRoot((root) => {
      const placed = updateNode(root, args.before.id, (n) =>
        isFreeNode(n) ? withBoxFor(n, frame, moved) : n,
      );
      return reparentNode(placed, args.before.id, args.targetId, args.options);
    }),
    env,
  );
}

/**
 * The state with the page placed for the phone where it is drawn, when the phone draws it as a flow:
 * from then on every block has a place of its own. No step of history; see `runFrozen`.
 */
export function freezePhone<S extends State>(state: S, env: Env): S {
  if (state.frame !== "phone" || !env.measurePhone) return state;
  const page = state.history.present;
  if (!drawsPhoneFlow(page.root)) return state;
  const measured = env.measurePhone(page.root);
  if (!measured || measured.size === 0) return state;
  const root = freezeRoot(page.root, measured);
  if (root === page.root) return state;
  const history: History<PageData> = { ...state.history, present: { ...page, root } };
  return change(state, { history } as Partial<S>);
}

/**
 * A command that puts blocks somewhere, run on a page that is first placed for the phone if the phone
 * drew it as a flow. The placing and the command are one step of history, so one undo goes back to the
 * flow; a command that changed nothing leaves the page a flow; and a command that was refused is given
 * up whole by `runner`, which brings back the state from before.
 */
export function runFrozen<S extends State>(state: S, env: Env, command: (state: S) => S): S {
  const frozen = freezePhone(state, env);
  if (frozen === state) return command(state);
  const next = command(frozen);
  if (next.history.present === frozen.history.present) return state;
  const { past } = next.history;
  const added = past.length === frozen.history.past.length + 1;
  if (!added || past[past.length - 1] !== frozen.history.present) return next;
  const history: History<PageData> = {
    ...next.history,
    past: [...past.slice(0, -1), state.history.present],
  };
  return change(next, { history } as Partial<S>);
}

/** The commands tied to a store. */
export function geometryCommands<S extends State>(store: EditorStore<S>, env: Env) {
  const runOnce = runner(store, env);
  const run = (command: (state: S) => S) => runOnce((state) => runFrozen(state, env, command));
  return {
    alignSelected: (container: Size | null, to: AlignTo) =>
      run((state) => alignSelected(state, { container, to }, env)),
    distributeSelected: (container: Size | null, axis: "x" | "y") =>
      run((state) => distributeSelected(state, { container, axis }, env)),
    nudgeSelected: (args: Parameters<typeof nudgeSelected>[1]) =>
      run((state) => nudgeSelected(state, args, env)),
    changeAnchor: (args: Parameters<typeof changeAnchor>[1]) =>
      run((state) => changeAnchor(state, args, env)),
    resetPhone: () => run((state) => resetPhone(state, env)),
    arrangePhone: () => runOnce((state) => arrangePhone(state, env)),
    setRect: (args: Parameters<typeof setRect>[1]) => run((state) => setRect(state, args, env)),
    placeBoxes: (args: Parameters<typeof placeBoxes>[1]) =>
      run((state) => placeBoxes(state, args, env)),
    turnBlock: (args: Parameters<typeof turnBlock>[1]) =>
      run((state) => turnBlock(state, args, env)),
    moveToParent: (args: Parameters<typeof moveToParent>[1]) =>
      run((state) => moveToParent(state, args, env)),
  };
}

export type GeometryCommands = ReturnType<typeof geometryCommands<State>>;
