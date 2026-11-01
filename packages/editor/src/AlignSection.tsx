import type { AlignTo } from "@midito-kitchen/core";
import { Icon, type IconName } from "./icons";
import styles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

const ALIGN_ACROSS: [AlignTo, IconName, string][] = [
  ["left", "edgeLeft", "Align left"],
  ["center", "edgeCenter", "Align centre"],
  ["right", "edgeRight", "Align right"],
];
const ALIGN_DOWN: [AlignTo, IconName, string][] = [
  ["top", "edgeTop", "Align top"],
  ["middle", "edgeMiddle", "Align middle"],
  ["bottom", "edgeBottom", "Align bottom"],
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
  return (
    <Section
      title="Align"
      help={
        selectedCount > 1
          ? "Line the selected blocks up with each other."
          : "Line the block up with the page."
      }
    >
      <div className={styles.grid2}>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div role="group" aria-label="Align across" className={styles.seg}>
          {ALIGN_ACROSS.map(([to, icon, label]) => (
            <button
              key={to}
              type="button"
              className={styles.segButton}
              aria-label={label}
              title={label}
              onClick={() => onAlign(to)}
            >
              <Icon name={icon} />
            </button>
          ))}
        </div>
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing */}
        <div role="group" aria-label="Align down" className={styles.seg}>
          {ALIGN_DOWN.map(([to, icon, label]) => (
            <button
              key={to}
              type="button"
              className={styles.segButton}
              aria-label={label}
              title={label}
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
                ? "Select three or more blocks to spread them"
                : `Equal gaps ${axis === "x" ? "across" : "down"}`
            }
            onClick={() => onDistribute(axis)}
          >
            <Icon name={axis === "x" ? "spreadX" : "spreadY"} />
            {axis === "x" ? "Across" : "Down"}
          </button>
        ))}
      </div>
    </Section>
  );
}
