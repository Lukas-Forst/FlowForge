import { beforeEach, describe, expect, it } from "vitest";
import { MANIFEST } from "./manifest";
import { __resetRegistryForTests, assetsByTier, getProgress, markLoaded } from "./registry";

describe("manifest", () => {
  it("has every asset tagged with a tier", () => {
    for (const [id, entry] of Object.entries(MANIFEST)) {
      expect(["critical", "biome", "deferred"]).toContain(entry.tier);
      expect(entry.path).toMatch(/^\/assets\//);
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("has at least one critical asset", () => {
    const critical = Object.values(MANIFEST).filter((a) => a.tier === "critical");
    expect(critical.length).toBeGreaterThan(0);
  });
});

describe("registry tier filtering", () => {
  beforeEach(() => __resetRegistryForTests());

  it("assetsByTier returns only matching-tier entries", () => {
    const critical = assetsByTier("critical");
    const biome = assetsByTier("biome");
    expect(critical.every((e) => e.tier === "critical")).toBe(true);
    expect(biome.every((e) => e.tier === "biome")).toBe(true);
  });
});

describe("registry progress", () => {
  beforeEach(() => __resetRegistryForTests());

  it("reports 0 before any loads in a tier", () => {
    expect(getProgress("critical")).toBe(0);
  });

  it("reports 1 when all assets in a tier are marked loaded", () => {
    const ids = assetsByTier("critical").map((e) => e.id);
    for (const id of ids) markLoaded(id);
    expect(getProgress("critical")).toBe(1);
  });

  it("reports proportional progress for partial loads", () => {
    const ids = assetsByTier("critical").map((e) => e.id);
    if (ids.length < 2) return;
    markLoaded(ids[0]);
    expect(getProgress("critical")).toBeCloseTo(1 / ids.length, 3);
  });
});
