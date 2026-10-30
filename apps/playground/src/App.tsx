import {
  Editor,
  type PageData,
  type Registry,
  type Renderer,
  resolveColor,
} from "@midito-kitchen/editor";
import { useState } from "react";
import { SentDataDialog } from "./SentDataDialog";
import { loadPage, storePage } from "./storage";

/** `?reset` in the address drops the stored page; it is taken out of the address so a reload keeps the page. */
function openPage(): PageData {
  const url = new URL(window.location.href);
  const reset = url.searchParams.has("reset");
  if (reset) {
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", url);
  }
  return loadPage(window.localStorage, reset);
}

/** A kind of the host's own, to try `config`: it keeps its ratio when resized. */
const components: Registry = {
  Heart: {
    label: "Heart (demo)",
    size: { w: 120, h: 100 },
    lockRatio: true,
    canContain: false,
    defaultProps: { color: "#e11d48" },
    fields: { color: { type: "color", label: "Colour" } },
  },
};

/** How the host draws its own kind: a heart that fills its box, in the colour stored on the block. */
const renderers: Record<string, Renderer> = {
  Heart: ({ props, theme }) => (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"
        fill={resolveColor(props.color, theme) ?? "#e11d48"}
      />
    </svg>
  ),
};

/**
 * A stand-in for the host's upload (Cloudinary, S3...): it keeps the picture inside the page as a
 * `data:` address, which the editor accepts up to 200000 characters, so about 150 KB of picture.
 */
const uploadImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read the file"));
    reader.onload = () => {
      const url = String(reader.result);
      if (url.length > 200_000) reject(new Error("the demo keeps pictures under 150 KB"));
      else resolve(url);
    };
    reader.readAsDataURL(file);
  });

export function App() {
  const [page] = useState(openPage);
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [sent, setSent] = useState<string | null>(null);

  return (
    <>
      <Editor
        data={page}
        config={{ components, renderers, uploadImage }}
        onChange={(data) => storePage(window.localStorage, data)}
        onSave={(data) => setSent(JSON.stringify(data, null, 2))}
      />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
