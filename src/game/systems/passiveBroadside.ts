import {
  BASE_PASSIVE_BROADSIDE_INTERVAL,
  CANNON_PROJECTILE_DAMAGE,
  CANNON_PROJECTILE_SPEED,
  CANNON_SIDE_ORIGIN_OFFSET,
  CANNON_BROADSIDE_SPREAD_RADIANS,
} from "../constants";
import { angleFromDirection, directionFromAngle, perpRight } from "../utils";
import type { EnemyState, PlayerState, ProjectileState, UpgradeStats, VisualEffect } from "../types";

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
  enemies: EnemyState[],
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

  // Perpendicular angles for each side
  const starboardAngle = angleFromDirection(right);
  const portAngle = angleFromDirection(port);

  // Cone half-spread: targets must be within this many radians of the side angle
  const coneHalfSpread = CANNON_BROADSIDE_SPREAD_RADIANS;

  // Extra shots per side from upgrade stacks
  const extraPerSide = upgrades.stacks.sideGuns ?? 0;
  const shotsPerSide = 1 + extraPerSide;

  // ── Find closest enemies in each cone, sorted by distance ────────────────
  const toEnemyAngle = (ex: number, ey: number) =>
    Math.atan2(ey - player.position.y, ex - player.position.x);
  const normalizeAngle = (a: number) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  const angleDiff = (a: number, b: number) =>
    Math.abs(normalizeAngle(a - b));

  // Returns [{enemy, dist}] sorted by distance, filtered to cone
  const enemiesInCone = (coneAngle: number) =>
    enemies
      .filter((e) => angleDiff(toEnemyAngle(e.position.x, e.position.y), coneAngle) <= coneHalfSpread)
      .map((e) => ({ enemy: e, dist: Math.hypot(e.position.x - player.position.x, e.position.y - player.position.y) }))
      .sort((a, b) => a.dist - b.dist);

  const starboardTargets = enemiesInCone(starboardAngle);
  const portTargets = enemiesInCone(portAngle);

  // ── Build shot origins: aim at closest threats, fall back to fixed spread ─
  const pierceCount = upgrades.stacks.pierce ?? 0;

  const buildSideOrigins = (
    side: { x: number; y: number },
    sideAngle: number,
    targets: { enemy: EnemyState; dist: number }[],
  ) => {
    const origins: Array<{ x: number; y: number; angle: number }> = [];
    for (let i = 0; i < shotsPerSide; i += 1) {
      let angle: number;
      if (i < targets.length) {
        // Aim at the i-th closest target in the cone
        angle = toEnemyAngle(targets[i].enemy.position.x, targets[i].enemy.position.y);
      } else if (targets.length > 0) {
        // Fewer targets than shots — last shots fan out slightly from closest target
        const baseAngle = toEnemyAngle(targets[0].enemy.position.x, targets[0].enemy.position.y);
        const spreadStep = coneHalfSpread / Math.max(1, shotsPerSide - 1);
        angle = baseAngle + spreadStep * (i - targets.length + 1);
      } else {
        // No targets — fire in fixed perpendicular spread
        const spread = 0.24;
        const step = shotsPerSide > 1 ? spread / (shotsPerSide - 1) : 0;
        angle = sideAngle + (-spread / 2 + step * i);
      }
      origins.push({
        x: player.position.x + side.x * CANNON_SIDE_ORIGIN_OFFSET,
        y: player.position.y + side.y * CANNON_SIDE_ORIGIN_OFFSET,
        angle,
      });
    }
    return origins;
  };

  const leftOrigins = buildSideOrigins(right, starboardAngle, starboardTargets);
  const rightOrigins = buildSideOrigins(port, portAngle, portTargets);

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
        pierceRemaining: pierceCount,
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
