import { describe, expect, it } from "vitest";
import { resolveCollisions } from "./collision";
import type { EnemyState, HarvestableState, PlayerState, ProjectileState, VisualEffect } from "../types";

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function createEnemy(id: number): EnemyState {
  return {
    id,
    type: "corsair",
    isElite: false,
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 10,
    maxHp: 10,
    speed: 2,
    touchDamage: 2,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}

describe("resolveCollisions", () => {
  it("keeps projectile alive for next hit when pierce remains", () => {
    const player = createPlayer();
    const enemies: EnemyState[] = [createEnemy(1)];
    const harvestables: HarvestableState[] = [];
    const projectiles: ProjectileState[] = [
      {
        id: 1,
        kind: "playerAuto",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        ttl: 1,
        damage: 15,
        radius: 0.5,
        pierceRemaining: 1,
      },
    ];
    const visualEffects: VisualEffect[] = [];

    resolveCollisions(player, enemies, harvestables, projectiles, { value: 1 }, visualEffects, { value: 1 });

    expect(projectiles).toHaveLength(1);
    expect(projectiles[0].pierceRemaining).toBe(0);
  });

  it("consumes projectile once pierce is exhausted", () => {
    const player = createPlayer();
    const enemies: EnemyState[] = [createEnemy(1)];
    const harvestables: HarvestableState[] = [];
    const projectiles: ProjectileState[] = [
      {
        id: 1,
        kind: "playerAuto",
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        ttl: 1,
        damage: 15,
        radius: 0.5,
        pierceRemaining: 0,
      },
    ];
    const visualEffects: VisualEffect[] = [];

    resolveCollisions(player, enemies, harvestables, projectiles, { value: 1 }, visualEffects, { value: 1 });

    expect(projectiles).toHaveLength(0);
  });
});
