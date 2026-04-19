// biome.ts
import type { BiomeType } from "../types";

export type { BiomeType };

const RUN_BIOMES: readonly BiomeType[] = ["open_sea", "island_chain", "deep_waters"];

export function pickRunBiome(): BiomeType {
  const index = Math.floor(Math.random() * RUN_BIOMES.length);
  // Math.random() in [0, 1) so index is in [0, RUN_BIOMES.length); the clamp guards against the
  // theoretical edge case where Math.random() returns exactly 1 (it doesn't, but defence-in-depth).
  return RUN_BIOMES[Math.min(RUN_BIOMES.length - 1, index)];
}
