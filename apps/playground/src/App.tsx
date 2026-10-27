import { Editor, type PageData } from "@midito-kitchen/editor";
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

export function App() {
  const [page] = useState(openPage);
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [sent, setSent] = useState<string | null>(null);

  return (
    <>
      <Editor
        data={page}
        onChange={(data) => storePage(window.localStorage, data)}
        onSave={(data) => setSent(JSON.stringify(data, null, 2))}
      />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
