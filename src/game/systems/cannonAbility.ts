import {
  BASE_CANNON_COOLDOWN,
  CANNON_BROADSIDE_SPREAD_RADIANS,
  CANNON_PROJECTILE_DAMAGE,
  CANNON_PROJECTILE_SPEED,
  CANNON_SALVO_COUNT,
  CANNON_SIDE_ORIGIN_OFFSET,
} from "../constants";
import { angleFromDirection, directionFromAngle, perpRight } from "../utils";
import type { Cooldowns, PlayerState, ProjectileState, VisualEffect } from "../types";

export function tryFireCannon(
  player: PlayerState,
  cooldowns: Cooldowns,
  projectileIdRef: { value: number },
  cooldownMultiplier: number,
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  cannonSpreadStacks: number = 0,
): boolean {
  if (cooldowns.cannonRemaining > 0) {
    return false;
  }

  // Broadside volley: shoot from port and starboard.
  // Port/Starboard directions are perpendicular to ship facing.
  const forward = directionFromAngle(player.facing);
  const right = perpRight(forward);
  const port = { x: -right.x, y: -right.y };

  const spreadStacks = Math.max(0, cannonSpreadStacks);
  const total = CANNON_SALVO_COUNT + spreadStacks * 2;
  const portCount = Math.ceil(total / 2);
  const starboardCount = total - portCount;

  const rightAngle = angleFromDirection(right);
  const portAngle = angleFromDirection(port);

  const fireSide = (
    sideAngle: number,
    sideCount: number,
    originOffset: { x: number; y: number },
  ): void => {
    if (sideCount <= 0) return;
    const spreadRadians = CANNON_BROADSIDE_SPREAD_RADIANS * (1 + spreadStacks * 0.22);
    const start = -spreadRadians / 2;
    const step = spreadRadians / Math.max(1, sideCount - 1);
    for (let i = 0; i < sideCount; i += 1) {
      const localOffset = start + step * i;
      const angle = sideAngle + localOffset;
      const dir = directionFromAngle(angle);

      projectiles.push({
        id: projectileIdRef.value++,
        kind: "playerCannon",
        position: {
          x: player.position.x + originOffset.x * CANNON_SIDE_ORIGIN_OFFSET,
          y: player.position.y + originOffset.y * CANNON_SIDE_ORIGIN_OFFSET,
        },
        velocity: {
          x: dir.x * CANNON_PROJECTILE_SPEED,
          y: dir.y * CANNON_PROJECTILE_SPEED,
        },
        ttl: 1.75,
        damage: CANNON_PROJECTILE_DAMAGE,
        radius: 0.48,
      });

      visualEffects.push({
        id: effectIdRef.value++,
        kind: "muzzleFlash",
        position: {
          x: player.position.x + originOffset.x * CANNON_SIDE_ORIGIN_OFFSET,
          y: player.position.y + originOffset.y * CANNON_SIDE_ORIGIN_OFFSET,
        },
        remaining: 0.1,
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "waterRippleSmall",
        position: {
          x: player.position.x + originOffset.x * CANNON_SIDE_ORIGIN_OFFSET * 0.92,
          y: player.position.y + originOffset.y * CANNON_SIDE_ORIGIN_OFFSET * 0.92,
        },
        remaining: 0.26,
      });
    }
  };

  // Starboard uses +right, port uses -right.
  fireSide(rightAngle, starboardCount, right);
  fireSide(portAngle, portCount, port);

  cooldowns.cannonDuration = BASE_CANNON_COOLDOWN * cooldownMultiplier;
  cooldowns.cannonRemaining = cooldowns.cannonDuration;
  return true;
}
