import { angleFromDirection, normalize } from "../utils";
import type { InputState, PlayerState } from "../types";

const FACING_SMOOTHING = 13;

function angleDelta(target: number, current: number): number {
  const value = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return value;
}

export function updatePlayerMovement(
  player: PlayerState,
  input: InputState,
  delta: number,
  speedMultiplier: number,
): void {
  const movement = normalize({
    x: (input.d ? 1 : 0) - (input.a ? 1 : 0),
    // addons.md: invert W/S so forward/back behave intuitively.
    y: (input.s ? 1 : 0) - (input.w ? 1 : 0),
  });

  if (movement.x !== 0 || movement.y !== 0) {
    const speed = player.baseSpeed * speedMultiplier;
    const nextPosition = {
      x: player.position.x + movement.x * speed * delta,
      y: player.position.y + movement.y * speed * delta,
    };
    player.position = nextPosition;

    const targetFacing = angleFromDirection(movement);
    const adjustment = angleDelta(targetFacing, player.facing) * Math.min(1, delta * FACING_SMOOTHING);
    player.facing += adjustment;
  }
}
