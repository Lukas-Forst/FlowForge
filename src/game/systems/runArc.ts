import type { BiomeType } from "../types";

export const RUN_ARC_P1_END = 5 * 60;
export const RUN_ARC_P2_END = 12 * 60;
export const RUN_ARC_P3_END = 18 * 60;
export const RUN_ARC_BIOME_LERP_SEC = 30;

export type RunArcRegionPhase = 1 | 2 | 3 | 4;

export function getRunArcRegionPhase(elapsed: number): RunArcRegionPhase {
  if (elapsed < RUN_ARC_P1_END) return 1;
  if (elapsed < RUN_ARC_P2_END) return 2;
  if (elapsed < RUN_ARC_P3_END) return 3;
  return 4;
}

export function getRunRegionBiome(elapsed: number): BiomeType {
  if (elapsed < RUN_ARC_P1_END) return "open_sea";
  if (elapsed < RUN_ARC_P2_END) return "island_chain";
  if (elapsed < RUN_ARC_P3_END) return "deep_waters";
  return "boss_storm";
}

function lerp(a: number, b: number, u: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, u));
}

export function computeRunSpawnIntensity(elapsed: number): number {
  if (elapsed < RUN_ARC_P1_END) return lerp(0.15, 0.35, elapsed / RUN_ARC_P1_END);
  if (elapsed < RUN_ARC_P2_END) {
    return lerp(0.35, 0.7, (elapsed - RUN_ARC_P1_END) / (RUN_ARC_P2_END - RUN_ARC_P1_END));
  }
  if (elapsed < RUN_ARC_P3_END) {
    return lerp(0.7, 0.95, (elapsed - RUN_ARC_P2_END) / (RUN_ARC_P3_END - RUN_ARC_P2_END));
  }
  return 1.0;
}

export function getRunArcEnemyCap(elapsed: number, options: { hasMegaBoss: boolean; legacyBossPhase: boolean }): number {
  const p = getRunArcRegionPhase(elapsed);
  if (options.legacyBossPhase && p < 4) return 0;
  if (p === 1) return 8;
  if (p === 2) return 18;
  if (p === 3) return 35;
  return 20 + (options.hasMegaBoss ? 1 : 0);
}

export function getEliteSpawnChance(elapsed: number): number {
  const p = getRunArcRegionPhase(elapsed);
  if (p < 2) return 0;
  if (p === 2) return 0.2;
  if (p === 3) return 0.4;
  return 0.35;
}
