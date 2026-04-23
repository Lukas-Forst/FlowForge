import { angleFromDirection, directionFromAngle, normalize } from "../utils";
import type { InputState, PlayerState } from "../types";

const FACING_SMOOTHING = 6.5;
const FORWARD_DRIVE = 0.9;
const REVERSE_DRIVE = 0.52;
const LATERAL_DRIFT = 0.42;

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
  const strafe = (input.d ? 1 : 0) - (input.a ? 1 : 0);
  const forward = (input.w ? 1 : 0) - (input.s ? 1 : 0);
  const movement = normalize({
    // Camera sits on +X/+Z and looks toward origin, so screen-forward maps to (-X, -Y).
    x: strafe - forward,
    y: -(strafe + forward),
  });

  if (movement.x !== 0 || movement.y !== 0) {
    const targetFacing = angleFromDirection(movement);
    const adjustment = angleDelta(targetFacing, player.facing) * Math.min(1, delta * FACING_SMOOTHING);
    player.facing += adjustment;

    // Ship-like handling: mostly moves in current bow direction, with limited lateral slide.
    const bowDirection = directionFromAngle(player.facing);
    const forwardIntent = movement.x * bowDirection.x + movement.y * bowDirection.y;
    const lateral = {
      x: movement.x - bowDirection.x * forwardIntent,
      y: movement.y - bowDirection.y * forwardIntent,
    };
    const drive = normalize({
      x:
        bowDirection.x * forwardIntent * (forwardIntent >= 0 ? FORWARD_DRIVE : REVERSE_DRIVE) +
        lateral.x * LATERAL_DRIFT,
      y:
        bowDirection.y * forwardIntent * (forwardIntent >= 0 ? FORWARD_DRIVE : REVERSE_DRIVE) +
        lateral.y * LATERAL_DRIFT,
    });
    const movementDirection = drive.x === 0 && drive.y === 0 ? movement : drive;
    const speed = player.baseSpeed * speedMultiplier;
    const nextPosition = {
      x: player.position.x + movementDirection.x * speed * delta,
      y: player.position.y + movementDirection.y * speed * delta,
    };
    player.position = nextPosition;
  }
}
