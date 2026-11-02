import styles from "./Editor.module.css";
import { useHidden, useVisibleTool } from "./hide";
import type { HostTool } from "./host-tool";
import { useT } from "./i18n/context";
import { Icon, isIconName } from "./icons";
import { OverrideSlot, type RailTool } from "./overrides";
import { type Run, useEditorState } from "./store";

/** The strip of tools down the side: pressing one shows its panel, or hides the panel if it is open. */
export function Rail({
  run,
  hostTools = [],
}: {
  run: Run;
  /** The tools the host gave, after the editor's own. */
  hostTools?: readonly HostTool[];
}) {
  const t = useT();
  const tool = useVisibleTool(
    useEditorState((state) => state.tool),
    hostTools.map(({ id }) => id),
  );
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
  for (const host of hostTools) {
    tools.push({
      id: host.id,
      name: host.label,
      icon: host.icon ?? host.label.slice(0, 2).toUpperCase(),
      active: tool === host.id && panelOpen,
      pick: () => run("tool.pick", host.id),
    });
  }
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
            {typeof icon === "string" && isIconName(icon) ? <Icon name={icon} size={18} /> : icon}
            {name}
          </button>
        ))}
      </nav>
    </OverrideSlot>
  );
}
