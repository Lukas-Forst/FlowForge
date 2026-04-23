import { CAMERA_VIEW_HALF } from "../constants";
import { RUN_ARC_P3_END } from "./runArc";
import type { EnemyState, ProjectileState, VisualEffect } from "../types";

/**
 * Spawns a single mega-boss once the run has reached the boss-storm region (18+ min).
 * Uses `megaBossSpawned` ref so it only ever fires one per run.
 */
export function updateMegaBossEncounter(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  playerPosition: { x: number; y: number },
  elapsedTotal: number,
  megaBossSpawned: { value: boolean },
): void {
  if (megaBossSpawned.value) return;
  if (elapsedTotal < RUN_ARC_P3_END) return;

  const hasBoss = enemies.some((e) => e.type === "boss");
  if (hasBoss) return;

  const hp = 600 + Math.floor(elapsedTotal / 60) * 350;

  const spawnAngle = Math.random() * Math.PI * 2;
  const spawnDist = CAMERA_VIEW_HALF + 15;
  const x = playerPosition.x + Math.cos(spawnAngle) * spawnDist;
  const y = playerPosition.y + Math.sin(spawnAngle) * spawnDist;

  enemies.push({
    id: enemyIdRef.value++,
    type: "boss",
    isElite: false,
    position: { x, y },
    facing: spawnAngle + Math.PI,
    hp,
    maxHp: hp,
    speed: 6.5,
    touchDamage: 50,
    touchTimer: 1.0,
    rangedCooldown: 3.5,
  });
  megaBossSpawned.value = true;
}

export const updateBossEncounter = updateMegaBossEncounter;

export function runBossAttacks(
  enemies: EnemyState[],
  _player: { position: { x: number; y: number } },
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
): void {
  for (const enemy of enemies) {
    if (enemy.type !== "boss") continue;

    enemy.rangedCooldown -= delta;

    if (enemy.rangedCooldown < 1.2 && enemy.rangedCooldown + delta >= 1.2) {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "telegraphRing",
        position: { ...enemy.position },
        remaining: 1.2,
      });
    }

    if (enemy.rangedCooldown <= 0) {
      const numProjectiles = 16;
      for (let i = 0; i < numProjectiles; i += 1) {
        const angle = (i / numProjectiles) * Math.PI * 2;
        const speed = 16;
        const spawnLead = 1.0;
        const vx = Math.cos(angle);
        const vy = Math.sin(angle);

        projectiles.push({
          id: projectileIdRef.value++,
          kind: "enemyBoss",
          position: {
            x: enemy.position.x + vx * spawnLead,
            y: enemy.position.y + vy * spawnLead,
          },
          velocity: { x: vx * speed, y: vy * speed },
          ttl: 5.0,
          damage: 20,
          radius: 0.5,
        });
      }

      visualEffects.push({
        id: effectIdRef.value++,
        kind: "screenShake",
        position: { ...enemy.position },
        remaining: 0.6,
      });

      enemy.rangedCooldown = 4.5;
    }
  }
}
