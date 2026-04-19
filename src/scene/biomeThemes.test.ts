import { describe, expect, it } from "vitest";
import { BIOME_THEMES } from "./biomeThemes";
import type { BiomeType } from "../game/types";

const ALL_BIOMES: BiomeType[] = ["open_sea", "island_chain", "deep_waters"];
const HEX = /^#[0-9a-fA-F]{6}$/;

describe("BIOME_THEMES", () => {
  it("has an entry for every biome", () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_THEMES[biome]).toBeDefined();
    }
  });

  it("uses #RRGGBB hex strings for all colour fields", () => {
    for (const biome of ALL_BIOMES) {
      const t = BIOME_THEMES[biome];
      expect(t.waterColor).toMatch(HEX);
      expect(t.waterEmissive).toMatch(HEX);
      expect(t.shimmerColor).toMatch(HEX);
      expect(t.backgroundColor).toMatch(HEX);
      expect(t.ambient.color).toMatch(HEX);
      expect(t.directional.color).toMatch(HEX);
      expect(t.rim.color).toMatch(HEX);
      expect(t.fog.color).toMatch(HEX);
    }
  });

  it("uses sensible numeric ranges", () => {
    for (const biome of ALL_BIOMES) {
      const t = BIOME_THEMES[biome];
      expect(t.waterRoughness).toBeGreaterThanOrEqual(0);
      expect(t.waterRoughness).toBeLessThanOrEqual(1);
      expect(t.waterClearcoat).toBeGreaterThanOrEqual(0);
      expect(t.waterClearcoat).toBeLessThanOrEqual(1);
      expect(t.bumpScale).toBeGreaterThanOrEqual(0);
      expect(t.shimmerOpacity).toBeGreaterThanOrEqual(0);
      expect(t.shimmerOpacity).toBeLessThanOrEqual(1);
      expect(t.waterEmissiveIntensity).toBeGreaterThanOrEqual(0.05);
      expect(t.waterEmissiveIntensity).toBeLessThanOrEqual(0.3);
      expect(t.waveHeight).toBeGreaterThan(0);
      expect(t.waveSpeed).toBeGreaterThan(0);
      expect(t.ambient.intensity).toBeGreaterThanOrEqual(0);
      expect(t.directional.intensity).toBeGreaterThanOrEqual(0);
      expect(t.rim.intensity).toBeGreaterThanOrEqual(0);
      expect(t.fog.near).toBeGreaterThan(0);
      expect(t.fog.far).toBeGreaterThan(t.fog.near);
    }
  });
});
