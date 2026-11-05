import { describe, expect, it } from "vitest";
import { firstAccepting } from "./drop-target";

// The unit tests have no DOM: an element is whatever `isHtmlElement` takes for one.
const el = (id?: string) =>
  ({ nodeType: 1, dataset: id === undefined ? {} : { miditorId: id } }) as unknown as HTMLElement;
const svg = () => ({ nodeType: 1 }) as unknown as Element;

describe("firstAccepting", () => {
  it("returns the first block, topmost first, that the predicate takes", () => {
    const list = [el("text"), el("box"), el("root")];
    expect(firstAccepting(list, (id) => id !== "text")?.id).toBe("box");
  });

  it("skips what is not a block and what is not an element of this document", () => {
    const list = [el(), svg(), el("a")];
    expect(firstAccepting(list, () => true)?.id).toBe("a");
  });

  it("gives the element with the id, and nothing when none is accepted", () => {
    const box = el("box");
    expect(firstAccepting([box], () => true)).toEqual({ id: "box", element: box });
    expect(firstAccepting([box], () => false)).toBeUndefined();
    expect(firstAccepting([], () => true)).toBeUndefined();
  });
});
