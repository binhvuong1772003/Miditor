/** A colour as hue in degrees (0 up to 360), saturation and value from 0 to 1. */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const channel = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 255);
const pair = (value: number) => channel(value).toString(16).padStart(2, "0");

/** The `#rrggbb` of a colour in HSV. */
export function hsvToHex({ h, s, v }: Hsv): string {
  const hue = (((h % 360) + 360) % 360) / 60;
  const part = (offset: number) => {
    const k = (offset + hue) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${pair(part(5))}${pair(part(3))}${pair(part(1))}`;
}

/** The HSV of a `#rrggbb` colour; hue is 0 for greys. */
export function hexToHsv(hex: string): Hsv {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(
    (at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);
  let h = 0;
  if (span !== 0) {
    if (max === r) h = ((g - b) / span + 6) % 6;
    else if (max === g) h = (b - r) / span + 2;
    else h = (r - g) / span + 4;
  }
  return { h: h * 60, s: max === 0 ? 0 : span / max, v: max };
}
