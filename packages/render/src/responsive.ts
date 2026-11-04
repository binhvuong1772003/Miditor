import type { CSSProperties } from "react";

/** The width, in px, below which the page is laid out for a phone unless the host says otherwise. */
export const DEFAULT_BREAKPOINT = 640;

/** Which width the switch follows: the box that holds the page, or the window. */
export type ResponsiveQuery = "container" | "viewport";

/** What `responsiveCss` needs. */
export interface ResponsiveOptions {
  /** The width in px at and below which the phone layout is used. Defaults to `DEFAULT_BREAKPOINT`. */
  breakpoint?: number | undefined;
  /** `"container"` (the default) follows the box that holds the page, `"viewport"` the window. */
  query?: ResponsiveQuery | undefined;
}

/**
 * The custom property that says "this is a phone". It is not set on a desktop, where it counts as
 * having no value, and it is set to an empty value on a phone (see `responsiveCss`). A declaration
 * that uses it, like `--m-left-p: var(--miditor-phone) 4%`, is only valid on a phone, and a `var()`
 * with a fallback picks the phone value or the desktop value by that.
 */
export const PHONE_VAR = "--miditor-phone";

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * What a property is on the screen that does not set it: its own initial value. The keyword `initial`
 * cannot stand for it inside a variable: after `var()` has put it in, the browser reads it as the
 * keyword of the variable itself, which empties the variable, so the other screen's value would show
 * through. The layout properties a screen leaves out are therefore spelled out; any other property
 * is left to the keyword.
 */
const ABSENT: Record<string, string> = {
  left: "auto",
  right: "auto",
  top: "auto",
  bottom: "auto",
  width: "auto",
  height: "auto",
  maxWidth: "none",
  maxHeight: "none",
  minWidth: "0",
  minHeight: "0",
  margin: "0",
  padding: "0",
  order: "0",
  flex: "0 1 auto",
  position: "static",
  transform: "none",
};
const absent = (key: string) => ABSENT[key] ?? "initial";

/**
 * One inline style that gives `desktop` on a desktop and `phone` on a phone, so that one page can
 * hold both and the browser picks by the width of the page. A property with the same value on both
 * screens is written as it is. One that differs is written as `var(--m-p, var(--m-d))`, with the
 * desktop value in `--m-d` and the phone value in `--m-p`, which is valid only on a phone. It has to
 * go through a variable: a style on an element beats every rule of a style sheet, so a media or
 * container query could not change it, but it can change a variable. A property that only one
 * screen sets is the initial value on the other. The keys keep the order of `desktop`, which the
 * cascade of `all` followed by explicit values depends on; the phone-only keys and the variables
 * come after them.
 */
export function splitStyles(desktop: CSSProperties, phone: CSSProperties): CSSProperties {
  const out: Record<string, string | number> = {};
  const extra: Record<string, string> = {};
  const keys = [...Object.keys(desktop), ...Object.keys(phone).filter((key) => !(key in desktop))];
  for (const key of keys) {
    const d = (desktop as Record<string, string | number | undefined>)[key];
    const p = (phone as Record<string, string | number | undefined>)[key];
    if (d !== undefined && p !== undefined && String(d) === String(p)) {
      out[key] = d;
      continue;
    }
    const name = `--m-${kebab(key)}`;
    out[key] = `var(${name}-p, var(${name}-d))`;
    extra[`${name}-d`] = d === undefined ? absent(key) : String(d);
    extra[`${name}-p`] = `var(${PHONE_VAR}) ${p === undefined ? absent(key) : String(p)}`;
  }
  return { ...out, ...extra } as CSSProperties;
}

/** A width a query can use: a whole number of px from 1 to 10000, or else the default. */
const widthOf = (breakpoint: number | undefined) =>
  typeof breakpoint === "number" &&
  Number.isInteger(breakpoint) &&
  breakpoint >= 1 &&
  breakpoint <= 10000
    ? breakpoint
    : DEFAULT_BREAKPOINT;

/**
 * The one style sheet that every responsive page needs, with no part that depends on the page. Where
 * the page is narrow it gives the first node inside the page box `--miditor-phone` with an empty
 * value, which every block under it inherits, so each `var(--m-x-p, var(--m-x-d))` of `splitStyles`
 * takes its phone value. A `container` query looks at the width of the page box, which has to be a
 * container (`container-type: inline-size`); a `viewport` query looks at the window.
 */
export function responsiveCss(options: ResponsiveOptions = {}): string {
  const width = widthOf(options.breakpoint);
  const rule = `:where([data-miditor-render]) > * { ${PHONE_VAR}: ; }`;
  return options.query === "viewport"
    ? `@media (max-width: ${width}px) { ${rule} }`
    : `@container (max-width: ${width}px) { ${rule} }`;
}
