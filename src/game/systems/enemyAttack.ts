import {
  ENEMY_BOMBER_RANGED_COOLDOWN,
  ENEMY_BOMBER_RANGED_RANGE,
  ENEMY_PROJECTILE_DAMAGE,
  ENEMY_PROJECTILE_SPEED,
} from "../constants";
import { angleFromDirection, distance, normalize } from "../utils";
import type { EnemyState, PlayerState, ProjectileState } from "../types";

function tryEnemyBomberShot(
  enemy: EnemyState,
  player: PlayerState,
  enemyProjectiles: ProjectileState[],
  enemyProjectileIdRef: { value: number },
): void {
  const dist = distance(enemy.position, player.position);
  if (dist > ENEMY_BOMBER_RANGED_RANGE) return;
  if (enemy.rangedCooldownRemaining > 0) return;

  const direction = normalize({
    x: player.position.x - enemy.position.x,
    y: player.position.y - enemy.position.y,
  });
  const angle = angleFromDirection(direction);
  const dir = normalize({ x: Math.sin(angle), y: Math.cos(angle) });

  enemyProjectiles.push({
    id: enemyProjectileIdRef.value++,
    position: { ...enemy.position },
    velocity: { x: dir.x * ENEMY_PROJECTILE_SPEED, y: dir.y * ENEMY_PROJECTILE_SPEED },
    ttl: 2.6,
    damage: ENEMY_PROJECTILE_DAMAGE,
    radius: 0.35,
  });

  enemy.rangedCooldownRemaining = ENEMY_BOMBER_RANGED_COOLDOWN;
}

export function runEnemyAttack(
  enemies: EnemyState[],
  player: PlayerState,
  enemyProjectileIdRef: { value: number },
  delta: number,
  enemyProjectiles: ProjectileState[],
): void {
  for (const enemy of enemies) {
    if (enemy.rangedCooldownRemaining > 0) {
      enemy.rangedCooldownRemaining = Math.max(0, enemy.rangedCooldownRemaining - delta);
    }

    if (enemy.type !== "bomber") continue;
    tryEnemyBomberShot(enemy, player, enemyProjectiles, enemyProjectileIdRef);
  }
}

