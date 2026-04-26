import { describe, expect, it } from "vitest";
import type { AudioEvent, UpgradeStats, VisualEffect } from "../types";
import {
  applyDamageMitigation,
  applyEliteExtraAbilitySelection,
  buildEliteExtraAbilityChoices,
  buildUpgradeChoices,
  emitLevelUpEvents,
  retargetNextUpgradeThreshold,
} from "./upgrades";
import { UPGRADE_OPTIONS } from "../constants";

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

describe("applyDamageMitigation", () => {
  it("reduces incoming damage by 15% per armor stack", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: { armor: 2 } as UpgradeStats["stacks"],
    };
    expect(applyDamageMitigation(100, upgrades)).toBeCloseTo(70);
  });
});

describe("buildUpgradeChoices", () => {
  it("samples every base rarity tier over repeated rolls", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {} as UpgradeStats["stacks"],
    };

    const seen = new Set<"common" | "uncommon" | "rare" | "epic">();

    for (let i = 0; i < 200; i += 1) {
      const choices = buildUpgradeChoices(upgrades);
      for (const option of choices) {
        seen.add(option.rarity);
      }
    }
    expect(seen.has("common")).toBe(true);
    expect(seen.has("uncommon")).toBe(true);
    expect(seen.has("rare")).toBe(true);
    expect(seen.has("epic")).toBe(false);
  });

  it("offers fullSteam once its prereqs are maxed and others are exhausted", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {} as UpgradeStats["stacks"],
    };

    for (const key of Object.keys(UPGRADE_OPTIONS) as (keyof typeof UPGRADE_OPTIONS)[]) {
      upgrades.stacks[key] = UPGRADE_OPTIONS[key].maxStacks;
    }
    upgrades.stacks.fullSteam = 0;

    const choices = buildUpgradeChoices(upgrades);
    const choiceTypes = choices.map((choice) => choice.type);
    expect(choiceTypes).toContain("fullSteam");
  });

  it("offers phantomFleet when max afterburner and ghost tide are active", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {} as UpgradeStats["stacks"],
    };
    upgrades.stacks.afterburner = UPGRADE_OPTIONS.afterburner.maxStacks;
    upgrades.stacks.ghostTide = 1;
    upgrades.stacks.fireRate = UPGRADE_OPTIONS.fireRate.maxStacks;
    upgrades.stacks.pierce = UPGRADE_OPTIONS.pierce.maxStacks;
    upgrades.stacks.fullSteam = 1;
    for (const key of Object.keys(UPGRADE_OPTIONS) as (keyof typeof UPGRADE_OPTIONS)[]) {
      if (key === "phantomFleet" || key === "krakenCall") continue;
      upgrades.stacks[key] = UPGRADE_OPTIONS[key].maxStacks;
    }
    upgrades.stacks.phantomFleet = 0;
    upgrades.stacks.krakenCall = 0;

    const choices = buildUpgradeChoices(upgrades);
    const choiceTypes = choices.map((choice) => choice.type);
    expect(choiceTypes).toContain("phantomFleet");
  });
});

describe("elite extra ability rewards", () => {
  it("returns unowned E-ability cards first", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: { extraTorpedo: 1 } as UpgradeStats["stacks"],
      activeCannonAbility: "cannon",
      activeBoostAbility: "boost",
      activeExtraAbility: "torpedo",
    };
    const choices = buildEliteExtraAbilityChoices(upgrades);
    const choiceTypes = choices.map((choice) => choice.type);
    expect(choiceTypes).toContain("extraDepthCharge");
    expect(choiceTypes).toContain("extraOilSlick");
    expect(choiceTypes).not.toContain("extraTorpedo");
  });

  it("falls back to all E-ability cards if all are owned", () => {
    const upgrades: UpgradeStats = {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {
        extraTorpedo: 1,
        extraDepthCharge: 1,
        extraOilSlick: 1,
      } as UpgradeStats["stacks"],
      activeCannonAbility: "cannon",
      activeBoostAbility: "boost",
      activeExtraAbility: "oilSlick",
    };
    const choices = buildEliteExtraAbilityChoices(upgrades);
    expect(choices).toHaveLength(3);
  });

  it("equips the chosen E ability without affecting level", () => {
    const upgrades: UpgradeStats = {
      level: 5,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 40,
      stacks: {} as UpgradeStats["stacks"],
      activeCannonAbility: "cannon",
      activeBoostAbility: "boost",
      activeExtraAbility: null,
    };
    applyEliteExtraAbilitySelection(upgrades, "extraDepthCharge");
    expect(upgrades.activeExtraAbility).toBe("depthCharge");
    expect(upgrades.stacks.extraDepthCharge).toBe(1);
    expect(upgrades.level).toBe(5);
  });
});
