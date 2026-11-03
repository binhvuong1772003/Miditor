import type { FreeNode, TreeNode } from "@miditor/core";
import { emptyPage } from "@miditor/core";
import { describe, expect, it } from "vitest";
import { freezeRoot } from "./phone-freeze";

const block = (id: string, type: string, props: FreeNode["props"] = {}): FreeNode => ({
  id,
  type,
  props,
  styles: {},
  children: [],
  position: { mode: "free", x: { anchor: "end", offset: 5 }, y: { anchor: "end", offset: 6 } },
  size: { w: { kind: "px", v: 100 }, h: { kind: "px", v: 50 } },
  rotation: 10,
});

const page = (...children: TreeNode[]): TreeNode => ({ ...emptyPage().root, children });

describe("freezeRoot", () => {
  it("places each measured block where it is drawn, keeping its turn", () => {
    const frozen = freezeRoot(
      page(block("a", "Container")),
      new Map([["a", { x: 16, y: 120, w: 343, h: 80 }]]),
    );
    const a = frozen.children[0] as FreeNode;
    expect(a.phone).toEqual({
      x: { anchor: "start", offset: 16 },
      y: { anchor: "start", offset: 120 },
      w: { kind: "px", v: 343 },
      h: { kind: "px", v: 80 },
      rotation: 10,
    });
  });

  it("reaches blocks inside a box, and leaves one without a measure alone", () => {
    const inner = block("inner", "Container");
    const loose = block("loose", "Container");
    const frozen = freezeRoot(
      page({ ...block("box", "Container"), children: [inner] }, loose),
      new Map([
        ["box", { x: 16, y: 0, w: 343, h: 200 }],
        ["inner", { x: 16, y: 16, w: 311, h: 40 }],
      ]),
    );
    const box = frozen.children[0] as FreeNode;
    expect((box.children[0] as FreeNode).phone?.x).toEqual({ anchor: "start", offset: 16 });
    expect(frozen.children[1]).toBe(loose);
  });

  it("gives a text the size it is drawn in on the phone, and a button its own", () => {
    const frozen = freezeRoot(
      page(block("t", "Text", { text: "Hi", size: 52 }), block("b", "Button", { size: 18 })),
      new Map([
        ["t", { x: 16, y: 0, w: 343, h: 90 }],
        ["b", { x: 16, y: 100, w: 124, h: 40 }],
      ]),
    );
    expect(frozen.children[0]?.phoneProps).toEqual({ size: 36 });
    expect(frozen.children[1]?.phoneProps).toEqual({ size: 18 });
  });

  it("keeps a text size that was set for the phone", () => {
    const text = { ...block("t", "Text", { text: "Hi", size: 52 }), phoneProps: { size: 22 } };
    const frozen = freezeRoot(page(text), new Map([["t", { x: 16, y: 0, w: 343, h: 60 }]]));
    expect(frozen.children[0]?.phoneProps).toEqual({ size: 22 });
  });

  it("is the same page when nothing was measured", () => {
    const root = page(block("a", "Container"));
    expect(freezeRoot(root, new Map())).toBe(root);
  });
});
