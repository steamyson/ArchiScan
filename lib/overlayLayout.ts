import type { ArchitecturalElement, ElementHierarchy } from "../types/scan";

export interface LabelPosition {
  element: ArchitecturalElement;
  side: "left" | "right";
  leaderEndX: number;
  leaderEndY: number;
  labelY: number;
}

export const HIERARCHY_COLORS: Record<ElementHierarchy, string> = {
  primary_structure: "#c8a96e",
  secondary_cladding: "#7eb8c4",
  ornamental_detail: "#b87db8",
};

export const HIERARCHY_LABELS: Record<ElementHierarchy, string> = {
  primary_structure: "Structure",
  secondary_cladding: "Cladding",
  ornamental_detail: "Ornament",
};

const LABEL_HEIGHT = 28;
const MIN_SPACING = 6;

/**
 * Assigns each element to left/right gutter by bounding-box centroid, then
 * vertically spreads labels per-side so none overlap.
 */
export function computeLabelPositions(
  elements: ArchitecturalElement[],
  imageWidth: number,
  imageHeight: number,
): LabelPosition[] {
  const positions: LabelPosition[] = elements.map((el) => {
    const cx = ((el.bounding_box.x_min_pct + el.bounding_box.x_max_pct) / 2 / 100) * imageWidth;
    const cy = ((el.bounding_box.y_min_pct + el.bounding_box.y_max_pct) / 2 / 100) * imageHeight;
    return {
      element: el,
      side: cx < imageWidth / 2 ? "left" : "right",
      leaderEndX: cx,
      leaderEndY: cy,
      labelY: cy,
    };
  });

  for (const side of ["left", "right"] as const) {
    const sideLabels = positions.filter((p) => p.side === side);
    sideLabels.sort((a, b) => a.leaderEndY - b.leaderEndY);

    for (let i = 1; i < sideLabels.length; i++) {
      const prev = sideLabels[i - 1];
      const curr = sideLabels[i];
      const minY = prev.labelY + LABEL_HEIGHT + MIN_SPACING;
      if (curr.labelY < minY) {
        curr.labelY = minY;
      }
    }
  }

  return positions;
}
