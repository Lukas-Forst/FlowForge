// biome.ts
import { hash2 } from "../utils";
import type { BiomeType } from "../types";

export type { BiomeType };

/**
 * Returns a stable biome for a given world coordinate.
 * Resolves into large ~80-unit patches.
 */
export function biomeAt(x: number, y: number): BiomeType {
  const chunkSize = 80;
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);

  const hash = hash2(cx, cy);

  if (hash < 0.25) {
    return "island_chain";
  } else if (hash > 0.85) {
    return "fog_bank";
  }
  
  return "open_sea";
}

/**
 * Returns true if a given sub-coordinate within a generic island chain biome 
 * should *actually* spawn an island (for scattering).
 */
export function isIslandAt(x: number, y: number): boolean {
  if (biomeAt(x, y) !== "island_chain") {
    return false;
  }
  const chunkX = Math.floor(x / 8);
  const chunkY = Math.floor(y / 8);
  
  const hash = hash2(chunkX, chunkY);
  return hash < 0.3; // 30% of sub-chunks generate an island prop
}
