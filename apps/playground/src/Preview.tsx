import { Render } from "@midito-kitchen/render";
import { useState } from "react";
import { renderers } from "./kinds";
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
  const [page] = useState(() => loadPage(window.localStorage));
  const [width, setWidth] = useState(1100);
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
      <div className="preview-stage">
        <div className="preview-box" style={{ inlineSize: `min(${width}px, 100%)` }}>
          <Render data={page} responsive={{}} renderers={renderers} />
        </div>
      </div>
    </div>
  );
}
