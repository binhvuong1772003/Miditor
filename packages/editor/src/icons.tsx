import type { ReactNode } from "react";

/**
 * The icons of the editor, drawn on a 16 px grid with a 1.4 stroke and round caps, as in the UI kit.
 * They are decoration beside a visible name or inside a button that has its own accessible name, so
 * they are hidden from assistive technology.
 */
const ICONS = {
  undo: <path d="M5 6 2.5 8.5 5 11M2.5 8.5H10a3.5 3.5 0 0 1 0 7" />,
  redo: <path d="m11 6 2.5 2.5L11 11M13.5 8.5H6a3.5 3.5 0 0 0 0 7" />,
  plus: <path d="M8 3v10M3 8h10" />,
  img: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1" />
      <circle cx="6" cy="7" r="1.2" />
      <path d="m3 12 3.5-3 3 2.5 2-1.5 2 2" />
    </>
  ),
  copy: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </>
  ),
  up: <path d="M8 13V3M4 7l4-4 4 4" />,
  down: <path d="M8 3v10M4 9l4 4 4-4" />,
  front: <path d="M3 3h10M8 13V6M4.5 9.5 8 6l3.5 3.5" />,
  back: <path d="M3 13h10M8 3v7M4.5 6.5 8 10l3.5-3.5" />,
  desk: (
    <>
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M6 13.5h4M8 11v2.5" />
    </>
  ),
  phone: (
    <>
      <rect x="5" y="2" width="6" height="12" rx="1.2" />
      <path d="M7.5 12h1" />
    </>
  ),
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />,
  grid: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" />
      <rect x="9" y="2.5" width="4.5" height="4.5" />
      <rect x="2.5" y="9" width="4.5" height="4.5" />
      <rect x="9" y="9" width="4.5" height="4.5" />
    </>
  ),
  palette: (
    <path d="M8 2a6 6 0 1 0 0 12c1 0 1.4-.7 1-1.5s-.2-1.5.8-1.5H12a2 2 0 0 0 2-2C14 4.7 11.3 2 8 2z" />
  ),
  text: <path d="M3 4V3h10v1M8 3v10M6 13h4" />,
  shape: (
    <>
      <rect x="2.5" y="2.5" width="6" height="6" />
      <circle cx="10.5" cy="10.5" r="3" />
    </>
  ),
  box: <rect x="2.5" y="2.5" width="11" height="11" rx="2" />,
  button: <rect x="2" y="5" width="12" height="6" rx="3" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
