import {
  type NewNodeOverrides,
  parentOf,
  type Registry,
  type SavedTheme,
  savedFrom,
} from "@miditor/core";
import { type ChangeEvent, useRef, useState } from "react";
import { BlocksPanel } from "./BlocksPanel";
import type { EditorProps } from "./Editor";
import styles from "./Editor.module.css";
import { useHidden, useVisibleTool } from "./hide";
import { ImagesPanel } from "./ImagesPanel";
import { useT } from "./i18n/context";
import { type LibraryImage, usableImages } from "./images";
import { LayersPanel } from "./LayersPanel";
import { OverrideSlot } from "./overrides";
import { type Tool, useEditorState, useSelectionCommands } from "./store";
import { ThemesPanel } from "./ThemesPanel";
import { usableThemes } from "./themes";
import { fitPicture, pictureSize, uploadMessage, uploadPicture } from "./upload-image";

type Point = { x: number; y: number };

export interface StartPanelProps {
  /** The blocks as the person reads them (their names in the editor's language). */
  registry: Registry;
  config: EditorProps["config"];
  /** Add a block of this kind, as a press on a card or a picture does. */
  onAddBlock: (kind: string, overrides?: NewNodeOverrides) => void;
  /** A card is over the page (`point`), or has left it (`null`). */
  onDragMove: (kind: string, point: Point | null) => void;
  /** A card was let go at `point` on the screen. */
  onDrop: (kind: string, point: Point) => void;
  /** Put the colours and font of a theme on the page. */
  onApplyTheme: (theme: SavedTheme) => void;
}

/** The Layers tool: every block of the page as a list, to select from. */
export function LayersTool({ registry }: Pick<StartPanelProps, "registry">) {
  const selecting = useSelectionCommands();
  const data = useEditorState((state) => state.history.present);
  const selectedId = useEditorState((state) => state.selectedId);
  const picked = useEditorState((state) => state.picked);
  const hoverId = useEditorState((state) => state.hoverId);

  /**
   * A line of the layers list was pressed: select that block, or with Shift, Ctrl or Cmd add it to the
   * ones selected when it is in the same block as the selected one (the blocks that can be grouped).
   */
  const pickFromLayers = (id: string, parentId: string, add: boolean) => {
    selecting.setHover(null);
    if (
      add &&
      selectedId &&
      id !== selectedId &&
      parentOf(data.root, selectedId)?.id === parentId
    ) {
      selecting.togglePick(id);
      return;
    }
    selecting.selectOnly(id, parentId);
  };

  return (
    <LayersPanel
      root={data.root}
      registry={registry}
      selectedId={selectedId}
      picked={picked}
      hoverId={hoverId}
      onSelect={pickFromLayers}
      onHover={selecting.setHover}
    />
  );
}

/** The Images tool: the host's library, and an upload when the host gave one. */
export function ImagesTool({ config, onAddBlock }: Pick<StartPanelProps, "config" | "onAddBlock">) {
  const t = useT();
  const onPhone = useEditorState((state) => state.frame === "phone");
  const chooser = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  });
  // After an upload the editor may have moved on, so the block is added by the newest `onAddBlock`.
  const latestAdd = useRef(onAddBlock);
  latestAdd.current = onAddBlock;

  /** Upload the chosen picture, then add an `Image` block that already shows it, in its own proportions. */
  const addPicture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const upload = config?.uploadImage;
    if (!file || !upload) return;
    setAdding({ busy: true, error: null });
    const result = await uploadPicture(file, upload);
    if (!result.ok) {
      setAdding({ busy: false, error: uploadMessage(t, result) });
      return;
    }
    const natural = await pictureSize(result.url);
    const size = natural && fitPicture(natural);
    latestAdd.current("Image", { props: { src: result.url }, ...(size ? { size } : {}) });
    setAdding({ busy: false, error: null });
  };

  /** Add a picture of the host's library as an `Image` block, in its own proportions. */
  const addLibraryImage = async (image: LibraryImage) => {
    const natural =
      image.width && image.height
        ? { w: image.width, h: image.height }
        : await pictureSize(image.url);
    const size = natural && fitPicture(natural);
    latestAdd.current("Image", {
      props: { src: image.url, ...(image.name ? { alt: image.name } : {}) },
      ...(size ? { size } : {}),
    });
  };

  return (
    <>
      <input ref={chooser} type="file" accept="image/*" hidden onChange={addPicture} />
      <ImagesPanel
        disabled={onPhone}
        images={usableImages(config?.images)}
        onAdd={addLibraryImage}
        upload={
          config?.uploadImage
            ? {
                busy: adding.busy,
                error: adding.error,
                onChoose: () => chooser.current?.click(),
              }
            : undefined
        }
      />
    </>
  );
}

