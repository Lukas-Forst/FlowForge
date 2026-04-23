import { describe, expect, it } from "vitest";
import { updatePlayerMovement } from "./playerController";
import type { InputState, PlayerState } from "../types";

function createPlayer(): PlayerState {
  return {
    position: { x: 0, y: 0 },
    facing: 0,
    hp: 100,
    maxHp: 100,
    baseSpeed: 10,
  };
}

function createInputState(input: Partial<InputState>): InputState {
  return {
    w: false,
    a: false,
    s: false,
    d: false,
    ...input,
  };
}

describe("updatePlayerMovement", () => {
  it("moves W along camera-forward diagonal with ship-like inertia bias", () => {
    const player = createPlayer();

    updatePlayerMovement(player, createInputState({ w: true }), 0.1, 1);

    expect(player.position.x).toBeLessThan(0);
    expect(player.position.y).toBeLessThan(0);
    expect(Math.abs(player.position.x)).toBeGreaterThan(0.2);
    expect(Math.abs(player.position.y)).toBeGreaterThan(0.2);
  });

  it("keeps some forward glide while steering sideways", () => {
    const player = createPlayer();
    player.facing = 0;

    updatePlayerMovement(player, createInputState({ d: true }), 0.1, 1);

    expect(player.position.x).toBeGreaterThan(0);
    expect(player.position.y).toBeGreaterThan(-0.5);
  });
});
