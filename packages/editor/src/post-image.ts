import type { UploadImage } from "./upload-image";

export interface PostImageOptions {
  /** The name of the file in the form the server reads. `"file"` when not given. */
  field?: string;
  /** Where the address is in the JSON the server answers with: `"url"` or a path like `"data.url"`. */
  answer?: string;
  /** Extra headers, for example `{ Authorization: "Bearer …" }`. Do not set the content type. */
  headers?: Record<string, string>;
  /** Whether to send cookies, as `fetch` has it. */
  credentials?: RequestCredentials;
  /** The `fetch` to use. The global one when not given. */
  fetch?: typeof fetch;
}

/** The value at a dotted path of parsed JSON, or `undefined` when any step is missing. */
export function valueAt(json: unknown, path: string): unknown {
  let value = json;
  for (const key of path.split(".")) {
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/**
 * An `uploadImage` that sends the file to a back end of the host: a `multipart/form-data` POST to
 * `url`. The server stores the picture and answers with JSON that holds its address. What the server
 * checks, stores and cleans up afterwards is its own business. A failure is thrown with a message
 * the editor shows to the person.
 */
export function postImage(url: string, options: PostImageOptions = {}): UploadImage {
  const { field = "file", answer = "url", headers, credentials } = options;
  return async (file) => {
    const body = new FormData();
    body.append(field, file);
    const send = options.fetch ?? fetch;
    const response = await send(url, {
      method: "POST",
      body,
      ...(headers ? { headers } : {}),
      ...(credentials ? { credentials } : {}),
    });
    if (!response.ok) throw new Error(`the server answered ${response.status}`);
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new Error("the server did not answer with JSON");
    }
    const address = valueAt(json, answer);
    if (typeof address !== "string") throw new Error(`the answer has no "${answer}" address`);
    return address;
  };
}
