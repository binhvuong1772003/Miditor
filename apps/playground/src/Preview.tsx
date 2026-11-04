import { resolveSources } from "@miditor/editor";
import { pageMeta, Render } from "@miditor/render";
import { useEffect, useState } from "react";
import { itemsSource } from "./items-source";
import { components, metadata, renderers } from "./kinds";
import { loadPage } from "./storage";

const WIDTHS = [
  ["Phone", 375],
  ["Tablet", 768],
  ["Desktop", 1100],
] as const;

/**
 * The stored page drawn for publishing: one `<Render responsive>`, in a box whose width a person
 * sets, to see the phone layout take over as the box gets narrow. Nothing here is the editor.
 */
export function Preview() {
  const [stored] = useState(() => loadPage(window.localStorage));
  // A page whose fields keep references has no data for them: the host fills it in before it draws, here
  // with `resolveSources`. Until the answer is in the page is drawn as it was stored.
  const [page, setPage] = useState(stored);
  useEffect(() => {
    let current = true;
    void resolveSources(stored, components, { items: itemsSource }, { metadata }).then(
      (resolved) => {
        if (current) setPage(resolved.page);
      },
    );
    return () => {
      current = false;
    };
  }, [stored]);
  // The host puts the title of the page in its tab; the description and picture go in the head the same way.
  useEffect(() => {
    const { title } = pageMeta(page);
    if (title) document.title = title;
  }, [page]);
  const [width, setWidth] = useState(1100);
  // What the host did with the last action. A real one would call its own code here.
  const [message, setMessage] = useState("");
  return (
    <div className="preview">
      <header className="preview-bar">
        <a href="?">Back to the editor</a>
        <label className="preview-width">
          Width
          <input
            type="range"
            min={280}
            max={1400}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
          <output>{width}px</output>
        </label>
        {WIDTHS.map(([name, value]) => (
          <button key={name} type="button" onClick={() => setWidth(value)}>
            {name}
          </button>
        ))}
      </header>
      {message && (
        <p className="preview-message" role="status">
          Action: {message}
        </p>
      )}
      <div className="preview-stage">
        <div className="preview-box" style={{ inlineSize: `min(${width}px, 100%)` }}>
          <Render
            data={page}
            responsive={{}}
            renderers={renderers}
            metadata={metadata}
            onAction={(action, payload) => setMessage(`${action} ${JSON.stringify(payload)}`)}
          />
        </div>
      </div>
    </div>
  );
}
