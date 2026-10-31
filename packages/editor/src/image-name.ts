/** What to call a picture in a list: the file name of its address, or a plain name for an inline one. */
export function imageName(address: string): string {
  if (address.startsWith("data:")) return "Uploaded image";
  const path = address.split(/[?#]/, 1)[0] ?? address;
  const last = path
    .split("/")
    .filter((part) => part !== "")
    .pop();
  if (!last) return address;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}
