import styles from "./Editor.module.css";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import { type Run, useEditorState } from "./store";

/** The strip of tools down the side: pressing one shows its panel, or hides the panel if it is open. */
export function Rail({ run }: { run: Run }) {
  const t = useT();
  const tool = useEditorState((state) => state.tool);
  const panelOpen = useEditorState((state) => state.panelOpen);
  return (
    <nav className={styles.rail} aria-label={t("rail.label")}>
      {(
        [
          ["blocks", t("rail.blocks"), "grid"],
          ["layers", t("rail.layers"), "layers"],
          ["images", t("rail.images"), "img"],
          ["themes", t("rail.themes"), "palette"],
        ] as const
      ).map(([id, name, icon]) => (
        <button
          key={id}
          type="button"
          className={styles.railButton}
          aria-current={tool === id && panelOpen ? "true" : undefined}
          title={tool === id && panelOpen ? t("rail.hide", { name }) : name}
          onClick={() => run("tool.pick", id)}
        >
          <Icon name={icon} size={18} />
          {name}
        </button>
      ))}
    </nav>
  );
}
