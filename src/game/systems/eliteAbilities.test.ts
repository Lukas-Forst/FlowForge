import { describe, expect, it } from "vitest";
import { runEliteAbilities } from "./eliteAbilities";
import type { DelayedAoEState, EnemyState, PlayerState, ProjectileState, VisualEffect } from "../types";

function makePlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function makeElite(type: "corsair" | "brute"): EnemyState {
  return {
    id: 1,
    type,
    isElite: true,
    position: { x: 2, y: 0 },
    facing: 0,
    hp: 120,
    maxHp: 120,
    speed: 4,
    touchDamage: 8,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}
function makeEliteAny(type: EnemyState["type"]): EnemyState {
  return {
    id: 2,
    type,
    isElite: true,
    position: { x: 6, y: 0 },
    facing: 0,
    hp: 120,
    maxHp: 120,
    speed: 4,
    touchDamage: 8,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}

describe("runEliteAbilities", () => {
  it("fires elite corsair triple shot", () => {
    const enemies: EnemyState[] = [makeElite("corsair")];
    const projectiles: ProjectileState[] = [];
    const delayedAoEs: DelayedAoEState[] = [];
    const visualEffects: VisualEffect[] = [];
    runEliteAbilities(
      enemies,
      makePlayer(),
      { value: 1 },
      projectiles,
      delayedAoEs,
      { value: 1 },
      visualEffects,
      { value: 1 },
      0.1,
    );
    expect(projectiles).toHaveLength(3);
    expect(projectiles.every((p) => p.kind === "enemyCorsair")).toBe(true);
  });

  it("spawns elite brute shockwave delayed aoe in close range", () => {
    const enemies: EnemyState[] = [makeElite("brute")];
    const projectiles: ProjectileState[] = [];
    const delayedAoEs: DelayedAoEState[] = [];
    const visualEffects: VisualEffect[] = [];
    runEliteAbilities(
      enemies,
      makePlayer(),
      { value: 1 },
      projectiles,
      delayedAoEs,
      { value: 1 },
      visualEffects,
      { value: 1 },
      0.1,
    );
    expect(delayedAoEs).toHaveLength(1);
    expect(delayedAoEs[0]?.source).toBe("enemy");
    expect(delayedAoEs[0]?.visualType).toBe("shockwave");
  });

  it("drops enemy mines for elite bomber", () => {
    const enemies: EnemyState[] = [makeEliteAny("bomber")];
    enemies[0].position = { x: 4, y: 1 };
    const projectiles: ProjectileState[] = [];
    const delayedAoEs: DelayedAoEState[] = [];
    const visualEffects: VisualEffect[] = [];
    runEliteAbilities(
      enemies,
      makePlayer(),
      { value: 1 },
      projectiles,
      delayedAoEs,
      { value: 1 },
      visualEffects,
      { value: 1 },
      0.1,
    );
    expect(delayedAoEs).toHaveLength(1);
    expect(delayedAoEs[0]?.source).toBe("enemy");
  });

  it("fires charged shot for elite sniper", () => {
    const enemies: EnemyState[] = [makeEliteAny("sniper")];
    const projectiles: ProjectileState[] = [];
    const delayedAoEs: DelayedAoEState[] = [];
    const visualEffects: VisualEffect[] = [];
    runEliteAbilities(
      enemies,
      makePlayer(),
      { value: 1 },
      projectiles,
      delayedAoEs,
      { value: 1 },
      visualEffects,
      { value: 1 },
      0.1,
    );
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0]?.kind).toBe("enemySniper");
  });

  it("does not fire elite sniper shot before cooldown expires", () => {
    const enemies: EnemyState[] = [makeEliteAny("sniper")];
    enemies[0].rangedCooldown = 1.5;
    const projectiles: ProjectileState[] = [];
    const delayedAoEs: DelayedAoEState[] = [];
    const visualEffects: VisualEffect[] = [];

    runEliteAbilities(
      enemies,
      makePlayer(),
      { value: 1 },
      projectiles,
      delayedAoEs,
      { value: 1 },
      visualEffects,
      { value: 1 },
      0.1,
    );

    expect(projectiles).toHaveLength(0);
    expect(enemies[0]?.rangedCooldown).toBeCloseTo(1.4, 5);
  });
});
