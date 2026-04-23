import { describe, expect, it } from "vitest";
import type { AudioEvent, UpgradeStats, VisualEffect } from "../types";
import { emitLevelUpEvents, retargetNextUpgradeThreshold } from "./upgrades";

describe("emitLevelUpEvents", () => {
  it("pushes an upgrade_sting audio event", () => {
    const audio: AudioEvent[] = [];
    const vfx: VisualEffect[] = [];
    const idRef = { value: 1 };
    emitLevelUpEvents({ x: 1, y: 2 }, audio, vfx, idRef);
    expect(audio).toHaveLength(1);
    expect(audio[0].sfx).toBe("upgrade_sting");
  });

  it("returns a chromaticAb postFxPulse", () => {
    const pulse = emitLevelUpEvents({ x: 0, y: 0 }, [], [], { value: 1 });
    expect(pulse.effect).toBe("chromaticAb");
    expect(pulse.remaining).toBeCloseTo(0.2, 3);
  });

  it("pushes screen-shake and hit-burst visual effects", () => {
    const vfx: VisualEffect[] = [];
    emitLevelUpEvents({ x: 4, y: 5 }, [], vfx, { value: 1 });
    const kinds = vfx.map((e) => e.kind).sort();
    expect(kinds).toContain("screenShake");
    expect(kinds).toContain("hitBurst");
  });
});

describe("retargetNextUpgradeThreshold", () => {
  it("moves threshold above current collected coins", () => {
    const upgrades: UpgradeStats = {
      level: 3,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 12,
      stacks: {} as UpgradeStats["stacks"],
    };
    retargetNextUpgradeThreshold(upgrades, 40);
    expect(upgrades.nextThreshold).toBe(47);
  });

  it("does not lower an already-higher threshold", () => {
    const upgrades: UpgradeStats = {
      level: 2,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 90,
      stacks: {} as UpgradeStats["stacks"],
    };
    retargetNextUpgradeThreshold(upgrades, 10);
    expect(upgrades.nextThreshold).toBe(90);
  });
});
