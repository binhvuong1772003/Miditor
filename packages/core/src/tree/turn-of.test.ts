import { describe, expect, it } from "vitest";
import type { FreeBox } from "../position/types";
import { withFreeBox, withPhoneBox } from "./free-box";
import { turnOf } from "./turn-of";
import type { FlowNode, FreeNode, TreeNode } from "./types";

const at = (rotation: number): FreeBox => ({
  x: { anchor: "start", offset: 0 },
  y: { anchor: "start", offset: 0 },
  w: { kind: "px", v: 10 },
  h: { kind: "px", v: 10 },
  rotation,
});
const turned = (id: string, rotation: number, children: TreeNode[] = []): FreeNode =>
  withFreeBox(
    {
      id,
      type: "Shape",
      props: {},
      styles: {},
      position: { mode: "free", x: at(0).x, y: at(0).y },
      size: { w: at(0).w, h: at(0).h },
      rotation: 0,
      children,
    },
    at(rotation),
  );
const flowNode = (id: string, children: TreeNode[] = []): FlowNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
});

describe("turnOf", () => {
  const c = turned("c", 15);
  const b = turned("b", 30, [c]);
  const a = turned("a", 45, [b]);
  const root = flowNode("root", [a, turned("d", 0), flowNode("f", [turned("g", 20)])]);

  it("adds the rotation of the block and of every block around it", () => {
    expect(turnOf(root, "a", "desktop")).toBe(45);
    expect(turnOf(root, "b", "desktop")).toBe(75);
    expect(turnOf(root, "c", "desktop")).toBe(90);
  });

  it("does not count blocks placed by flow, and is 0 for the root and a block that is not turned", () => {
    expect(turnOf(root, "root", "desktop")).toBe(0);
    expect(turnOf(root, "f", "desktop")).toBe(0);
    expect(turnOf(root, "g", "desktop")).toBe(20);
    expect(turnOf(root, "d", "desktop")).toBe(0);
  });

  it("keeps the total in the stored range", () => {
    const page = flowNode("root", [turned("x", 170, [turned("y", 20)])]);
    expect(turnOf(page, "y", "desktop")).toBe(-170);
    expect(turnOf(flowNode("root", [turned("x", 90, [turned("y", 90)])]), "y", "desktop")).toBe(
      180,
    );
  });

  it("is 0 for a block that is not in the tree", () => {
    expect(turnOf(root, "zz", "desktop")).toBe(0);
  });

  it("uses the rotation of the phone on the phone, where it was set by hand", () => {
    const hand = withPhoneBox(turned("p", 10, [turned("q", 5)]), at(60));
    const page = flowNode("root", [hand]);
    expect(turnOf(page, "q", "desktop")).toBe(15);
    expect(turnOf(page, "q", "phone")).toBe(65);
  });
});
