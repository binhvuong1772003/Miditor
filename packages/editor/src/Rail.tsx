import styles from "./Editor.module.css";
import { useHidden, useVisibleTool } from "./hide";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import { OverrideSlot, type RailTool } from "./overrides";
import { type Run, useEditorState } from "./store";

/** The strip of tools down the side: pressing one shows its panel, or hides the panel if it is open. */
export function Rail({ run }: { run: Run }) {
  const t = useT();
  const tool = useVisibleTool(useEditorState((state) => state.tool));
  const hiddenTool = {
    blocks: useHidden("tool.blocks"),
    layers: useHidden("tool.layers"),
    images: useHidden("tool.images"),
    themes: useHidden("tool.themes"),
  };
  const panelOpen = useEditorState((state) => state.panelOpen);
  const tools: RailTool[] = (
    [
      ["blocks", t("rail.blocks"), "grid"],
      ["layers", t("rail.layers"), "layers"],
      ["images", t("rail.images"), "img"],
      ["themes", t("rail.themes"), "palette"],
    ] as const
  )
    .filter(([id]) => !hiddenTool[id])
    .map(([id, name, icon]) => ({
      id,
      name,
      icon,
      active: tool === id && panelOpen,
      pick: () => run("tool.pick", id),
    }));
  return (
    <OverrideSlot name="rail" props={{ tools }}>
      <nav className={styles.rail} aria-label={t("rail.label")}>
        {tools.map(({ id, name, icon, active, pick }) => (
          <button
            key={id}
            type="button"
            className={styles.railButton}
            aria-current={active ? "true" : undefined}
            title={active ? t("rail.hide", { name }) : name}
            onClick={pick}
          >
            <Icon name={icon} size={18} />
            {name}
          </button>
        ))}
      </nav>
    </OverrideSlot>
  );
}
