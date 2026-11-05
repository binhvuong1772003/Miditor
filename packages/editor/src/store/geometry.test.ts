import {
  boxFor,
  builtInRegistry,
  emptyPage,
  type FreeNode,
  findNode,
  inferBox,
  insertNode,
  isFreeNode,
  newNode,
  normalizeAngle,
  type Rect,
  resolveRect,
  type TreeNode,
} from "@miditor/core";
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { createEditorStore } from "./create-editor-store";
import { type Env, initialDocumentState, setDraft } from "./document";
import {
  alignSelected,
  changeAnchor,
  distributeSelected,
  geometryCommands,
  moveBlock,
  moveToParent,
  nudgeSelected,
  placeBoxes,
  resetPhone,
  setRect,
  turnBlock,
} from "./geometry";
import { initialSelectionState, selectManyLast, selectOnly } from "./selection";
import type { State } from "./structure";
import { initialViewState } from "./view";

const env: Env = { limit: 100, registry: builtInRegistry };
const SIZE = { w: 680, h: 788 };

/** A page with Text blocks `t1`..`tN`, each one lower than the one before, and a Container `box`. */
function pageWith(count: number): State {
  let root: TreeNode = emptyPage().root;
  for (let i = 1; i <= count; i++) {
    const node = newNode(builtInRegistry, "Text", `t${i}`, SIZE) as FreeNode;
    const box = boxFor(node, "desktop");
    root = insertNode(root, "root", {
      ...node,
      position: {
        mode: "free",
        x: { anchor: "start", offset: 50 * i },
        y: { anchor: "start", offset: 100 * i },
      },
      ...(box ? {} : {}),
    } as TreeNode);
  }
  root = insertNode(root, "root", newNode(builtInRegistry, "Container", "box", SIZE) as TreeNode);
  const page = { ...emptyPage(), root };
  return {
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState(page),
  };
}

const rootOf = (state: State) => state.history.present.root;
const node = (state: State, id: string) => findNode(rootOf(state), id) as FreeNode;
const rectOf = (state: State, id: string, device: "desktop" | "phone" = "desktop"): Rect =>
  resolveRect(boxFor(node(state, id), device), SIZE);
const pick = (state: State, ...ids: string[]) => selectManyLast(state, ids.reverse(), "root");

describe("alignSelected", () => {
  it("puts the selected blocks on the same left edge", () => {
    const next = alignSelected(pick(pageWith(2), "t1", "t2"), { container: SIZE, to: "left" }, env);
    expect(rectOf(next, "t1").x).toBe(rectOf(next, "t2").x);
    expect(next.history.past).toHaveLength(1);
  });

  it("lines one block up with its parent", () => {
    const next = alignSelected(
      selectOnly(pageWith(1), "t1", "root"),
      { container: SIZE, to: "left" },
      env,
    );
    expect(rectOf(next, "t1").x).toBe(0);
  });

  it("does nothing without a measure, and for the page", () => {
    const state = pick(pageWith(2), "t1", "t2");
    expect(alignSelected(state, { container: null, to: "left" }, env)).toBe(state);
    const page = selectOnly(state, "root", "root");
    expect(alignSelected(page, { container: SIZE, to: "left" }, env)).toBe(page);
  });

  it("stores what is pending in a panel first", () => {
    const state = setDraft(pick(pageWith(2), "t1", "t2"), {
      id: "t1",
      key: "prop",
      name: "text",
      value: "Hi",
    });
    const next = alignSelected(state, { container: SIZE, to: "left" }, env);
    expect(next.draft).toBeNull();
    expect(node(next, "t1").props.text).toBe("Hi");
  });
});

