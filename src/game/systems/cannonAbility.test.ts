import { describe, expect, it } from "vitest";
import { tryFireCannon } from "./cannonAbility";
import type { Cooldowns, PlayerState, ProjectileState, VisualEffect } from "../types";

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 9,
  };
}

function createCooldowns(): Cooldowns {
  return {
    cannonRemaining: 0,
    cannonDuration: 5,
    boostRemaining: 0,
    boostDuration: 4.5,
<<<<<<< HEAD
    extraRemaining: 0,
    extraDuration: 0,
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
    boostActiveRemaining: 0,
    boostActiveDuration: 0.22,
    invulnRemaining: 0,
    frenzyRemaining: 0,
  };
}

describe("tryFireCannon", () => {
  it("fires base broadside count", () => {
    const projectiles: ProjectileState[] = [];
    const vfx: VisualEffect[] = [];
    const fired = tryFireCannon(
      createPlayer(),
      createCooldowns(),
      { value: 1 },
      1,
      projectiles,
      vfx,
      { value: 1 },
      0,
    );
    expect(fired).toBe(true);
    expect(projectiles).toHaveLength(5);
  });

  it("adds cannon projectiles with cannonSpread stacks", () => {
    const projectiles: ProjectileState[] = [];
    const vfx: VisualEffect[] = [];
    const fired = tryFireCannon(
      createPlayer(),
      createCooldowns(),
      { value: 1 },
      1,
      projectiles,
      vfx,
      { value: 1 },
      2,
    );
    expect(fired).toBe(true);
    expect(projectiles).toHaveLength(9);
  });
});
