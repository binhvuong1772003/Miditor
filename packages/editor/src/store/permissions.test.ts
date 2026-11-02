import type { FreeNode, PageData, TreeNode } from "@midito-kitchen/core";
import { emptyPage } from "@midito-kitchen/core";
import { describe, expect, it, vi } from "vitest";
import { guard, type Permissions } from "./permissions";

const box = (x = 0): Pick<FreeNode, "position" | "size" | "rotation"> => ({
  position: { mode: "free", x: { anchor: "start", offset: x }, y: { anchor: "start", offset: 0 } },
  size: { w: { kind: "px", v: 100 }, h: { kind: "px", v: 40 } },
  rotation: 0,
});

const block = (id: string, extra: Partial<FreeNode> = {}, children: TreeNode[] = []): FreeNode => ({
  id,
  type: "Text",
  props: { text: id },
  styles: {},
  children,
  ...box(),
  ...extra,
});

const page = (children: TreeNode[], extra: Partial<PageData> = {}): PageData => {
  const start = emptyPage();
  return { ...start, ...extra, root: { ...start.root, children } };
};

const nothing: Permissions = {};
const no = (key: keyof Permissions): Permissions => ({ [key]: false });

describe("guard", () => {
  it("is null with no permissions", () => {
    expect(guard(page([block("a")]), page([]), undefined)).toBeNull();
  });

  it("is null when nothing changed", () => {
    const same = page([block("a")]);
    expect(guard(same, same, no("canEdit"))).toBeNull();
  });

  it("asks canDelete of the root of a removed subtree only", () => {
    const canDelete = vi.fn(() => true);
    const before = page([block("a", {}, [block("a1")]), block("b")]);
    const after = page([block("b")]);
    expect(guard(before, after, { canDelete })).toBeNull();
    expect(canDelete).toHaveBeenCalledTimes(1);
    expect(canDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("refuses a removal the permission refuses and says which block", () => {
    const before = page([block("a")]);
    expect(guard(before, page([]), no("canDelete"))).toEqual({ action: "delete", nodeId: "a" });
  });

  it("asks canAdd once for an added subtree, with its parent and kind", () => {
    const canAdd = vi.fn(() => true);
    const before = page([block("a")]);
    const after = page([block("a"), block("n", {}, [block("n1")])]);
    expect(guard(before, after, { canAdd })).toBeNull();
    expect(canAdd).toHaveBeenCalledTimes(1);
    expect(canAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "root" }), "Text");
  });

  it("refuses an add and names the parent", () => {
    expect(guard(page([]), page([block("n")]), no("canAdd"))).toEqual({
      action: "add",
      nodeId: "root",
    });
  });

  it("asks canDrag when the position changes", () => {
    const before = page([block("a")]);
    const after = page([block("a", box(30))]);
    expect(guard(before, after, no("canDrag"))).toEqual({ action: "drag", nodeId: "a" });
    expect(guard(before, after, no("canEdit"))).toBeNull();
  });

  it("asks canDrag when the parent changes", () => {
    const before = page([block("a"), block("g")]);
    const after = page([block("g", {}, [block("a")])]);
    expect(guard(before, after, no("canDrag"))).toEqual({ action: "drag", nodeId: "a" });
  });

  it("asks canDrag when the rank among the siblings changes", () => {
    const before = page([block("a"), block("b"), block("c")]);
    const after = page([block("b"), block("a"), block("c")]);
    expect(guard(before, after, no("canDrag"))).not.toBeNull();
  });

  it("moves no one when a sibling is only deleted", () => {
    const before = page([block("a"), block("b"), block("c")]);
    const after = page([block("a"), block("c")]);
    expect(guard(before, after, no("canDrag"))).toBeNull();
  });

  it("moves no one when a sibling is only added at the end", () => {
    const before = page([block("a"), block("b")]);
    const after = page([block("a"), block("b"), block("n")]);
    expect(guard(before, after, no("canDrag"))).toBeNull();
  });

  it("asks canEdit when the props change", () => {
    const before = page([block("a")]);
    const after = page([block("a", { props: { text: "changed" } })]);
    expect(guard(before, after, no("canEdit"))).toEqual({ action: "edit", nodeId: "a" });
    expect(guard(before, after, no("canDrag"))).toBeNull();
  });

  it("asks canEdit when a style other than position changes", () => {
    const before = page([block("a")]);
    const after = page([block("a", { styles: { background: "#ffffff" } })]);
    expect(guard(before, after, no("canEdit"))).toEqual({ action: "edit", nodeId: "a" });
  });

  it("asks both when position and colour change together", () => {
    const before = page([block("a")]);
    const after = page([block("a", { ...box(30), styles: { background: "#ffffff" } })]);
    expect(guard(before, after, no("canDrag"))).toEqual({ action: "drag", nodeId: "a" });
    expect(guard(before, after, no("canEdit"))).toEqual({ action: "edit", nodeId: "a" });
    expect(guard(before, after, nothing)).toBeNull();
  });

  it("does not take a change of children for an edit of the parent", () => {
    const before = page([block("g", {}, [block("a")])]);
    const after = page([block("g", {}, [block("a"), block("n")])]);
    expect(guard(before, after, no("canEdit"))).toBeNull();
  });

  it("asks canEdit of the root for the theme, the info and the page's own styles", () => {
    const before = page([block("a")]);
    expect(guard(before, page([block("a")], { meta: { title: "New" } }), no("canEdit"))).toEqual({
      action: "edit",
      nodeId: "root",
    });
    expect(
      guard(
        before,
        page([block("a")], { theme: { colors: { primary: "#112233" } } as never }),
        no("canEdit"),
      ),
    ).toEqual({ action: "edit", nodeId: "root" });
    const taller: PageData = { ...before, root: { ...before.root, styles: { minHeight: 900 } } };
    expect(guard(before, taller, no("canEdit"))).toEqual({ action: "edit", nodeId: "root" });
  });

  it("asks add and move for a group, and delete and move for an ungroup", () => {
    const before = page([block("a"), block("b")]);
    const grouped = page([block("g", { type: "Group" }, [block("a"), block("b")])]);
    expect(guard(before, grouped, no("canAdd"))).toEqual({ action: "add", nodeId: "root" });
    expect(guard(before, grouped, no("canDrag"))).toEqual({ action: "drag", nodeId: "a" });
    expect(guard(before, grouped, no("canDelete"))).toBeNull();
    expect(guard(grouped, before, no("canDelete"))).toEqual({ action: "delete", nodeId: "g" });
    expect(guard(grouped, before, no("canDrag"))).toEqual({ action: "drag", nodeId: "a" });
    expect(guard(grouped, before, no("canAdd"))).toBeNull();
  });

  it("asks canDuplicate of each original for a duplicate and not canAdd", () => {
    const canDuplicate = vi.fn(() => true);
    const canAdd = vi.fn(() => false);
    const before = page([block("a"), block("b")]);
    const after = page([block("a"), block("b"), block("a2"), block("b2")]);
    const intent = { kind: "duplicate", originals: ["a", "b"] } as const;
    expect(guard(before, after, { canDuplicate, canAdd }, intent)).toBeNull();
    expect(canDuplicate).toHaveBeenCalledTimes(2);
    expect(canAdd).not.toHaveBeenCalled();
  });

  it("refuses a duplicate when one original may not be copied", () => {
    const before = page([block("a"), block("b")]);
    const after = page([block("a"), block("b"), block("a2"), block("b2")]);
    const intent = { kind: "duplicate", originals: ["a", "b"] } as const;
    const refusal = guard(before, after, { canDuplicate: (node) => node.id !== "b" }, intent);
    expect(refusal).toEqual({ action: "duplicate", nodeId: "b" });
  });

  it("refuses the whole change when one of several answers is no", () => {
    const before = page([block("a"), block("b")]);
    const after = page([block("a", box(10)), block("b", box(10))]);
    expect(guard(before, after, { canDrag: (node) => node.id !== "b" })).toEqual({
      action: "drag",
      nodeId: "b",
    });
  });

  it("works with a boolean as with a function", () => {
    const before = page([block("a")]);
    const after = page([block("a", box(30))]);
    expect(guard(before, after, { canDrag: true })).toBeNull();
    expect(guard(before, after, { canDrag: () => false })).not.toBeNull();
  });

  it("asks a node once for the same objects", () => {
    const canDrag = vi.fn(() => true);
    const a = block("a");
    const moved = block("a", box(30));
    const before = page([a]);
    const after = page([moved]);
    guard(before, after, { canDrag });
    guard(before, after, { canDrag });
    expect(canDrag).toHaveBeenCalledTimes(1);
  });
});
