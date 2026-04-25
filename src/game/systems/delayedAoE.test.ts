import { describe, expect, it } from "vitest";
import { updateDelayedAoEs } from "./delayedAoE";
import type { DelayedAoEState, EnemyState, PlayerState, VisualEffect } from "../types";

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
    hp: 50,
    maxHp: 50,
    speed: 3,
    touchDamage: 8,
    touchTimer: 0,
    rangedCooldown: 0,
  };
}

describe("updateDelayedAoEs", () => {
  it("shows telegraph ring while aoe is pending", () => {
    const delayedAoEs: DelayedAoEState[] = [
      {
        id: 1,
        position: { x: 3, y: 2 },
        remaining: 1,
        radius: 2.5,
        damage: 30,
        source: "player",
      },
    ];
    const enemies: EnemyState[] = [makeEnemy(1, 3, 2)];
    const player = makePlayer();
    const visualEffects: VisualEffect[] = [];
    const effectIdRef = { value: 1 };

    const result = updateDelayedAoEs(delayedAoEs, enemies, player, visualEffects, effectIdRef, 0.2);
    expect(result.enemyKills).toBe(0);
    expect(delayedAoEs).toHaveLength(1);
    expect(visualEffects.some((vfx) => vfx.kind === "telegraphRing")).toBe(true);
  });

  it("damages enemies and resolves aoe on expiry", () => {
    const delayedAoEs: DelayedAoEState[] = [
      {
        id: 1,
        position: { x: 0, y: 0 },
        remaining: 0.05,
        radius: 3,
        damage: 40,
        source: "player",
      },
    ];
    const enemies: EnemyState[] = [makeEnemy(1, 0, 0), makeEnemy(2, 10, 0)];
    const player = makePlayer();
    const visualEffects: VisualEffect[] = [];
    const effectIdRef = { value: 1 };

    const result = updateDelayedAoEs(delayedAoEs, enemies, player, visualEffects, effectIdRef, 0.1);
    expect(result.enemyKills).toBe(0);
    expect(enemies[0]?.hp).toBe(10);
    expect(enemies[1]?.hp).toBe(50);
    expect(delayedAoEs).toHaveLength(0);
    expect(visualEffects.some((vfx) => vfx.kind === "hitBurst")).toBe(true);
    expect(visualEffects.some((vfx) => vfx.kind === "screenShake")).toBe(true);
  });

  it("damages player when enemy aoe resolves nearby", () => {
    const delayedAoEs: DelayedAoEState[] = [
      {
        id: 1,
        position: { x: 0, y: 0 },
        remaining: 0.01,
        radius: 4,
        damage: 25,
        source: "enemy",
      },
    ];
    const enemies: EnemyState[] = [];
    const player = makePlayer();
    const visualEffects: VisualEffect[] = [];
    const effectIdRef = { value: 1 };

    updateDelayedAoEs(delayedAoEs, enemies, player, visualEffects, effectIdRef, 0.1);
    expect(player.hp).toBe(75);
    expect(delayedAoEs).toHaveLength(0);
  });
});
