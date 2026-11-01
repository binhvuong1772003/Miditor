import type { IconComponent } from "@midito-kitchen/editor";
import type { ReactNode } from "react";

/** One icon of the host's own: a bolder, rounder drawing on a 24 px grid, filled where it helps. */
const draw =
  (shape: ReactNode): IconComponent =>
  ({ size }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );

/** The few icons the demo replaces, to show that a host can bring a whole set the same way. */
export const demoIcons: Record<string, IconComponent> = {
  undo: draw(<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />),
  redo: draw(<path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />),
  img: draw(
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <circle cx="9" cy="10" r="2" fill="currentColor" />
      <path d="m21 16-5-5-9 9" />
    </>,
  ),
  trash: draw(<path d="M4 7h16M10 3h4M6 7l1 13h10l1-13" />),
  plus: draw(<path d="M12 4v16M4 12h16" />),
};
