import { Editor, type PageData } from "@midito-kitchen/editor";
import { useState } from "react";
import { SentDataDialog } from "./SentDataDialog";
import { SAMPLE_PAGE } from "./sample-page";

export function App() {
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [sent, setSent] = useState<string | null>(null);
  const save = (data: PageData) => setSent(JSON.stringify(data, null, 2));

  return (
    <>
      <Editor data={SAMPLE_PAGE} onSave={save} />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
