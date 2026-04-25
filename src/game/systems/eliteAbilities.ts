import { normalize, distance } from "../utils";
import type { DelayedAoEState, EnemyState, PlayerState, ProjectileState, VisualEffect } from "../types";

interface NumberRef {
  value: number;
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
    }
    if (enemy.rangedCooldown > 0) continue;

    if (enemy.type === "corsair") {
      const toward = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });
      if (toward.x !== 0 || toward.y !== 0) {
        const baseAngle = Math.atan2(toward.y, toward.x);
        const spread = 0.24;
        const angles = [baseAngle - spread, baseAngle, baseAngle + spread];
        for (const angle of angles) {
          const dir = { x: Math.cos(angle), y: Math.sin(angle) };
          projectiles.push({
            id: projectileIdRef.value++,
            kind: "enemyCorsair",
            position: {
              x: enemy.position.x + dir.x * 0.65,
              y: enemy.position.y + dir.y * 0.65,
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
          position: { ...enemy.position },
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
        projectiles.push({
          id: projectileIdRef.value++,
          kind: "enemySniper",
          position: {
            x: enemy.position.x + toward.x * 0.8,
            y: enemy.position.y + toward.y * 0.8,
          },
          velocity: { x: toward.x * 31, y: toward.y * 31 },
          ttl: 3.8,
          damage: 14,
          radius: 0.19,
        });
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "muzzleFlash",
          position: { ...enemy.position },
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
