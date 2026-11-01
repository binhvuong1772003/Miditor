import type { AlignTo } from "@midito-kitchen/core";
import { useT } from "./i18n/context";
import type { MessageKey } from "./i18n/en";
import { Icon, type IconName } from "./icons";
import styles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

const ALIGN_ACROSS: [AlignTo, IconName, MessageKey][] = [
  ["left", "edgeLeft", "align.left"],
  ["center", "edgeCenter", "align.center"],
  ["right", "edgeRight", "align.right"],
];
const ALIGN_DOWN: [AlignTo, IconName, MessageKey][] = [
  ["top", "edgeTop", "align.top"],
  ["middle", "edgeMiddle", "align.middle"],
  ["bottom", "edgeBottom", "align.bottom"],
];

export interface AlignSectionProps {
  /** How many blocks are selected: with several they line up with each other, with one with the page. */
  selectedCount: number;
  onAlign: (to: AlignTo) => void;
  /** Spread three or more blocks so the gaps between them are equal. */
  onDistribute: (axis: "x" | "y") => void;
}

/** Lines the selected blocks up, and spreads three or more of them with equal gaps. */
export function AlignSection({ selectedCount, onAlign, onDistribute }: AlignSectionProps) {
  const t = useT();
  return (
    <Section
      id="align"
      title={t("align.title")}
      help={selectedCount > 1 ? t("align.helpMany") : t("align.helpOne")}
    >
      <div className={styles.grid2}>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div role="group" aria-label={t("align.across")} className={styles.seg}>
          {ALIGN_ACROSS.map(([to, icon, key]) => (
            <button
              key={to}
              type="button"
              className={styles.segButton}
              aria-label={t(key)}
              title={t(key)}
              onClick={() => onAlign(to)}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div role="group" aria-label={t("align.down")} className={styles.seg}>
          {ALIGN_DOWN.map(([to, icon, key]) => (
            <button
              key={to}
              type="button"
              className={styles.segButton}
              aria-label={t(key)}
              title={t(key)}
              onClick={() => onAlign(to)}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
        {(["x", "y"] as const).map((axis) => (
          <button
            key={axis}
            type="button"
            className={styles.chip}
            disabled={selectedCount < 3}
            title={
              selectedCount < 3
                ? t("align.spreadNeed")
                : t(axis === "x" ? "align.spreadAcross" : "align.spreadDown")
            }
            onClick={() => onDistribute(axis)}
          >
            <Icon name={axis === "x" ? "spreadX" : "spreadY"} />
            {axis === "x" ? t("align.acrossShort") : t("align.downShort")}
          </button>
        ))}
      </div>
    </Section>
  );
}
