import {
  AUTO_ATTACK_SPEED,
  BASE_AUTO_ATTACK_DAMAGE,
  BASE_AUTO_ATTACK_INTERVAL,
} from "../constants";
import { angleFromDirection, normalize } from "../utils";
import type { EnemyState, PlayerState, ProjectileState, VisualEffect } from "../types";
import { directionFromAngle } from "../utils";

export function runAutoAttack(
  enemies: EnemyState[],
  player: PlayerState,
  projectileIdRef: { value: number },
  intervalTimerRef: { value: number },
  fireRateMultiplier: number,
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
  isFrenzy: boolean = false,
  projectileCountStacks: number = 0,
  pierceStacks: number = 0,
  sternChaserStacks: number = 0,
  grapeshotStacks: number = 0,
  explosiveRoundsStacks: number = 0,
  deathBlossomStacks: number = 0,
): void {
  intervalTimerRef.value -= delta;
  if (intervalTimerRef.value > 0 || enemies.length === 0) {
    return;
  }

  const interval = isFrenzy ? (BASE_AUTO_ATTACK_INTERVAL / fireRateMultiplier) * 0.5 : (BASE_AUTO_ATTACK_INTERVAL / fireRateMultiplier);
  intervalTimerRef.value += interval;

  // Facing-based base attack (predictable, consistent with cannon/broadside rules).
  const baseDirection = normalize(directionFromAngle(player.facing));
  const baseAngle = angleFromDirection(baseDirection);
  const forwardOffset = 0.95;

  const explosiveRadiusBonus = Math.max(0, explosiveRoundsStacks) * 0.08;
  const explosiveDamageBonus = Math.max(0, explosiveRoundsStacks) * 0.08;

  const spawnShot = (dir: { x: number; y: number }, offsetScale: number, damageScale: number = 1): void => {
    projectiles.push({
      id: projectileIdRef.value++,
      kind: "playerAuto",
      position: {
        x: player.position.x + dir.x * forwardOffset * offsetScale,
        y: player.position.y + dir.y * forwardOffset * offsetScale,
      },
      velocity: { x: dir.x * AUTO_ATTACK_SPEED, y: dir.y * AUTO_ATTACK_SPEED },
      ttl: 2.2,
      damage: BASE_AUTO_ATTACK_DAMAGE * damageScale * (1 + explosiveDamageBonus),
      radius: 0.4 + explosiveRadiusBonus,
      pierceRemaining: Math.max(0, pierceStacks),
    });

    visualEffects.push({
      id: effectIdRef.value++,
      kind: "muzzleFlash",
      position: { x: player.position.x + dir.x * 1.08 * offsetScale, y: player.position.y + dir.y * 1.08 * offsetScale },
      remaining: 0.1,
    });
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "waterRippleSmall",
      position: { x: player.position.x + dir.x * 0.86 * offsetScale, y: player.position.y + dir.y * 0.86 * offsetScale },
      remaining: 0.24,
    });
  };

  if (deathBlossomStacks > 0) {
    const blossomCount = 8 + Math.max(0, projectileCountStacks) * 2;
    for (let i = 0; i < blossomCount; i += 1) {
      const angle = (Math.PI * 2 * i) / blossomCount;
      spawnShot(directionFromAngle(angle), 1, 0.82);
    }
  } else {
    const forwardShotCount = 1 + Math.max(0, projectileCountStacks);
    const forwardSpread = 0.16;
    const forwardStart = -forwardSpread / 2;
    const forwardStep = forwardSpread / Math.max(1, forwardShotCount - 1);
    for (let i = 0; i < forwardShotCount; i += 1) {
      const angleOffset = forwardStart + forwardStep * i;
      const shotDirection = directionFromAngle(baseAngle + angleOffset);
      spawnShot(shotDirection, 1, forwardShotCount > 1 ? 0.9 : 1);
    }
  }

  if (grapeshotStacks > 0) {
    const extraPellets = Math.max(1, grapeshotStacks * 2);
    const spread = 0.42;
    const start = -spread / 2;
    const step = spread / Math.max(1, extraPellets - 1);
    for (let i = 0; i < extraPellets; i += 1) {
      const pelletAngle = baseAngle + start + step * i;
      spawnShot(directionFromAngle(pelletAngle), 0.92, 0.55);
    }
  }

  if (sternChaserStacks > 0) {
    const rearDirection = { x: -baseDirection.x, y: -baseDirection.y };
    for (let i = 0; i < sternChaserStacks; i += 1) {
      spawnShot(rearDirection, 1, 0.95);
    }
  }
}
