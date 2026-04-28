import { describe, expect, it } from "vitest";
import { processPickups } from "./pickups";
import type { Cooldowns, PickupState, PlayerState } from "../types";

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

describe("processPickups", () => {
  it("collects nearby coin with default pickup radius", () => {
    const pickups: PickupState[] = [
      { id: 1, kind: "coin", position: { x: 1.0, y: 0 }, value: 1 },
    ];
    const result = processPickups(pickups, createPlayer(), createCooldowns(), undefined, undefined, 0);
    expect(result.coinsGained).toBe(1);
    expect(pickups).toHaveLength(0);
  });

  it("collects farther coin when coinMagnet stacks are active", () => {
    const pickups: PickupState[] = [
      { id: 1, kind: "coin", position: { x: 2.5, y: 0 }, value: 1 },
    ];
    const result = processPickups(pickups, createPlayer(), createCooldowns(), undefined, undefined, 2);
    expect(result.coinsGained).toBe(1);
    expect(pickups).toHaveLength(0);
  });
});
