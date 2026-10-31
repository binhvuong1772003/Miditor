/**
 * Words as they are stored after being typed on a block: line breaks as `\n`, without the one a browser
 * adds at the end, and on one line (each break a single space) when the block has one line. A limit
 * cuts what is too long.
 */
export function cleanEditedText(
  text: string,
  multiline: boolean,
  maxLength: number | undefined,
): string {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  const kept = multiline ? lines : lines.replace(/\s*\n+\s*/g, " ");
  return maxLength === undefined ? kept : kept.slice(0, maxLength);
}
