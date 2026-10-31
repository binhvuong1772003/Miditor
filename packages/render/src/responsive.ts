import type { CSSProperties } from "react";

/**
 * The custom property that says "this is a phone". It is not set on a desktop, where it counts as
 * having no value, and it is set to an empty value on a phone (see `responsiveCss`). A declaration
 * that uses it, like `--m-left-p: var(--midito-phone) 4%`, is only valid on a phone, and a `var()`
 * with a fallback picks the phone value or the desktop value by that.
 */
export const PHONE_VAR = "--midito-phone";

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** What a property is on the screen that does not set it: its own initial value. */
const ABSENT = "initial";

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
    extra[`${name}-d`] = d === undefined ? ABSENT : String(d);
    extra[`${name}-p`] = `var(${PHONE_VAR}) ${p === undefined ? ABSENT : String(p)}`;
  }
  return { ...out, ...extra } as CSSProperties;
}
