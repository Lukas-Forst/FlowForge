import { normalize, distance } from "../utils";
import type { DelayedAoEState, EnemyState, PlayerState, ProjectileState, VisualEffect } from "../types";

interface NumberRef {
  value: number;
}

/** Perpendicular offset to a direction vector, randomly ±scale. */
function lateralOffset(toward: { x: number; y: number }, scale: number): { x: number; y: number } {
  const px = -toward.y;
  const py = toward.x;
  const sign = Math.random() < 0.5 ? 1 : -1;
  return { x: px * scale * sign, y: py * scale * sign };
}

const ELITE_CORSAIR_BASE_COOLDOWN = 2.2;
const ELITE_BRUTE_BASE_COOLDOWN = 4.2;
const ELITE_BOMBER_MINE_COOLDOWN = 2.9;
const ELITE_SNIPER_BASE_COOLDOWN = 5.4;
const ELITE_SNIPER_TELEGRAPH_THRESHOLD = 0.95;

export function runEliteAbilities(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: NumberRef,
  projectiles: ProjectileState[],
  delayedAoEs: DelayedAoEState[],
  delayedAoEIdRef: NumberRef,
  visualEffects: VisualEffect[],
  effectIdRef: NumberRef,
  delta: number,
  playerCannonCharging?: boolean,
): void {
  for (const enemy of enemies) {
    if (!enemy.isElite) continue;
    if (enemy.type !== "corsair" && enemy.type !== "brute" && enemy.type !== "bomber" && enemy.type !== "sniper") continue;

    enemy.rangedCooldown -= delta;
    if (
      enemy.type === "sniper" &&
      enemy.rangedCooldown < ELITE_SNIPER_TELEGRAPH_THRESHOLD &&
      enemy.rangedCooldown + delta >= ELITE_SNIPER_TELEGRAPH_THRESHOLD
    ) {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "telegraphRing",
        position: { ...enemy.position },
        remaining: ELITE_SNIPER_TELEGRAPH_THRESHOLD,
      });
      // Begin flanking strafe ~0.3s before elite sniper fires.
      enemy.flankTimer = 0.3;
      enemy.flankDir = Math.random() < 0.5 ? 1 : -1;
    }

    if (enemy.type === "corsair") {
      const toward = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });
      if (toward.x !== 0 || toward.y !== 0) {
        // Corsair: slight random offset each volley, dodge sidestep if player charging.
        let flankOffset = { x: 0, y: 0 };
        if (playerCannonCharging) {
          const sidestepDir = Math.random() < 0.5 ? 1 : -1;
          flankOffset = lateralOffset(toward, 0.25 * sidestepDir);
        } else {
          flankOffset = lateralOffset(toward, 0.15);
        }
        const baseAngle = Math.atan2(toward.y, toward.x);
        const spread = 0.24;
        const angles = [baseAngle - spread, baseAngle, baseAngle + spread];
        for (const angle of angles) {
          const dir = { x: Math.cos(angle), y: Math.sin(angle) };
          projectiles.push({
            id: projectileIdRef.value++,
            kind: "enemyCorsair",
            position: {
              x: enemy.position.x + dir.x * 0.65 + flankOffset.x,
              y: enemy.position.y + dir.y * 0.65 + flankOffset.y,
            },
            velocity: { x: dir.x * 14.5, y: dir.y * 14.5 },
            ttl: 3.6,
            damage: 5,
            radius: 0.28,
          });
        }
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "muzzleFlash",
          position: {
            x: enemy.position.x + flankOffset.x,
            y: enemy.position.y + flankOffset.y,
          },
          remaining: 0.11,
        });
      }
      enemy.rangedCooldown = ELITE_CORSAIR_BASE_COOLDOWN;
      continue;
    }

    if (enemy.type === "bomber") {
      delayedAoEs.push({
        id: delayedAoEIdRef.value++,
        position: { ...enemy.position },
        remaining: 0.45,
        radius: 2.6,
        damage: 12,
        source: "enemy",
        visualType: "shockwave",
      });
      enemy.rangedCooldown = ELITE_BOMBER_MINE_COOLDOWN;
      continue;
    }

    if (enemy.type === "sniper") {
      const toward = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });
      if (toward.x !== 0 || toward.y !== 0) {
        let flankOffset = { x: 0, y: 0 };
        if (enemy.flankTimer != null && enemy.flankTimer > 0) {
          flankOffset = lateralOffset(toward, 0.5 * (enemy.flankDir ?? 1));
        } else if (playerCannonCharging) {
          const sidestepDir = Math.random() < 0.5 ? 1 : -1;
          flankOffset = lateralOffset(toward, 0.35 * sidestepDir);
        }
        enemy.flankTimer = 0;
        enemy.flankDir = undefined;
        projectiles.push({
          id: projectileIdRef.value++,
          kind: "enemySniper",
          position: {
            x: enemy.position.x + toward.x * 0.8 + flankOffset.x,
            y: enemy.position.y + toward.y * 0.8 + flankOffset.y,
          },
          velocity: { x: toward.x * 31, y: toward.y * 31 },
          ttl: 3.8,
          damage: 14,
          radius: 0.19,
        });
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "muzzleFlash",
          position: {
            x: enemy.position.x + flankOffset.x,
            y: enemy.position.y + flankOffset.y,
          },
          remaining: 0.11,
        });
      }
      enemy.rangedCooldown = ELITE_SNIPER_BASE_COOLDOWN;
      continue;
    }

    // Elite brute shockwave: close-range telegraphed delayed AoE.
    if (distance(enemy.position, player.position) <= 5.2) {
      delayedAoEs.push({
        id: delayedAoEIdRef.value++,
        position: { ...enemy.position },
        remaining: 0.6,
        radius: 2.8,
        damage: 16,
        source: "enemy",
        visualType: "shockwave",
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "telegraphRing",
        position: { ...enemy.position },
        remaining: 0.6,
      });
    }
    enemy.rangedCooldown = ELITE_BRUTE_BASE_COOLDOWN;
  }
}
