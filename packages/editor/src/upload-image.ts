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