/** The Themes tool: the themes of the host and the ones a person kept. */
export function ThemesTool({
  config,
  onApplyTheme,
}: Pick<StartPanelProps, "config" | "onApplyTheme">) {
  const data = useEditorState((state) => state.history.present);
  const keepTheme = config?.onThemeSave;
  return (
    <ThemesPanel
      current={data.theme}
      themes={usableThemes(config?.themes)}
      onApply={onApplyTheme}
      onSave={
        keepTheme &&
        ((name) => {
          const { id: _id, ...theme } = savedFrom(data.theme, "", name);
          return keepTheme(theme);
        })
      }
      onRename={config?.onThemeRename}
      onDelete={config?.onThemeDelete}
    />
  );
}

/** The Blocks tool: the cards to press or drag onto the page. */
export function BlocksTool({
  registry,
  onAddBlock,
  onDragMove,
  onDrop,
}: Pick<StartPanelProps, "registry" | "onAddBlock" | "onDragMove" | "onDrop">) {
  const onPhone = useEditorState((state) => state.frame === "phone");
  return (
    <BlocksPanel
      registry={registry}
      disabled={onPhone}
      onAdd={(type) => onAddBlock(type)}
      onDragMove={onDragMove}
      onDrop={onDrop}
    />
  );
}

const LABELS = {
  images: "rail.images",
  themes: "rail.themes",
  layers: "rail.layers",
  blocks: "rail.blocks",
} as const;

/** The tool's own panel, whichever tool the rail chose. */
function ToolContent({ tool, ...props }: StartPanelProps & { tool: Tool }) {
  if (tool === "layers") return <LayersTool registry={props.registry} />;
  if (tool === "images") return <ImagesTool config={props.config} onAddBlock={props.onAddBlock} />;
  if (tool === "themes") {
    return <ThemesTool config={props.config} onApplyTheme={props.onApplyTheme} />;
  }
  return (
    <BlocksTool
      registry={props.registry}
      onAddBlock={props.onAddBlock}
      onDragMove={props.onDragMove}
      onDrop={props.onDrop}
    />
  );
}

/** The panel on the left: the blocks, the layers, the pictures or the themes, as the rail chose. */
export function StartPanel(props: StartPanelProps) {
  const t = useT();
  const tool = useVisibleTool(useEditorState((state) => state.tool));
  return (
    <OverrideSlot name="panelStart" props={{ tool }}>
      <aside className={`${styles.panel} ${styles.start}`} aria-label={t(LABELS[tool])}>
        <ToolContent tool={tool} {...props} />
      </aside>
    </OverrideSlot>
  );
}

/**
 * One tool's panel placed on its own, whatever tool the rail chose and whether the panel is open. A tool
 * the host hid is not drawn.
 */
export function ToolPanel({ tool, ...props }: StartPanelProps & { tool: Tool }) {
  const t = useT();
  const hidden = useHidden(`tool.${tool}`);
  if (hidden) return null;
  return (
    <OverrideSlot name="panelStart" props={{ tool }}>
      <aside className={styles.panel} aria-label={t(LABELS[tool])}>
        <ToolContent tool={tool} {...props} />
      </aside>
    </OverrideSlot>
  );
}
