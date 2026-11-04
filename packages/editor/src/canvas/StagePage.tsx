import { type JsonValue, type PageData, pageHeightOn } from "@miditor/core";
import { Render, type Renderer } from "@miditor/render";
import { type CSSProperties, Profiler, type RefObject } from "react";
import styles from "../Editor.module.css";
import { EmptyPage } from "../EmptyPage";
import { countCommit } from "../perf";
import { useEditorState, useViewCommands } from "../store";
import { stageWidth } from "../zoom";
import { FrameStage, frameMode } from "./FrameStage";

export interface StagePageProps {
  /** The element the page is drawn in, which the wheel zoom and the size measure look at. */
  stage: RefObject<HTMLDivElement | null>;
  stageBox: { room: number; page: number; height: number };
  /** The page as it is drawn, with a pending change in it. */
  shown: PageData;
  renderers: Readonly<Record<string, Renderer>> | undefined;
  metadata: JsonValue | undefined;
  /** The page has no blocks yet: a hint to add the first one is drawn over it. */
  empty: boolean;
  /** Draw the page in a frame of its own instead of in place (experimental). */
  /** Told the document of the frame when the page is drawn in one. */
  onFrame?: (doc: Document | null) => void;
  /** Told the keys pressed in the frame (see `FrameStage`). */
  onFrameKey?: (event: KeyboardEvent) => boolean;
  /** Told the wheel turned with Ctrl or Cmd over the frame (see `FrameStage`). */
  onFrameWheel?: (event: WheelEvent, at: { x: number; y: number }) => boolean;
  onAddFirst: () => void;
}

/** The page itself, scaled by the zoom, and the hint over it while it is empty. */
export function StagePage({
  stage,
  stageBox,
  shown,
  renderers,
  metadata,
  empty,
  onFrame,
  onFrameKey,
  onFrameWheel,
  onAddFirst,
}: StagePageProps) {
  const zoom = useEditorState((state) => state.zoom);
  const frame = useEditorState((state) => state.frame);
  const viewing = useViewCommands();
  // Experimental spike: `?iframe` draws the page in a frame of its own.
  const inFrame =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("iframe");
  const pageClass = [
    styles.page,
    frame === "phone" && styles.phone,
    // A page with a height of its own is the sheet as tall as that, not as the room there is.
    pageHeightOn(shown.root, frame) !== undefined && styles.pageFit,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={`${styles.zoomOuter} ${styles.stageBox}`}
      style={
        zoom === 1
          ? undefined
          : {
              inlineSize: stageWidth(stageBox.room, stageBox.page, zoom) * zoom,
              blockSize: stageBox.height * zoom,
              marginInline: "auto",
            }
      }
    >
      <div
        ref={stage}
        className={styles.zoomOuter}
        style={
          zoom === 1
            ? undefined
            : ({
                inlineSize: stageWidth(stageBox.room, stageBox.page, zoom),
                // Its own height, not the scaled one the outer box has, or each measure would grow it.
                flex: "none",
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
                "--_zoom-page": `${stageBox.page}px`,
              } as CSSProperties)
        }
      >
        <Profiler id="canvas" onRender={() => countCommit("canvas")}>
          {inFrame ? (
            <FrameStage
              className={pageClass}
              onDocument={onFrame}
              onKey={onFrameKey}
              onWheel={onFrameWheel}
              minHeight={pageHeightOn(shown.root, frame) === undefined ? "40rem" : undefined}
            >
              <Render
                data={shown}
                device={frame}
                links="inert"
                renderers={renderers}
                metadata={metadata}
              />
            </FrameStage>
          ) : (
            <Render
              data={shown}
              device={frame}
              links="inert"
              renderers={renderers}
              metadata={metadata}
              className={pageClass}
            />
          )}
        </Profiler>
      </div>
      {empty && (
        <EmptyPage
          disabled={frame === "phone"}
          onAdd={onAddFirst}
          onOpenBlocks={() => {
            viewing.showTool("blocks");
          }}
        />
      )}
    </div>
  );
}
