import {
  AUTO_ATTACK_SPEED,
  BASE_AUTO_ATTACK_DAMAGE,
  BASE_AUTO_ATTACK_INTERVAL,
} from "../constants";
import { normalize } from "../utils";
import type { EnemyState, PlayerState, ProjectileState } from "../types";
import { directionFromAngle } from "../utils";

export function runAutoAttack(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: { value: number },
  intervalTimerRef: { value: number },
  fireRateMultiplier: number,
  projectiles: ProjectileState[],
  delta: number,
): void {
  intervalTimerRef.value -= delta;
  if (intervalTimerRef.value > 0 || enemies.length === 0) {
    return;
  }

  const interval = BASE_AUTO_ATTACK_INTERVAL / fireRateMultiplier;
  intervalTimerRef.value += interval;

  // Facing-based base attack (predictable, consistent with cannon/broadside rules).
  const direction = normalize(directionFromAngle(player.facing));
  const forwardOffset = 0.95;

  projectiles.push({
    id: projectileIdRef.value++,
    kind: "playerAuto",
    position: {
      x: player.position.x + direction.x * forwardOffset,
      y: player.position.y + direction.y * forwardOffset,
    },
    velocity: { x: direction.x * AUTO_ATTACK_SPEED, y: direction.y * AUTO_ATTACK_SPEED },
    ttl: 2.2,
    damage: BASE_AUTO_ATTACK_DAMAGE,
    radius: 0.4,
  });
}
