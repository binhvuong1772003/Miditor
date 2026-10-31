import { Editor, type PageData } from "@midito-kitchen/editor";
import { useState } from "react";
import { components, renderers } from "./kinds";
import { Preview } from "./Preview";
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
  // `?preview` shows the stored page the way a visitor would get it, for any width.
  if (new URLSearchParams(window.location.search).has("preview")) return <Preview />;
  return <Playground />;
}

function Playground() {
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
        headerActions={
          <a className="preview-link" href="?preview" target="_blank" rel="noreferrer">
            Responsive preview
          </a>
        }
      />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
