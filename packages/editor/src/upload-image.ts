import { isImageUrl } from "@midito-kitchen/core";

/** What the host's upload function does with a file: a picture address, or a promise of one. */
export type UploadImage = (file: File) => Promise<string>;

/** The address of an uploaded picture, or a message for the person to read. */
export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Hand a chosen file to the host's upload function and check what comes back. Only a picture is
 * sent, and the address that comes back must be one `render` will draw (see `isImageUrl`): a host
 * that answers with anything else is told apart from one that failed, but neither is stored.
 */
export async function uploadPicture(file: File, upload: UploadImage): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "Choose a picture file." };
  let url: unknown;
  try {
    url = await upload(file);
  } catch (error) {
    const reason = error instanceof Error && error.message ? `: ${error.message}` : "";
    return { ok: false, error: `The upload failed${reason}` };
  }
  return isImageUrl(url)
    ? { ok: true, url }
    : { ok: false, error: "The upload gave an address that cannot be used." };
}

/** The widest a picture is placed when it is added; a smaller one keeps its own width. */
export const MAX_ADDED_WIDTH = 320;

/**
 * The size, in px, to start a block that shows a picture of this natural size: its own proportions,
 * and no wider than `MAX_ADDED_WIDTH`. `undefined` when the size is not usable, so the caller falls
 * back to the size of its kind.
 */
export function fitPicture(natural: {
  w: number;
  h: number;
}): { w: number; h: number } | undefined {
  const { w, h } = natural;
  if (!(Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)) return undefined;
  const scale = Math.min(1, MAX_ADDED_WIDTH / w);
  return { w: Math.round(w * scale), h: Math.max(1, Math.round(h * scale)) };
}

/** The natural size of the picture at this address, or `undefined` when the browser cannot load it. */
export const pictureSize = (url: string) =>
  new Promise<{ w: number; h: number } | undefined>((resolve) => {
    const picture = new Image();
    picture.onload = () => resolve({ w: picture.naturalWidth, h: picture.naturalHeight });
    picture.onerror = () => resolve(undefined);
    picture.src = url;
  });
