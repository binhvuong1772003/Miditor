import { describe, expect, it } from "vitest";
import { propsFor, withPhoneProp } from "./phone-props";
import type { FlowNode } from "./types";

const node = (props: FlowNode["props"], phoneProps?: FlowNode["props"]): FlowNode => ({
  id: "t",
  type: "Text",
  props,
  ...(phoneProps ? { phoneProps } : {}),
  styles: {},
  position: { mode: "flow" },
  children: [],
});

describe("propsFor", () => {
  const n = node({ text: "Hi", size: 24 }, { size: 16 });

  it("is the props of the node on the desktop, the very same object", () => {
    expect(propsFor(n, "desktop")).toBe(n.props);
  });

  it("puts the phone props over them on the phone", () => {
    expect(propsFor(n, "phone")).toEqual({ text: "Hi", size: 16 });
    expect(n.props).toEqual({ text: "Hi", size: 24 });
  });

  it("is the same object when there are no phone props", () => {
    const plain = node({ size: 24 });
    expect(propsFor(plain, "phone")).toBe(plain.props);
  });

  it("adds a prop that only the phone has", () => {
    expect(propsFor(node({ a: 1 }, { b: 2 }), "phone")).toEqual({ a: 1, b: 2 });
  });
});

describe("withPhoneProp", () => {
  const n = node({ size: 24 });

  it("sets a prop for the phone and leaves the node as it was", () => {
    const out = withPhoneProp(n, "size", 16);
    expect(out.phoneProps).toEqual({ size: 16 });
    expect(n.phoneProps).toBeUndefined();
    expect(out.props).toBe(n.props);
  });

  it("changes a prop that is already set and keeps the others", () => {
    const out = withPhoneProp(node({}, { size: 16, bold: true }), "size", 12);
    expect(out.phoneProps).toEqual({ size: 12, bold: true });
  });

  it("takes a prop back to the desktop value, and drops phoneProps when it is empty", () => {
    const two = node({}, { size: 16, bold: true });
    expect(withPhoneProp(two, "size", undefined).phoneProps).toEqual({ bold: true });
    const one = withPhoneProp(node({}, { size: 16 }), "size", undefined);
    expect("phoneProps" in one).toBe(false);
  });

  it("returns the same node when nothing changes", () => {
    const set = node({}, { size: 16 });
    expect(withPhoneProp(set, "size", 16)).toBe(set);
    expect(withPhoneProp(n, "size", undefined)).toBe(n);
    expect(withPhoneProp(set, "bold", undefined)).toBe(set);
  });

  it("keeps a falsy value, and a name like one on the prototype stays data", () => {
    expect(withPhoneProp(n, "bold", false).phoneProps).toEqual({ bold: false });
    expect(withPhoneProp(n, "bold", 0).phoneProps).toEqual({ bold: 0 });
    const out = withPhoneProp(n, "constructor", 1);
    expect(Object.hasOwn(out.phoneProps ?? {}, "constructor")).toBe(true);
    expect(withPhoneProp(n, "constructor", undefined)).toBe(n);
  });
});
