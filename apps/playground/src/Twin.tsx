import { Editor } from "@miditor/editor";

/**
 * Two editors on one page, `?twin`, to see that each keeps its own page, selection, zoom and frame.
 * Neither stores anything, so they open the same on every visit.
 */
export function Twin() {
  return (
    <div className="twin">
      <section data-twin="left" aria-label="Left editor">
        <Editor />
      </section>
      <section data-twin="right" aria-label="Right editor">
        <Editor />
      </section>
    </div>
  );
}
