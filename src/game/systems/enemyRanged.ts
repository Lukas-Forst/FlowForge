import {
  ENEMY_RANGED_COOLDOWN,
  ENEMY_RANGED_DAMAGE,
  ENEMY_RANGED_RADIUS,
  ENEMY_RANGED_SPEED,
} from "../constants";
import { distance, normalize } from "../utils";
import type { EnemyState, PlayerState, ProjectileKind, ProjectileState, VisualEffect } from "../types";

function projectileKindForEnemy(type: EnemyState["type"]): ProjectileKind {
  if (type === "corsair") return "enemyCorsair";
  if (type === "sniper") return "enemySniper";
  return "enemyBrute";
}

export function runEnemyRangedAttacks(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
): void {
  for (const enemy of enemies) {
    if (enemy.type === "swarmer" || enemy.type === "bomber") continue;
<<<<<<< HEAD
    if (enemy.isElite && (enemy.type === "corsair" || enemy.type === "brute" || enemy.type === "sniper")) continue;
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

    enemy.rangedCooldown -= delta;

    if (enemy.type === "brute" || enemy.type === "sniper") {
      const telegraphThreshold = enemy.type === "brute" ? 0.8 : 1.2;
      if (enemy.rangedCooldown < telegraphThreshold && enemy.rangedCooldown + delta >= telegraphThreshold) {
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "telegraphRing",
          position: { ...enemy.position },
          remaining: telegraphThreshold,
        });
      }
    }

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
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "muzzleFlash",
      position: {
        x: enemy.position.x + toward.x * spawnLead * 0.95,
        y: enemy.position.y + toward.y * spawnLead * 0.95,
      },
      remaining: 0.08,
    });
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "waterRippleSmall",
      position: {
        x: enemy.position.x + toward.x * 0.5,
        y: enemy.position.y + toward.y * 0.5,
      },
      remaining: 0.2,
    });

    enemy.rangedCooldown = ENEMY_RANGED_COOLDOWN[enemy.type];

    // Stagger volleys when multiple enemies stack so bursts stay readable.
    if (distance(enemy.position, player.position) < 9) {
      enemy.rangedCooldown *= 1.25;
    }
  }
}
