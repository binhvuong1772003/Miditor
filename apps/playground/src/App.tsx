import { Editor, embedImage, type PageData, type SaveStatus } from "@midito-kitchen/editor";
import { useState } from "react";
import { actions } from "./actions";
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
 * `data:` address. `embedImage` makes a big picture smaller first, so any photo fits; a host with a
 * back end would use `postImage("/api/images")` here.
 */
const uploadImage = embedImage();

export function App() {
  // `?preview` shows the stored page the way a visitor would get it, for any width.
  if (new URLSearchParams(window.location.search).has("preview")) return <Preview />;
  return <Playground />;
}

function Playground() {
  const [page] = useState(openPage);
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [sent, setSent] = useState<string | null>(null);
  // How the stand-in "server" is doing, for the header. A real host sets it from its own request.
  const [status, setStatus] = useState<SaveStatus>("saved");

  return (
    <>
      <Editor
        data={page}
        config={{ components, renderers, uploadImage, actions }}
        // Autosave: a run of changes is one call, 800 ms after the last one and at least every 4 s.
        onChangeDebounce={{ wait: 800, maxWait: 4000 }}
        status={status}
        onChange={(data) => {
          setStatus("saving");
          storePage(window.localStorage, data);
          // A request to a back end takes a moment; this is that moment.
          window.setTimeout(() => setStatus("saved"), 300);
        }}
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
