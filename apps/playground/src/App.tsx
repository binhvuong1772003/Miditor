import { Editor, type PageData, type Registry } from "@midito-kitchen/editor";
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

/** A kind of the host's own, to try `config`: it keeps its ratio when resized. Render does not draw it yet. */
const components: Registry = {
  Heart: {
    label: "Heart (demo)",
    size: { w: 120, h: 100 },
    lockRatio: true,
    canContain: false,
    defaultProps: {},
    fields: {},
  },
};

export function App() {
  const [page] = useState(openPage);
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [sent, setSent] = useState<string | null>(null);

  return (
    <>
      <Editor
        data={page}
        config={{ components }}
        onChange={(data) => storePage(window.localStorage, data)}
        onSave={(data) => setSent(JSON.stringify(data, null, 2))}
      />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
