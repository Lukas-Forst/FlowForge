import { describe, expect, it } from "vitest";
import { runAutoAttack } from "./autoAttack";
import type { EnemyState, PlayerState, ProjectileState, VisualEffect } from "../types";

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function createEnemy(): EnemyState {
  return {
    id: 1,
    type: "corsair",
    isElite: false,
    position: { x: 10, y: 0 },
    facing: 0,
    hp: 30,
    maxHp: 30,
    speed: 2,
    touchDamage: 2,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}

describe("runAutoAttack", () => {
  it("fires one forward projectile by default", () => {
    const projectiles: ProjectileState[] = [];
    const visualEffects: VisualEffect[] = [];
    runAutoAttack(
      [createEnemy()],
      createPlayer(),
      { value: 1 },
      { value: 0 },
      1,
      projectiles,
      visualEffects,
      { value: 1 },
      0.016,
      false,
      0,
    );
    expect(projectiles).toHaveLength(1);
    expect(projectiles[0].velocity.y).toBeGreaterThan(0);
  });

  it("adds rear-firing auto-shot when Stern Chaser is stacked", () => {
    const projectiles: ProjectileState[] = [];
    const visualEffects: VisualEffect[] = [];
    runAutoAttack(
      [createEnemy()],
      createPlayer(),
      { value: 1 },
      { value: 0 },
      1,
      projectiles,
      visualEffects,
      { value: 1 },
      0.016,
      false,
      0,
      0,
      1,
    );
    expect(projectiles).toHaveLength(2);
    const rearShot = projectiles.find((projectile) => projectile.velocity.y < 0);
    expect(rearShot).toBeDefined();
  });

  it("adds extra forward shots when projectileCount is stacked", () => {
    const projectiles: ProjectileState[] = [];
    const visualEffects: VisualEffect[] = [];
    runAutoAttack(
      [createEnemy()],
      createPlayer(),
      { value: 1 },
      { value: 0 },
      1,
      projectiles,
      visualEffects,
      { value: 1 },
      0.016,
      false,
      2,
      0,
    );
    expect(projectiles).toHaveLength(3);
    expect(projectiles.every((projectile) => projectile.velocity.y > 0)).toBe(true);
  });

  it("applies pierce stacks onto spawned auto-shots", () => {
    const projectiles: ProjectileState[] = [];
    const visualEffects: VisualEffect[] = [];
    runAutoAttack(
      [createEnemy()],
      createPlayer(),
      { value: 1 },
      { value: 0 },
      1,
      projectiles,
      visualEffects,
      { value: 1 },
      0.016,
      false,
      1,
      2,
      0,
    );
    expect(projectiles).toHaveLength(2);
    expect(projectiles.every((projectile) => projectile.pierceRemaining === 2)).toBe(true);
  });
});
