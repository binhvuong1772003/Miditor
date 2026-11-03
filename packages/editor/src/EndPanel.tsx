import { findNode } from "@miditor/core";
import type { ComponentProps } from "react";
import type { EditorProps } from "./Editor";
import styles from "./Editor.module.css";
import { usableFonts } from "./fonts";
import { useT } from "./i18n/context";
import { OverrideSlot } from "./overrides";
import { PageInspector } from "./PageInspector";
import { PropertiesPanel } from "./PropertiesPanel";
import { type useDocumentCommands, useEditorState, type useSelectionCommands } from "./store";

export interface EndPanelProps {
  config: EditorProps["config"];
  documents: ReturnType<typeof useDocumentCommands>;
  selecting: ReturnType<typeof useSelectionCommands>;
  /** The size of the parent of the selected block on the screen, which the number fields measure in. */
  parentSize: () => { w: number; h: number } | undefined;
  /** The page as it is drawn: how tall, and the shortest it can be. */
  pageHeight: ComponentProps<typeof PageInspector>["pageHeight"];
  /** Where the selected block is on this screen, in its parent's px. */
  selectedRect: ComponentProps<typeof PropertiesPanel>["rect"];
  /** What the selected block is, as the person reads it. */
  shownDef: ComponentProps<typeof PropertiesPanel>["def"];
}

/** The panel on the right: the page's own settings, or the properties of the selected block. */
export function EndPanel({
  config,
  documents,
  selecting,
  parentSize,
  pageHeight,
  selectedRect,
  shownDef,
}: EndPanelProps) {
  const t = useT();
  const data = useEditorState((state) => state.history.present);
  const selectedId = useEditorState((state) => state.selectedId);
  const picked = useEditorState((state) => state.picked);
  const frame = useEditorState((state) => state.frame);
  const selectedNode = selectedId ? findNode(data.root, selectedId) : undefined;
  // The fonts people can choose: the host's, or the ones every browser has.
  const fonts = usableFonts(config?.fonts);
  return (
    <OverrideSlot
      name="panelEnd"
      props={{ mode: selectedNode ? "block" : "page", nodeId: selectedNode?.id ?? null }}
    >
      <aside className={`${styles.panel} ${styles.end}`} aria-label={t("panel.properties")}>
        {!selectedNode && (
          <PageInspector
            page={data.root}
            theme={data.theme}
            meta={data.meta}
            onMeta={documents.changeMeta}
            pageHeight={pageHeight}
            onPhone={frame === "phone"}
            onArrangePhone={documents.arrangePhone}
            onPageHeight={(height) =>
              documents.commitPatch(data.root.id, {
                key: frame === "phone" ? "phoneMinHeight" : "minHeight",
                value: height,
              })
            }
            uploadImage={config?.uploadImage}
            onPreview={(patch) => documents.setDraft({ id: data.root.id, ...patch })}
            onCommit={(patch) => documents.commitPatch(data.root.id, patch)}
            fonts={fonts}
            onPageFont={(stack) => documents.setThemeFont("body", stack)}
            themeActions={{
              onSetColor: documents.setThemeColor,
              onRenameColor: documents.renameThemeColor,
              onDeleteColor: documents.deleteThemeColor,
            }}
          />
        )}
        {selectedNode && (
          <PropertiesPanel
            onBackToPage={() => {
              selecting.selectPage(data.root.id);
            }}
            // A new panel for each node, so text typed for one is never applied to another.
            key={selectedNode?.id ?? "none"}
            node={selectedNode}
            device={frame}
            onResetPhone={documents.resetPhone}
            selectedCount={1 + picked.length}
            onAlign={(to) => documents.alignSelected(parentSize() ?? null, to)}
            onDistribute={(axis) => documents.distributeSelected(parentSize() ?? null, axis)}
            actions={config?.actions}
            customFields={config?.customFields}
            sources={config?.sources}
            fonts={fonts}
            def={shownDef}
            onPreview={(patch) =>
              selectedNode && documents.setDraft({ id: selectedNode.id, ...patch })
            }
            onCommit={(patch) => selectedNode && documents.commitPatch(selectedNode.id, patch)}
            onDiscard={() => documents.setDraft(null)}
            onAnchor={(axis, anchor) =>
              documents.changeAnchor({ axis, anchor, container: parentSize() ?? null })
            }
            rect={selectedRect}
            onRect={(field, value) =>
              documents.setRect({ field, value, container: parentSize() ?? null })
            }
            theme={data.theme}
            uploadImage={config?.uploadImage}
          />
        )}
      </aside>
    </OverrideSlot>
  );
}
