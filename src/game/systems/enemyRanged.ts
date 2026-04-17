import {
  ENEMY_RANGED_COOLDOWN,
  ENEMY_RANGED_DAMAGE,
  ENEMY_RANGED_RADIUS,
  ENEMY_RANGED_SPEED,
} from "../constants";
import { distance, normalize } from "../utils";
import type { EnemyState, PlayerState, ProjectileKind, ProjectileState } from "../types";

function projectileKindForEnemy(type: EnemyState["type"]): ProjectileKind {
  if (type === "corsair") {
    return "enemyCorsair";
  }
  if (type === "bomber") {
    return "enemyBomber";
  }
  return "enemyBrute";
}

export function runEnemyRangedAttacks(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  delta: number,
): void {
  for (const enemy of enemies) {
    enemy.rangedCooldown -= delta;
    if (enemy.rangedCooldown > 0) {
      continue;
    }

    const toward = normalize({
      x: player.position.x - enemy.position.x,
      y: player.position.y - enemy.position.y,
    });
    if (toward.x === 0 && toward.y === 0) {
      enemy.rangedCooldown = ENEMY_RANGED_COOLDOWN[enemy.type] * 0.35;
      continue;
    }

    const speed = ENEMY_RANGED_SPEED[enemy.type];
    const spawnLead = 0.65;
    projectiles.push({
      id: projectileIdRef.value++,
      kind: projectileKindForEnemy(enemy.type),
      position: {
        x: enemy.position.x + toward.x * spawnLead,
        y: enemy.position.y + toward.y * spawnLead,
      },
      velocity: { x: toward.x * speed, y: toward.y * speed },
      ttl: 3.4,
      damage: ENEMY_RANGED_DAMAGE[enemy.type],
      radius: ENEMY_RANGED_RADIUS[enemy.type],
    });

    enemy.rangedCooldown = ENEMY_RANGED_COOLDOWN[enemy.type];

    // Stagger volleys when multiple enemies stack so bursts stay readable.
    if (distance(enemy.position, player.position) < 9) {
      enemy.rangedCooldown *= 1.25;
    }
  }
}
