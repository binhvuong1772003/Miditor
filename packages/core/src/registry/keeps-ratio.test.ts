import { describe, expect, it } from "vitest";
import type { FreeBox } from "../position/types";
import { withFreeBox, withLockRatio } from "../tree/free-box";
import type { FlowNode, FreeNode } from "../tree/types";
import { keepsRatio } from "./keeps-ratio";
import type { ComponentDef } from "./types";

const box: FreeBox = {
  x: { anchor: "start", offset: 0 },
  y: { anchor: "start", offset: 0 },
  w: { kind: "px", v: 10 },
  h: { kind: "px", v: 10 },
  rotation: 0,
};
const free: FreeNode = withFreeBox(
  {
    id: "a",
    type: "Image",
    props: {},
    styles: {},
    position: { mode: "free", x: box.x, y: box.y },
    size: { w: box.w, h: box.h },
    rotation: 0,
    children: [],
  },
  box,
);
const flow: FlowNode = {
  id: "f",
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "flow" },
  children: [],
};
const def = (lockRatio?: boolean): ComponentDef => ({
  label: "K",
  canContain: false,
  defaultProps: {},
  fields: {},
  ...(lockRatio === undefined ? {} : { lockRatio }),
});

describe("keepsRatio", () => {
  it("follows the kind when the block says nothing", () => {
    expect(keepsRatio(free, def(true))).toBe(true);
    expect(keepsRatio(free, def(false))).toBe(false);
    expect(keepsRatio(free, def())).toBe(false);
    expect(keepsRatio(free, undefined)).toBe(false);
  });

  it("follows the block when it says something, over the kind", () => {
    expect(keepsRatio(withLockRatio(free, false), def(true))).toBe(false);
    expect(keepsRatio(withLockRatio(free, true), def(false))).toBe(true);
    expect(keepsRatio(withLockRatio(free, true), undefined)).toBe(true);
    expect(keepsRatio(withLockRatio(free, false), undefined)).toBe(false);
  });

  it("is never so for a block placed by flow", () => {
    expect(keepsRatio(flow, def(true))).toBe(false);
  });
});

describe("withLockRatio", () => {
  it("sets the value without changing the rest of the block", () => {
    const out = withLockRatio(free, true);
    expect(out.lockRatio).toBe(true);
    expect(out.props).toBe(free.props);
    expect(free.lockRatio).toBeUndefined();
    expect(withLockRatio(free, false).lockRatio).toBe(false);
  });

  it("takes the value off with undefined, so the key is gone", () => {
    const off = withLockRatio(withLockRatio(free, true), undefined);
    expect("lockRatio" in off).toBe(false);
  });

  it("returns the same block when nothing changes", () => {
    const set = withLockRatio(free, true);
    expect(withLockRatio(set, true)).toBe(set);
    expect(withLockRatio(free, undefined)).toBe(free);
    expect(withLockRatio(withLockRatio(free, false), false)).not.toBe(free);
  });
});
