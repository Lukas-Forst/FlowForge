import { describe, expect, it } from "vitest";
import { pickRunBiome } from "./biome";
import type { BiomeType } from "../types";

describe("pickRunBiome", () => {
  it("returns one of the three valid biome ids", () => {
    const valid: BiomeType[] = ["open_sea", "island_chain", "deep_waters"];
    for (let i = 0; i < 50; i += 1) {
      expect(valid).toContain(pickRunBiome());
    }
  });

  it("distributes roughly uniformly over many samples", () => {
    const counts: Record<BiomeType, number> = {
      open_sea: 0,
      island_chain: 0,
      deep_waters: 0,
      boss_storm: 0,
    };
    const N = 30_000;
    for (let i = 0; i < N; i += 1) {
      counts[pickRunBiome()] += 1;
    }
    // Each bucket should be within ±15% of N/3 (loose bound — Math.random is uniform enough).
    const expected = N / 3;
    const tolerance = expected * 0.15;
    expect(counts.open_sea).toBeGreaterThan(expected - tolerance);
    expect(counts.open_sea).toBeLessThan(expected + tolerance);
    expect(counts.island_chain).toBeGreaterThan(expected - tolerance);
    expect(counts.island_chain).toBeLessThan(expected + tolerance);
    expect(counts.deep_waters).toBeGreaterThan(expected - tolerance);
    expect(counts.deep_waters).toBeLessThan(expected + tolerance);
    expect(counts.boss_storm).toBe(0);
  });
});
