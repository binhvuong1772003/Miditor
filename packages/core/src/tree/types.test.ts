import { describe, expect, it } from "vitest";
import { freeBoxOf } from "./free-box";
import type { FlowNode, FreeNode, PageData, TreeNode } from "./types";

// These are type tests: `tsc --noEmit` checks every `@ts-expect-error` below, and fails when one of
// them no longer reports an error, which means the type became too loose.

const flow: FlowNode = {
  id: "a",
  type: "Container",
  props: {},
  position: { mode: "flow" },
  children: [],
};

const free: FreeNode = {
  id: "b",
  type: "Image",
  props: { src: "/hero.png", alt: "Hero", tags: ["a", "b"], meta: { crop: null } },
  position: { mode: "free", x: { anchor: "end", offset: 20 }, y: { anchor: "start", offset: 40 } },
  size: { w: { kind: "percent", v: 30 }, h: { kind: "px", v: 96 } },
  rotation: 0,
  children: [],
};

describe("the tree types accept what they should", () => {
  it("holds free nodes inside flow nodes, nested, as a page", () => {
    const page: PageData = { schemaVersion: 1, root: { ...flow, children: [free, flow] } };
    const first: TreeNode | undefined = page.root.children[0];
    expect(first?.id).toBe("b");
  });

  it("round trips through JSON unchanged, because the data is plain JSON", () => {
    const page: PageData = { schemaVersion: 1, root: { ...flow, children: [free] } };
    expect(JSON.parse(JSON.stringify(page))).toEqual(page);
  });
});

// Each call below passes a value to a parameter typed `TreeNode`, so the compiler judges it.
const node = (value: TreeNode) => value;
const loose = { x: free.position.x, y: free.position.y };

describe("the tree types refuse what they should", () => {
  it("rejects invalid nodes at compile time", () => {
    const attempts = [
      // A free node needs a size.
      // @ts-expect-error
      () => node({ ...free, size: undefined }),
      // A free node needs a rotation.
      // @ts-expect-error
      () => node({ ...free, rotation: undefined }),
      // A free node needs both axes.
      // @ts-expect-error
      () => node({ ...free, position: { mode: "free", x: loose.x } }),
      // A flow node has no coordinates.
      // @ts-expect-error
      () => node({ ...flow, position: { mode: "flow", x: loose.x } }),
      // A flow node has no rotation.
      // @ts-expect-error
      () => node({ ...flow, rotation: 0 }),
      // A flow node has no size yet.
      // @ts-expect-error
      () => node({ ...flow, size: free.size }),
      // Every node says how it is placed.
      // @ts-expect-error
      () => node({ id: "d", type: "Text", props: {}, children: [] }),
      // Every node has a children list, empty for a leaf.
      // @ts-expect-error
      () => node({ id: "e", type: "Text", props: {}, position: { mode: "flow" } }),
      // Only two ways of placing a node exist.
      // @ts-expect-error
      () => node({ ...flow, position: { mode: "absolute" } }),
      // Props are plain JSON.
      // @ts-expect-error
      () => node({ ...flow, props: { onClick: () => 1 } }),
    ];
    expect(attempts).toHaveLength(10);
  });

  it("also rejects extra data that arrives through a variable", () => {
    // A value already stored in a variable gets no check for extra properties, so only the `never`
    // fields on a flow node can stop a free node's data from riding along.
    const flowWithSize = { ...flow, size: free.size };
    const flowWithRotation = { ...flow, rotation: 15 };
    const flowWithCoordinates = { ...flow, position: { mode: "flow" as const, ...loose } };
    const attempts = [
      // @ts-expect-error
      () => node(flowWithSize),
      // @ts-expect-error
      () => node(flowWithRotation),
      // @ts-expect-error
      () => node(flowWithCoordinates),
    ];
    expect(attempts).toHaveLength(3);
  });

  it("does not let a flow node into freeBoxOf", () => {
    // @ts-expect-error
    expect(() => freeBoxOf(flow)).toThrow();
  });
});
