import type { ReactElement } from "react";
import type { BiomeType } from "../game/types";

const BIOME_COLOR: Record<BiomeType, string> = {
  open_sea: "#a8d8e0",
  island_chain: "#ffe16b",
  deep_waters: "#9a7bff",
  boss_storm: "#ff6060",
};

function formatBiomeName(biome: string): string {
  return biome
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface BiomeBadgeProps {
  biome: BiomeType;
}

export function BiomeBadge({ biome }: BiomeBadgeProps): ReactElement {
  return (
    <div className="biome-badge" style={{ color: BIOME_COLOR[biome] }}>
      <div className="dot" />
      {formatBiomeName(biome)}
    </div>
  );
}