describe("distributeSelected", () => {
  it("needs three blocks", () => {
    const two = pick(pageWith(3), "t1", "t2");
    expect(distributeSelected(two, { container: SIZE, axis: "y" }, env)).toBe(two);
  });

  it("makes the gaps between three blocks equal", () => {
    const state = pick(pageWith(3), "t1", "t2", "t3");
    const moved = nudgeSelected(
      selectOnly(state, "t2", "root"),
      { container: SIZE, key: "ArrowDown", shift: true, merge: false },
      env,
    );
    const next = distributeSelected(
      { ...moved, selectedId: "t1", picked: ["t2", "t3"] },
      { container: SIZE, axis: "y" },
      env,
    );
    const gap = (a: string, b: string) =>
      rectOf(next, b).y - (rectOf(next, a).y + rectOf(next, a).h);
    expect(gap("t1", "t2")).toBeCloseTo(gap("t2", "t3"), 0);
  });
});

describe("nudgeSelected", () => {
  it("moves the selected blocks one px, ten with Shift", () => {
    const state = pick(pageWith(2), "t1", "t2");
    const once = nudgeSelected(
      state,
      { container: SIZE, key: "ArrowRight", shift: false, merge: false },
      env,
    );
    expect(rectOf(once, "t1").x).toBe(rectOf(state, "t1").x + 1);
    expect(rectOf(once, "t2").x).toBe(rectOf(state, "t2").x + 1);
    const far = nudgeSelected(
      once,
      { container: SIZE, key: "ArrowDown", shift: true, merge: false },
      env,
    );
    expect(rectOf(far, "t1").y).toBe(rectOf(once, "t1").y + 10);
  });

  it("puts a run of presses in one step when it is asked to", () => {
    let state = selectOnly(pageWith(1), "t1", "root");
    state = nudgeSelected(
      state,
      { container: SIZE, key: "ArrowRight", shift: false, merge: false },
      env,
    );
    for (let i = 0; i < 4; i++) {
      state = nudgeSelected(
        state,
        { container: SIZE, key: "ArrowRight", shift: false, merge: true },
        env,
      );
    }
    expect(state.history.past).toHaveLength(1);
    expect(rectOf(state, "t1").x).toBe(rectOf(pageWith(1), "t1").x + 5);
  });

  it("works on the phone too: the box of the phone is the one that moves", () => {
    const state = { ...selectOnly(pageWith(1), "t1", "root"), frame: "phone" as const };
    const next = nudgeSelected(
      state,
      { container: SIZE, key: "ArrowRight", shift: false, merge: false },
      env,
    );
    expect(node(next, "t1").phone).toBeDefined();
    expect(rectOf(next, "t1", "desktop")).toEqual(rectOf(state, "t1", "desktop"));
  });
});

describe("changeAnchor", () => {
  it("anchors the axis another way and keeps the block where it is", () => {
    const state = selectOnly(pageWith(1), "t1", "root");
    const next = changeAnchor(state, { axis: "x", anchor: "end", container: SIZE }, env);
    expect(boxFor(node(next, "t1"), "desktop").x.anchor).toBe("end");
    expect(rectOf(next, "t1")).toEqual(rectOf(state, "t1"));
  });

  it("does nothing for a block that is not free, or without a measure", () => {
    const state = selectOnly(pageWith(1), "t1", "root");
    expect(changeAnchor(state, { axis: "x", anchor: "end", container: null }, env)).toBe(state);
    const box = selectOnly(pageWith(1), "root", "root");
    expect(changeAnchor(box, { axis: "x", anchor: "end", container: SIZE }, env)).toBe(box);
  });
});

describe("setRect", () => {
  it("sets a typed number of the rect", () => {
    const state = selectOnly(pageWith(1), "t1", "root");
    const next = setRect(state, { field: "x", value: 200, container: SIZE }, env);
    expect(rectOf(next, "t1").x).toBe(200);
    expect(rectOf(next, "t1").y).toBe(rectOf(state, "t1").y);
  });

  it("stores nothing for the number the block has", () => {
    const state = selectOnly(pageWith(1), "t1", "root");
    const same = setRect(state, { field: "x", value: rectOf(state, "t1").x, container: SIZE }, env);
    expect(same).toBe(state);
  });

  it("does nothing without a selected free block or a measure", () => {
    const none = pageWith(1);
    expect(setRect(none, { field: "x", value: 1, container: SIZE }, env)).toBe(none);
    const state = selectOnly(pageWith(1), "t1", "root");
    expect(setRect(state, { field: "x", value: 1, container: null }, env)).toBe(state);
  });
});

