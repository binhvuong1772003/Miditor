import { useLayoutEffect, useRef } from "react";
import { cleanEditedText } from "./edited-text";
import { useT } from "./i18n/context";

export interface InlineEditProps {
  /** The block that is being edited, as `<Render>` drew it: the box and the look of the words come from it. */
  element: HTMLElement;
  /** What is written now. */
  value: string;
  /** Enter starts a new line; without it Enter ends the edit and no line break can be typed. */
  multiline: boolean;
  /** The most characters the words may have, or `undefined` for no limit. */
  maxLength: number | undefined;
  /** How far the block is turned on the screen, parents included, in degrees. */
  rotation: number;
  /** The zoom of the canvas: the box on the screen is this many times the block's own size. */
  zoom: number;
  /** The edit ended with these words. */
  onDone: (value: string) => void;
  /** The edit was dropped. */
  onCancel: () => void;
}

/** Whether the browser can type plain text only into an element, with no bold or links by accident. */
const plainOnly = (() => {
  if (typeof document === "undefined") return false;
  const probe = document.createElement("div");
  try {
    probe.contentEditable = "plaintext-only";
  } catch {
    return false;
  }
  return probe.contentEditable === "plaintext-only";
})();

/**
 * The words of a block, typed on the block. It sits over the block, the same size, in the same place
 * and turned the same way, with the look of the words copied from it, so the page does not seem to
 * move. The words are plain text. They end with Enter (one line) or Ctrl/Cmd+Enter (lines), or by
 * pressing somewhere else; Esc drops them.
 */
export function InlineEdit({
  element,
  value,
  multiline,
  maxLength,
  rotation,
  zoom,
  onDone,
  onCancel,
}: InlineEditProps) {
  const t = useT();
  const field = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const look = getComputedStyle(element);
  const box = element.getBoundingClientRect();

  // Start with the words in it, all of them selected, and the keyboard in it.
  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.textContent = value;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [value]);

  const done = () => {
    if (finished.current) return;
    finished.current = true;
    // biome-ignore lint/performance/useDomNodeTextContent: innerText keeps the line breaks that textContent loses
    onDone(cleanEditedText(field.current?.innerText ?? "", multiline, maxLength));
  };
  const cancel = () => {
    if (finished.current) return;
    finished.current = true;
    onCancel();
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: the words of a block are typed in place; a textarea cannot take its look
    <div
      ref={field}
      role="textbox"
      aria-label={t("inline.label")}
      aria-multiline={multiline}
      tabIndex={0}
      contentEditable={plainOnly ? ("plaintext-only" as unknown as boolean) : true}
      suppressContentEditableWarning
      spellCheck={false}
      style={{
        position: "fixed",
        left: box.left + box.width / 2 - element.offsetWidth / 2,
        top: box.top + box.height / 2 - element.offsetHeight / 2,
        width: element.offsetWidth,
        height: element.offsetHeight,
        boxSizing: "border-box",
        transform: rotation === 0 && zoom === 1 ? "none" : `rotate(${rotation}deg) scale(${zoom})`,
        display: "flex",
        alignItems: "center",
        justifyContent: look.justifyContent,
        paddingInline: look.paddingInline,
        fontFamily: look.fontFamily,
        fontSize: look.fontSize,
        fontWeight: look.fontWeight,
        fontStyle: look.fontStyle,
        textDecoration: look.textDecoration,
        lineHeight: look.lineHeight,
        letterSpacing: look.letterSpacing,
        textAlign: look.textAlign as "left",
        color: look.color,
        whiteSpace: multiline ? "pre-wrap" : "pre",
        overflowWrap: "anywhere",
        overflow: "hidden",
        background: "transparent",
        outline: "2px solid var(--_focus, #2563eb)",
        outlineOffset: 0,
        cursor: "text",
        zIndex: 100,
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onBlur={done}
      onInput={(event) => {
        // Past the limit the words are cut, with the caret kept at the end.
        const node = event.currentTarget;
        // biome-ignore lint/performance/useDomNodeTextContent: innerText keeps the line breaks that textContent loses
        const typed = node.innerText;
        if (maxLength !== undefined && typed.length > maxLength + 1) {
          node.textContent = typed.slice(0, maxLength);
          const range = document.createRange();
          range.selectNodeContents(node);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }}
      onKeyDown={(event) => {
        // Nothing typed here reaches the editor's own shortcuts.
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        } else if (event.key === "Enter") {
          if (!multiline || event.ctrlKey || event.metaKey) {
            event.preventDefault();
            done();
          }
        }
      }}
      onPaste={(event) => {
        // Only the words of what is pasted, with none of its look.
        event.preventDefault();
        const text = cleanEditedText(
          event.clipboardData.getData("text/plain"),
          multiline,
          undefined,
        );
        document.execCommand("insertText", false, text);
      }}
    />
  );
}
