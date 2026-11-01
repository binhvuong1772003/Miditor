import type { PageData } from "@midito-kitchen/core";
import { Render, type Renderer } from "@midito-kitchen/render";
import { type CSSProperties, Profiler, type RefObject } from "react";
import styles from "../Editor.module.css";
import { EmptyPage } from "../EmptyPage";
import { countCommit } from "../perf";
import { useEditorState, useViewCommands } from "../store";
import { stageWidth } from "../zoom";

export interface StagePageProps {
  /** The element the page is drawn in, which the wheel zoom and the size measure look at. */
  stage: RefObject<HTMLDivElement | null>;
  stageBox: { room: number; page: number; height: number };
  /** The page as it is drawn, with a pending change in it. */
  shown: PageData;
  renderers: Readonly<Record<string, Renderer>> | undefined;
  /** The page has no blocks yet: a hint to add the first one is drawn over it. */
  empty: boolean;
  onAddFirst: () => void;
}

/** The page itself, scaled by the zoom, and the hint over it while it is empty. */
export function StagePage({
  stage,
  stageBox,
  shown,
  renderers,
  empty,
  onAddFirst,
}: StagePageProps) {
  const zoom = useEditorState((state) => state.zoom);
  const frame = useEditorState((state) => state.frame);
  const viewing = useViewCommands();
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
          <Render
            data={shown}
            device={frame}
            links="inert"
            renderers={renderers}
            className={frame === "phone" ? `${styles.page} ${styles.phone}` : styles.page}
          />
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
