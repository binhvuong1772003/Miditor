import type { UploadImage } from "./upload-image";

export interface EmbedImageOptions {
  /** The widest the picture is kept, in px. A wider one is made smaller. 1600 when not given. */
  maxWidth?: number;
  /** How well a made-smaller picture is kept, from 0 to 1. 0.82 when not given. */
  quality?: number;
  /** The longest address to make. 200000 characters, which is all the editor accepts, when not given. */
  maxLength?: number;
}

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 0.82;
/** What the editor accepts for a picture kept inside the page (see `isImageUrl` in core). */
const DEFAULT_MAX_LENGTH = 200_000;

/** A picture the editor accepts as it is, so a small one is not made worse for nothing. */
const KEPT_AS_IS = /^image\/(?:png|jpeg|gif|webp|avif)$/;

/** The size to draw a picture at: its own, or narrower to fit `maxWidth`, in the same proportions. */
export function fitWidth(
  width: number,
  height: number,
  maxWidth: number,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  if (width <= maxWidth) return { width, height };
  return { width: maxWidth, height: Math.max(1, Math.round((height * maxWidth) / width)) };
}

/**
 * The first answer of `encode` that is no longer than `maxLength`, trying lower quality and then
 * smaller sizes, or `undefined` when none fits. `encode` gets the share of the size (1 is the full
 * size) and the quality, and answers with an address.
 */
export function encodeWithin(
  encode: (scale: number, quality: number) => string,
  maxLength: number,
  quality: number,
): string | undefined {
  const tries: [number, number][] = [
    [1, quality],
    [1, quality * 0.75],
    [1, quality * 0.55],
    [0.75, quality * 0.75],
    [0.5, quality * 0.75],
    [0.35, quality * 0.6],
    [0.2, quality * 0.6],
  ];
  for (const [scale, level] of tries) {
    const address = encode(scale, level);
    if (address.length <= maxLength) return address;
  }
  return undefined;
}

const readAsDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read the file"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

const load = (address: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("the file is not a picture the browser can open"));
    image.onload = () => resolve(image);
    image.src = address;
  });

/**
 * An `uploadImage` for a host with no back end: it keeps the picture inside the page as a `data:`
 * address. A small picture is kept as it is. A wider or heavier one is made narrower and compressed
 * (WebP, or JPEG where the browser has no WebP) until it fits, so any photo can be used. It throws
 * only when a picture cannot be made to fit. The page grows by the size of every picture, so a host
 * that can should send them to a back end instead (see `postImage`).
 */
export function embedImage(options: EmbedImageOptions = {}): UploadImage {
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  return async (file) => {
    const original = await readAsDataUrl(file);
    const image = await load(original);
    const size = fitWidth(image.naturalWidth, image.naturalHeight, maxWidth);
    if (
      KEPT_AS_IS.test(file.type) &&
      size.width === image.naturalWidth &&
      original.length <= maxLength
    ) {
      return original;
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("the browser cannot shrink pictures");
    const encode = (scale: number, level: number) => {
      canvas.width = Math.max(1, Math.round(size.width * scale));
      canvas.height = Math.max(1, Math.round(size.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", level);
      if (webp.startsWith("data:image/webp")) return webp;
      // A browser with no WebP gives a PNG back; JPEG has no see-through, so it goes on white.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", level);
    };
    const shrunk = encodeWithin(encode, maxLength, quality);
    if (shrunk === undefined) throw new Error("the picture is too big to keep inside the page");
    return shrunk;
  };
}
