import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorProvider } from "./Editor";
import { ExternalNote } from "./external-field";
import { SourcesBanner } from "./SourcesBanner";

const draw = (node: React.ReactElement) => renderToString(<EditorProvider>{node}</EditorProvider>);

describe("the banner of newer data", () => {
  it("draws nothing when no block has newer data", () => {
    expect(draw(<SourcesBanner count={0} onUpdate={() => {}} />)).not.toContain("newer");
  });

  it("says how many blocks have newer data and offers Update", () => {
    const html = draw(<SourcesBanner count={3} onUpdate={() => {}} />);
    expect(html).toContain("3 blocks have newer data");
    expect(html).toContain('role="status"');
    expect(html).toContain(">Update<");
  });

  it("says it in the singular for one block", () => {
    expect(draw(<SourcesBanner count={1} onUpdate={() => {}} />)).toContain(
      "1 block has newer data",
    );
  });
});

describe("the note under an external field", () => {
  const stored = { id: "a", label: "A", data: { price: 1 } };
  const note = (answer: Parameters<typeof ExternalNote>[0]["answer"]) =>
    draw(<ExternalNote value={stored} answer={answer} />);

  it("says the item is gone, and that it keeps what it had", () => {
    expect(note({ status: "gone" })).toContain("No longer in the source");
  });

  it("says the item could not be checked", () => {
    expect(note({ status: "failed" })).toContain("Could not check");
  });

  it("says nothing when the item is the same, has newer data, or was never asked about", () => {
    expect(
      note({ status: "found", item: { id: "a", label: "A", data: { price: 1 } } }),
    ).not.toContain("note");
    expect(
      note({ status: "found", item: { id: "a", label: "A", data: { price: 2 } } }),
    ).not.toContain("note");
    expect(note(undefined)).not.toContain("note");
  });
});
