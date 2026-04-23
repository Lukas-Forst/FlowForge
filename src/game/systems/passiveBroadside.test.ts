import { describe, expect, it } from "vitest";
import type { PlayerState, ProjectileState, UpgradeStats, VisualEffect } from "../types";
import { getPassiveBroadsideInterval, runPassiveBroadside } from "./passiveBroadside";

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function createUpgrades(): UpgradeStats {
  return {
    level: 0,
    fireRateMult: 1,
    speedMult: 1,
    cooldownMult: 1,
    nextThreshold: 10,
    stacks: {} as UpgradeStats["stacks"],
  };
}

describe("getPassiveBroadsideInterval", () => {
  it("starts at 4 seconds", () => {
    expect(getPassiveBroadsideInterval(createUpgrades())).toBe(4);
  });

  it("gets faster with cooldown and side-gun upgrades", () => {
    const upgrades = createUpgrades();
    upgrades.cooldownMult = 0.82;
    upgrades.stacks.sideGuns = 2;
    expect(getPassiveBroadsideInterval(upgrades)).toBeCloseTo(2.3, 1);
  });
});

describe("runPassiveBroadside", () => {
  it("fires one shot per side at baseline", () => {
    const projectiles: ProjectileState[] = [];
    const effects: VisualEffect[] = [];
    const timer = { value: 0 };
    runPassiveBroadside(
      createPlayer(),
      createUpgrades(),
      timer,
      { value: 1 },
      projectiles,
      effects,
      { value: 1 },
      0.016,
    );
    expect(projectiles).toHaveLength(2);
  });

  it("fires extra side shots when broadside upgrade is stacked", () => {
    const projectiles: ProjectileState[] = [];
    const effects: VisualEffect[] = [];
    const timer = { value: 0 };
    const upgrades = createUpgrades();
    upgrades.stacks.sideGuns = 2;

    runPassiveBroadside(
      createPlayer(),
      upgrades,
      timer,
      { value: 1 },
      projectiles,
      effects,
      { value: 1 },
      0.016,
    );
    expect(projectiles).toHaveLength(6);
  });
});