describe("resetPhone", () => {
  it("takes the placement of the phone away and leaves the desktop one", () => {
    const base = selectOnly(pageWith(1), "t1", "root");
    const placed = nudgeSelected(
      { ...base, frame: "phone" as const },
      { container: SIZE, key: "ArrowRight", shift: false, merge: false },
      env,
    );
    const desktop = { ...placed, frame: "desktop" as const };
    expect(node(desktop, "t1").phone).toBeDefined();
    const next = resetPhone(desktop, env);
    expect(node(next, "t1").phone).toBeUndefined();
    expect(rectOf(next, "t1")).toEqual(rectOf(desktop, "t1"));
  });

  it("does nothing for a block that has no placement of the phone", () => {
    const state = selectOnly(pageWith(1), "t1", "root");
    expect(resetPhone(state, env)).toBe(state);
  });
});

describe("placeBoxes, turnBlock and moveToParent", () => {
  const rect = (x: number, y: number): Rect => ({ x, y, w: 240, h: 60 });

  it("store where a drag ended, for several blocks in one step", () => {
    const state = pageWith(2);
    const next = placeBoxes(
      state,
      {
        items: [
          { before: node(state, "t1"), rect: rect(10, 20) },
          { before: node(state, "t2"), rect: rect(30, 40) },
        ],
        container: SIZE,
      },
      env,
    );
    expect(rectOf(next, "t1")).toMatchObject({ x: 10, y: 20 });
    expect(rectOf(next, "t2")).toMatchObject({ x: 30, y: 40 });
    expect(next.history.past).toHaveLength(1);
  });

  it("turn a block to the angle given, as a number from 0 up to 360", () => {
    const state = pageWith(1);
    const turned = placeBoxes(
      state,
      {
        items: [{ before: node(state, "t1"), rect: rect(50, 100), rotation: -90 }],
        container: SIZE,
      },
      env,
    );
    expect(boxFor(node(turned, "t1"), "desktop").rotation).toBe(normalizeAngle(-90));
    expect(
      boxFor(node(turnBlock(state, { id: "t1", rotation: 450 }, env), "t1"), "desktop").rotation,
    ).toBe(normalizeAngle(450));
  });

  it("leave the state as it is when a turn does not change the angle", () => {
    const state = pageWith(1);
    expect(turnBlock(state, { id: "t1", rotation: 0 }, env)).toBe(state);
  });

  it("move a block into the one it was dropped on", () => {
    const state = pageWith(1);
    const frameOf = { size: SIZE, center: { x: 340, y: 394 }, rotation: 0 };
    const next = moveToParent(
      state,
      {
        before: node(state, "t1"),
        rect: rect(5, 5),
        container: SIZE,
        targetId: "box",
        options: { from: frameOf, to: { ...frameOf, size: { w: 200, h: 64 } } },
      },
      env,
    );
    const parent = rootOf(next).children.find((child) => child.id === "box") as TreeNode;
    expect(parent.children.map((child) => child.id)).toEqual(["t1"]);
    expect(isFreeNode(node(next, "t1"))).toBe(true);
  });
});

describe("geometryCommands", () => {
  it("run on a store, one change each, and tell nobody about no change", () => {
    const store = createEditorStore(selectOnly(pageWith(1), "t1", "root"));
    const commands = geometryCommands(store, env);
    const listener = vi.fn();
    store.subscribe(listener);
    commands.nudgeSelected({ container: SIZE, key: "ArrowRight", shift: false, merge: false });
    expect(listener).toHaveBeenCalledTimes(1);
    commands.resetPhone();
    commands.turnBlock({ id: "t1", rotation: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("the boxes after any moves", () => {
  it("are the ones worked out from the rect and the box the gesture began with, on the screen it was made", () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 600 }),
          y: fc.integer({ min: 0, max: 700 }),
          w: fc.integer({ min: 20, max: 300 }),
          h: fc.integer({ min: 20, max: 300 }),
        }),
        fc.constantFrom("desktop" as const, "phone" as const),
        (rect, frame) => {
          const state: State = { ...pageWith(1), frame };
          const before = node(state, "t1");
          const next = placeBoxes(state, { items: [{ before, rect }], container: SIZE }, env);
          expect(boxFor(node(next, "t1"), frame)).toEqual(
            inferBox(boxFor(before, frame), rect, SIZE),
          );
          if (frame === "phone") {
            // The desktop keeps its own box when the phone is the screen being edited.
            expect(boxFor(node(next, "t1"), "desktop")).toEqual(boxFor(before, "desktop"));
          }
        },
      ),
    );
  });
});

