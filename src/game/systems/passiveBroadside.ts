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

  const fireSide = (side: { x: number; y: number }, sideAngle: number): void => {
    const start = -spread / 2;
    const step = spread / Math.max(1, shotsPerSide - 1);
    for (let i = 0; i < shotsPerSide; i += 1) {
      const localOffset = start + step * i;
      const angle = sideAngle + localOffset;
      const dir = directionFromAngle(angle);
      const originX = player.position.x + side.x * CANNON_SIDE_ORIGIN_OFFSET;
      const originY = player.position.y + side.y * CANNON_SIDE_ORIGIN_OFFSET;

      projectiles.push({
        id: projectileIdRef.value++,
        kind: "playerCannon",
        position: { x: originX, y: originY },
        velocity: {
          x: dir.x * CANNON_PROJECTILE_SPEED,
          y: dir.y * CANNON_PROJECTILE_SPEED,
        },
        ttl: 1.45,
        damage: CANNON_PROJECTILE_DAMAGE * 0.58,
        radius: 0.42,
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "muzzleFlash",
        position: { x: originX, y: originY },
        remaining: 0.08,
      });
    }
  };

  fireSide(right, rightAngle);
  fireSide(port, portAngle);
}
