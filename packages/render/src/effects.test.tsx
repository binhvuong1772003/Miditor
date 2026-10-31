import { emptyPage, type NodeEffects, type PageData, type TreeNode } from "@midito-kitchen/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { effectsCss, hasMotion, motionOf } from "./effects";
import { Render } from "./Render";

const child = (id: string, effects?: NodeEffects): TreeNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  children: [],
  position: { mode: "flow" },
  ...(effects ? { effects } : {}),
});

const page = (root: Partial<TreeNode>): PageData => {
  const base = emptyPage();
  return { ...base, root: { ...base.root, ...root } as TreeNode };
};

describe("motionOf", () => {
  it("is nothing for a block without motion and for motion that is not valid", () => {
    expect(motionOf(child("a"))).toEqual({ attrs: {}, style: {} });
    const bad = { ...child("a"), effects: { hover: "spin" } } as unknown as TreeNode;
    expect(motionOf(bad)).toEqual({ attrs: {}, style: {} });
  });

  it("names the hover and reads the variables the style sheet sets", () => {
    const { attrs, style } = motionOf(child("a", { hover: "lift", press: true }));
    expect(attrs).toEqual({ "data-midito-hover": "lift", "data-midito-press": "" });
    expect(style).toMatchObject({ translate: "var(--m-t, none)", scale: "var(--m-s, none)" });
    expect(style).not.toHaveProperty("animation");
  });

  it("writes the pace of an entrance, and adds the stagger to the delay", () => {
    const enter = { effect: "slide-up", trigger: "scroll", duration: 800, delay: 100 } as const;
    const { attrs, style } = motionOf(child("a", { enter }), { index: 3, stagger: 50 });
    expect(attrs).toMatchObject({
      "data-midito-enter": "slide-up",
      "data-midito-trigger": "scroll",
    });
    expect(style).toMatchObject({ "--m-dur": "800ms", "--m-delay": "250ms" });
  });

  it("leaves the variables out when the entrance uses the defaults", () => {
    const { style } = motionOf(child("a", { enter: { effect: "fade", trigger: "load" } }));
    expect(style).not.toHaveProperty("--m-dur");
    expect(style).not.toHaveProperty("--m-delay");
    expect(style).not.toHaveProperty("--m-ease");
  });
});

describe("effectsCss", () => {
  const css = effectsCss();

  it("has an entrance and a keyframes for every effect, from a start with no end", () => {
    for (const name of ["fade", "slide-up", "slide-down", "slide-left", "slide-right", "zoom"]) {
      expect(css).toContain(`@keyframes midito-${name} { from {`);
      expect(css).toContain(`[data-midito-enter="${name}"]`);
    }
    expect(css).not.toMatch(/@keyframes[^}]*\bto\s*\{/);
  });

  it("moves nothing where the person asks for less motion, and hovers only with a pointer", () => {
    const outside = css.split("@media (prefers-reduced-motion: no-preference)")[0];
    expect(outside).not.toContain("animation");
    expect(css).toContain("@media (hover: hover) and (prefers-reduced-motion: no-preference)");
    expect(css).toMatch(/@supports \(animation-timeline: view\(\)\)/);
  });

  it("changes only opacity, translate and scale, plus a hover's colour", () => {
    expect(css).not.toMatch(/\b(width|height|top|left|margin)\s*:/);
  });
});

describe("<Render> with motion", () => {
  const moving = page({ children: [child("a", { hover: "grow" })] });

  it("carries a style sheet and the attributes when the page has motion", () => {
    const html = renderToStaticMarkup(<Render data={moving} />);
    expect(html).toContain("<style>");
    expect(html).toContain('data-midito-hover="grow"');
  });

  it("carries neither for a page without motion, or when motion is off", () => {
    expect(renderToStaticMarkup(<Render data={emptyPage()} />)).not.toContain("<style>");
    const html = renderToStaticMarkup(<Render data={moving} motion="off" />);
    expect(html).not.toContain("<style>");
    expect(html).not.toContain("data-midito-hover");
  });

  it("staggers the blocks inside a block that asks for it", () => {
    const enter = { effect: "fade", trigger: "load" } as const;
    const data = page({
      effects: { stagger: 100 },
      children: [child("a", { enter }), child("b", { enter }), child("c", { enter })],
    });
    const html = renderToStaticMarkup(<Render data={data} />);
    expect(html).not.toContain("--m-delay:0ms");
    expect(html).toContain("--m-delay:100ms");
    expect(html).toContain("--m-delay:200ms");
  });

  it("finds motion deep in the tree", () => {
    const deep = page({ children: [{ ...child("x"), children: [child("y", { press: true })] }] });
    expect(hasMotion(deep.root)).toBe(true);
    expect(hasMotion(emptyPage().root)).toBe(false);
  });
});
