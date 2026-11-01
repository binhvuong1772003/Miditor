import type { Edges } from "../marquee";

/** The box a person is dragging out on the empty page, in screen px. */
export function Marquee({ box }: { box: Edges }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: box.left,
        top: box.top,
        width: box.right - box.left,
        height: box.bottom - box.top,
        border: "1px solid var(--_focus)",
        background: "color-mix(in srgb, var(--_focus) 15%, transparent)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}
