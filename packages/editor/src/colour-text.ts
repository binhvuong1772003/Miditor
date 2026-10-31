const channel = (value: string) => {
  const n = Number(value);
  return n <= 255 ? n.toString(16).padStart(2, "0") : undefined;
};

/**
 * The `#rrggbb` of a colour someone typed or pasted, or `undefined` when it is not one. It reads
 * `#2563eb`, `2563eb` and the short `#25e`, and `rgb(37, 99, 235)`, `37, 99, 235` or `37 99 235`.
 */
export function parseColourText(text: string): string | undefined {
  const typed = text.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(typed)?.[1];
  if (hex) return `#${hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex}`;
  const wrapped = /^rgb\((.*)\)$/.exec(typed);
  const inside = wrapped ? (wrapped[1] ?? "") : typed;
  const numbers = /^\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*$/.exec(inside);
  if (!numbers) return undefined;
  const [r, g, b] = [numbers[1], numbers[2], numbers[3]].map((value) =>
    value === undefined ? undefined : channel(value),
  );
  return r && g && b ? `#${r}${g}${b}` : undefined;
}
