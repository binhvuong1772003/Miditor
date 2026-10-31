import styles from "./GapLabels.module.css";
import type { Gap } from "./gaps";

export interface GapLabelsProps {
  gaps: readonly Gap[];
  /**
   * Where the page's px are on the screen: the top left of the block the gaps are measured in, and
   * how many screen px one page px is (the zoom).
   */
  origin: { left: number; top: number; scale: number };
}

/**
 * The distances between the block being dragged and what is next to it: a thin line along each gap
 * with its length in px on it. It is only drawn, never in the way of the pointer, and it is in screen
 * px, so the line stays one px thin at any zoom while its number stays the page's own px.
 */
export function GapLabels({ gaps, origin }: GapLabelsProps) {
  const at = (x: number, y: number) => ({
    x: origin.left + x * origin.scale,
    y: origin.top + y * origin.scale,
  });
  return (
    <div aria-hidden="true" className={styles.layer}>
      {gaps.map((gap) => {
        const a = at(gap.from.x, gap.from.y);
        const b = at(gap.to.x, gap.to.y);
        const across = gap.direction === "left" || gap.direction === "right";
        return (
          <div key={gap.direction}>
            <div
              className={styles.line}
              style={
                across
                  ? { left: Math.min(a.x, b.x), top: a.y, width: Math.abs(b.x - a.x), height: 1 }
                  : { left: a.x, top: Math.min(a.y, b.y), width: 1, height: Math.abs(b.y - a.y) }
              }
            />
            <div className={styles.label} style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 }}>
              {gap.distance}
            </div>
          </div>
        );
      })}
    </div>
  );
}