describe("moveBlock", () => {
  const ids = (state: State, parent = "root") =>
    (parent === "root"
      ? rootOf(state)
      : (findNode(rootOf(state), parent) as TreeNode)
    ).children.map((child) => child.id);

  it("puts a block at another place among its siblings, in one step that Undo takes back", () => {
    const state = pageWith(3);
    const next = moveBlock(state, { id: "t1", parentId: "root", index: 3 }, env);
    expect(ids(next)).toEqual(["t2", "t3", "box", "t1"]);
    expect(next.history.past).toHaveLength(1);
  });

  it("puts a block into another block and keeps it where it was on the page", () => {
    const state = pageWith(1);
    const before = resolveRect(boxFor(node(state, "t1"), "desktop"), SIZE);
    const from = { size: SIZE, center: { x: 340, y: 394 }, rotation: 0 };
    // The box is 200 by 64 with its middle at (500, 300): its top left corner is at (400, 268).
    const to = { size: { w: 200, h: 64 }, center: { x: 500, y: 300 }, rotation: 0 };
    const next = moveBlock(
      state,
      { id: "t1", parentId: "box", index: 0, options: { from, to } },
      env,
    );
    expect(ids(next, "box")).toEqual(["t1"]);
    const after = resolveRect(boxFor(node(next, "t1"), "desktop"), { w: 200, h: 64 });
    expect(after.x).toBeCloseTo(before.x - 400, 0);
    expect(after.y).toBeCloseTo(before.y - 268, 0);
  });

  it("refuses another parent without the frames to measure in", () => {
    const state = pageWith(1);
    expect(moveBlock(state, { id: "t1", parentId: "box", index: 0 }, env)).toBe(state);
  });

  it("changes nothing on the phone screen, into itself, or to the place it is at", () => {
    const state = pageWith(2);
    const phone: State = { ...state, frame: "phone" };
    expect(moveBlock(phone, { id: "t1", parentId: "root", index: 1 }, env)).toBe(phone);
    expect(moveBlock(state, { id: "box", parentId: "box", index: 0 }, env)).toBe(state);
    expect(moveBlock(state, { id: "t1", parentId: "root", index: 0 }, env)).toBe(state);
  });

  it("says whether the block moved: not when it would stay where it is", () => {
    const store = createEditorStore(pageWith(2));
    const commands = geometryCommands(store, env);
    expect(commands.moveBlock({ id: "t1", parentId: "root", index: 0 })).toBe(false);
    expect(commands.moveBlock({ id: "t1", parentId: "root", index: 2 })).toBe(true);
  });

  it("is told to the host as a reorder or a reparent, by what changed", () => {
    const onAction = vi.fn();
    const withHost: Env = { ...env, onAction };
    const store = createEditorStore(pageWith(2));
    const commands = geometryCommands(store, withHost);
    // The selection is the page: the block that moved is the one named, not the one selected.
    expect(commands.moveBlock({ id: "t1", parentId: "root", index: 2 })).toBe(true);
    expect(onAction.mock.calls[0]?.[0]).toMatchObject({ type: "block.reorder", ids: ["t1"] });
    const from = { size: SIZE, center: { x: 340, y: 394 }, rotation: 0 };
    commands.moveBlock({
      id: "t1",
      parentId: "box",
      index: 0,
      options: { from, to: { ...from, size: { w: 200, h: 64 } } },
    });
    expect(onAction.mock.calls[1]?.[0]).toMatchObject({ type: "block.reparent" });
  });
});
