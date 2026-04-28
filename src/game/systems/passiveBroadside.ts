import {
  BASE_PASSIVE_BROADSIDE_INTERVAL,
  CANNON_PROJECTILE_DAMAGE,
  CANNON_PROJECTILE_SPEED,
  CANNON_SIDE_ORIGIN_OFFSET,
} from "../constants";
import { angleFromDirection, directionFromAngle, perpRight } from "../utils";
import type { PlayerState, ProjectileState, UpgradeStats, VisualEffect } from "../types";

export function getPassiveBroadsideInterval(upgrades: UpgradeStats): number {
  const sideGunStacks = upgrades.stacks.sideGuns ?? 0;
  const sideGunBonus = 1 - Math.min(0.45, sideGunStacks * 0.15);
  return BASE_PASSIVE_BROADSIDE_INTERVAL * upgrades.cooldownMult * sideGunBonus;
}

export function runPassiveBroadside(
  player: PlayerState,
  upgrades: UpgradeStats,
  intervalTimerRef: { value: number },
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
): void {
  intervalTimerRef.value -= delta;
  if (intervalTimerRef.value > 0) {
    return;
  }

  const interval = Math.max(0.5, getPassiveBroadsideInterval(upgrades));
  intervalTimerRef.value += interval;

  const forward = directionFromAngle(player.facing);
  const right = perpRight(forward);
  const port = { x: -right.x, y: -right.y };
  const rightAngle = angleFromDirection(right);
  const portAngle = angleFromDirection(port);

  const extraPerSide = upgrades.stacks.sideGuns ?? 0;
  const shotsPerSide = 1 + extraPerSide;
  const spread = 0.24;

  // Compute port origins before any scheduling so charge and fire share positions
  const leftOrigins = computeSideOrigins(right, rightAngle, shotsPerSide, spread, player, CANNON_SIDE_ORIGIN_OFFSET);
  const rightOrigins = computeSideOrigins(port, portAngle, shotsPerSide, spread, player, CANNON_SIDE_ORIGIN_OFFSET);

  // Telegraph: push charge glow ~0.3s before actual fire so players can anticipate
  const allOrigins = [...leftOrigins, ...rightOrigins];
  for (const origin of allOrigins) {
    visualEffects.push({
      id: effectIdRef.value++,
      kind: "broadsideCharge",
      position: { x: origin.x, y: origin.y },
      remaining: 0.3,
    });
  }

  // Fire the broadside with a short delay so the charge has time to display
  setTimeout(() => {
    for (const origin of allOrigins) {
      projectiles.push({
        id: projectileIdRef.value++,
        kind: "playerCannon",
        position: { x: origin.x, y: origin.y },
        velocity: {
          x: directionFromAngle(origin.angle).x * CANNON_PROJECTILE_SPEED,
          y: directionFromAngle(origin.angle).y * CANNON_PROJECTILE_SPEED,
        },
        ttl: 1.45,
        damage: CANNON_PROJECTILE_DAMAGE * 0.58,
        radius: 0.42,
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "muzzleFlash",
        position: { x: origin.x, y: origin.y },
        remaining: 0.08,
      });
    }
  }, 300);
}

function computeSideOrigins(
  side: { x: number; y: number },
  sideAngle: number,
  shotsPerSide: number,
  spread: number,
  player: PlayerState,
  offset: number,
): Array<{ x: number; y: number; angle: number }> {
  const origins: Array<{ x: number; y: number; angle: number }> = [];
  const start = -spread / 2;
  const step = spread / Math.max(1, shotsPerSide - 1);
  for (let i = 0; i < shotsPerSide; i += 1) {
    const localOffset = start + step * i;
    const angle = sideAngle + localOffset;
    const dir = directionFromAngle(angle);
    origins.push({
      x: player.position.x + side.x * offset,
      y: player.position.y + side.y * offset,
      angle,
    });
  }
  return origins;
}
