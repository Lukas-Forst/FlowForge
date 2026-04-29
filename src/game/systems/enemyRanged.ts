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

/** Perpendicular unit vector to the given direction, randomly ±1 on the perpendicular axis. */
function lateralOffset(toward: { x: number; y: number }, scale: number): { x: number; y: number } {
  // perpendicular (rotate 90°): (x, y) -> (-y, x)
  const px = -toward.y;
  const py = toward.x;
  const sign = Math.random() < 0.5 ? 1 : -1;
  return { x: px * scale * sign, y: py * scale * sign };
}

export function runEnemyRangedAttacks(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
  playerCannonCharging?: boolean, // true when cannon cooldown > 0 (player charging)
): void {
  for (const enemy of enemies) {
    if (enemy.type === "swarmer") {
      // Swarmers: add small random separation offset each frame to avoid perfect stacking.
      // Applied via a tiny per-frame drift; actual position update lives in enemyMovement.
      continue;
    }
    if (enemy.isElite && (enemy.type === "corsair" || enemy.type === "brute" || enemy.type === "sniper")) continue;

    enemy.rangedCooldown -= delta;

    // Flank timer tick — strafe laterally in the seconds before an attack.
    if (enemy.flankTimer != null && enemy.flankTimer > 0) {
      enemy.flankTimer -= delta;
    }

    const telegraphThreshold = (() => {
      switch (enemy.type) {
        case "brute":          return 0.8;
        case "sniper":         return 1.2;
        case "corsair":        return 0.4;
        case "bomber":         return 0.25;
        case "boss":           return 0.7;
        case "shore_battery":  return 0.6;
        default:               return 0;
      }
    })();

    if (telegraphThreshold > 0 && enemy.rangedCooldown < telegraphThreshold && enemy.rangedCooldown + delta >= telegraphThreshold) {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "telegraphRing",
        position: { ...enemy.position },
        remaining: telegraphThreshold,
      });

      // Begin flanking strafe ~0.3s before attack for Brute/Sniper.
      if (enemy.type === "brute" || enemy.type === "sniper") {
        enemy.flankTimer = 0.3;
        enemy.flankDir = Math.random() < 0.5 ? 1 : -1;
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

    // Compute lateral flanking offset for this attack.
    let flankOffset = { x: 0, y: 0 };
    if (enemy.flankTimer != null && enemy.flankTimer > 0) {
      // Still in strafe window — apply lateral offset.
      flankOffset = lateralOffset(toward, 0.5 * enemy.flankDir);
    } else if (playerCannonCharging) {
      // Player charging cannon — try to sidestep.
      const sidestepDir = Math.random() < 0.5 ? 1 : -1;
      flankOffset = lateralOffset(toward, 0.35 * sidestepDir);
    } else if (enemy.type === "corsair") {
      // Corsairs get a slight random offset even without flanking.
      flankOffset = lateralOffset(toward, 0.2);
    }

    // Clear flank state after use.
    enemy.flankTimer = 0;
    enemy.flankDir = undefined;

    const speed = ENEMY_RANGED_SPEED[enemy.type];
    const spawnLead = 0.65;
    const spawnX = enemy.position.x + toward.x * spawnLead + flankOffset.x;
    const spawnY = enemy.position.y + toward.y * spawnLead + flankOffset.y;
    projectiles.push({
      id: projectileIdRef.value++,
      kind: projectileKindForEnemy(enemy.type),
      position: { x: spawnX, y: spawnY },
      velocity: { x: toward.x * speed, y: toward.y * speed },
      ttl: 3.4,
      damage: ENEMY_RANGED_DAMAGE[enemy.type],
      radius: ENEMY_RANGED_RADIUS[enemy.type],
    });
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "muzzleFlash",
      position: {
        x: enemy.position.x + toward.x * spawnLead * 0.95 + flankOffset.x * 0.8,
        y: enemy.position.y + toward.y * spawnLead * 0.95 + flankOffset.y * 0.8,
      },
      remaining: 0.08,
    });
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "waterRippleSmall",
      position: {
        x: enemy.position.x + toward.x * 0.5 + flankOffset.x * 0.5,
        y: enemy.position.y + toward.y * 0.5 + flankOffset.y * 0.5,
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
