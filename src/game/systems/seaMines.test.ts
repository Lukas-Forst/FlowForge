import { describe, expect, it } from "vitest";
import { spawnSeaMinesBehindPlayer, updateSeaMines } from "./seaMines";
import type { EnemyState, MineState, PlayerState, VisualEffect } from "../types";

function makePlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function makeEnemy(id: number, x: number, y: number): EnemyState {
  return {
    id,
    type: "corsair",
    isElite: false,
    position: { x, y },
    facing: 0,
    hp: 60,
    maxHp: 60,
    speed: 3,
    touchDamage: 8,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}

describe("spawnSeaMinesBehindPlayer", () => {
  it("spawns three mines behind the ship", () => {
    const mines: MineState[] = [];
    spawnSeaMinesBehindPlayer(mines, makePlayer(), { value: 1 }, 1);
    expect(mines).toHaveLength(3);
    expect(mines.every((mine) => mine.position.x < 0)).toBe(true);
  });
});

describe("updateSeaMines", () => {
  it("does not explode before arming completes", () => {
    const mines: MineState[] = [
      {
        id: 1,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        armingRemaining: 0.4,
        lifetimeRemaining: 8,
        radius: 3.2,
        damage: 70,
      },
    ];
    const enemies: EnemyState[] = [makeEnemy(1, 0, 0)];
    const visualEffects: VisualEffect[] = [];

    const result = updateSeaMines(mines, enemies, visualEffects, { value: 1 }, 0.1);
    expect(result.enemyKills).toBe(0);
    expect(mines).toHaveLength(1);
    expect(enemies[0]?.hp).toBe(60);
  });

  it("explodes on contact after arming and damages enemies in aoe", () => {
    const mines: MineState[] = [
      {
        id: 1,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        armingRemaining: 0,
        lifetimeRemaining: 8,
        radius: 3.2,
        damage: 70,
      },
    ];
    const enemies: EnemyState[] = [makeEnemy(1, 0, 0), makeEnemy(2, 2, 0), makeEnemy(3, 5, 0)];
    const visualEffects: VisualEffect[] = [];

    const result = updateSeaMines(mines, enemies, visualEffects, { value: 1 }, 0.1);
    expect(result.enemyKills).toBe(2);
    expect(mines).toHaveLength(0);
    expect(enemies).toHaveLength(1);
    expect(visualEffects.some((vfx) => vfx.kind === "hitBurst")).toBe(true);
  });
});
