import { ENEMY_TOUCH_COOLDOWN, PLAYER_HIT_RADIUS, PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER } from "../constants";
import { angleFromDirection, distance, normalize } from "../utils";
import { isEnemyProjectileKind, type EnemyState, type PickupState, type PlayerState, type ProjectileState, type VisualEffect } from "../types";

export interface CollisionResult {
  killsGained: number;
  playerDamageTaken: number;
  spawnedPickups: PickupState[];
  cannonHits: number;
  maxHitDealt: number;
}

const ENEMY_FACING_SMOOTHING = 8;

function angleDelta(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function pushEffect(
  effects: VisualEffect[],
  effectIdRef: { value: number },
  kind: VisualEffect["kind"],
  position: { x: number; y: number },
  duration: number,
): void {
  effects.push({
    id: effectIdRef.value++,
    kind,
    position: { ...position },
    remaining: duration,
  });
}

export function updateProjectileMotion(
  projectiles: ProjectileState[],
  playerPosition: { x: number; y: number },
  delta: number,
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
): void {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.velocity.x * delta;
    projectile.position.y += projectile.velocity.y * delta;
    projectile.ttl -= delta;

    const farFromPlayer = distance(projectile.position, playerPosition) > PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER;

    if (projectile.ttl <= 0 || farFromPlayer) {
      pushEffect(visualEffects, effectIdRef, "waterSplash", projectile.position, 0.32);
      if (projectile.kind === "playerCannon" || projectile.kind === "enemyBrute") {
        pushEffect(visualEffects, effectIdRef, "waterRippleSmall", projectile.position, 0.38);
      }
      projectiles.splice(i, 1);
    }
  }
}

export function updateEnemyMovement(enemies: EnemyState[], player: PlayerState, delta: number): void {
  for (const enemy of enemies) {
    const distToPlayer = distance(player.position, enemy.position);
    let direction = { x: 0, y: 0 };
    
    if (distToPlayer > 0.01) {
      const rawDir = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });

      if (enemy.type === "bomber" || enemy.type === "swarmer") {
        direction = rawDir;
      } else if (enemy.type === "brute") {
        if (distToPlayer >= 10) {
          direction = rawDir;
        }
      } else if (enemy.type === "sniper") {
        if (distToPlayer < 14) {
          direction = { x: -rawDir.x, y: -rawDir.y };
        } else if (distToPlayer > 16) {
          direction = rawDir;
        }
      } else if (enemy.type === "corsair") {
        if (distToPlayer < 7) {
          direction = { x: -rawDir.x, y: -rawDir.y };
        } else if (distToPlayer > 9) {
          direction = rawDir;
        } else {
          direction = { x: -rawDir.y, y: rawDir.x };
        }
      }
    }

    if (direction.x !== 0 || direction.y !== 0) {
      const targetFacing = angleFromDirection(direction);
      enemy.facing += angleDelta(targetFacing, enemy.facing) * Math.min(1, delta * ENEMY_FACING_SMOOTHING);
      
      enemy.position.x += direction.x * enemy.speed * delta;
      enemy.position.y += direction.y * enemy.speed * delta;
    }
    
    enemy.touchTimer -= delta;
  }
}

export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  projectiles: ProjectileState[],
  pickupIdRef: { value: number },
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
): CollisionResult {
  let killsGained = 0;
  let playerDamageTaken = 0;
  let cannonHits = 0;
  let maxHitDealt = 0;
  const spawnedPickups: PickupState[] = [];

  for (let projectileIdx = projectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = projectiles[projectileIdx];

    if (isEnemyProjectileKind(projectile.kind)) {
      if (distance(player.position, projectile.position) <= PLAYER_HIT_RADIUS + projectile.radius) {
        playerDamageTaken += projectile.damage;
        pushEffect(visualEffects, effectIdRef, "hitBurst", projectile.position, 0.22);
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.35);
        projectiles.splice(projectileIdx, 1);
      }
      continue;
    }

    let projectileConsumed = false;
    for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
      const enemy = enemies[enemyIdx];
      if (distance(enemy.position, projectile.position) <= projectile.radius + 0.65) {
        enemy.hp -= projectile.damage;
        maxHitDealt = Math.max(maxHitDealt, projectile.damage);
        if (projectile.kind === "playerCannon") cannonHits += 1;
        projectileConsumed = true;
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.26);
        
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "damageNumber",
          position: { ...enemy.position },
          remaining: 0.8,
          text: projectile.damage.toString(),
          color: projectile.kind === "playerCannon" ? "#fff2a8" : "#ffffff",
        });

        if (enemy.hp <= 0) {
          killsGained += 1;
          enemies.splice(enemyIdx, 1);
          pushEffect(visualEffects, effectIdRef, "enemyDeath", enemy.position, 1.0);
          const roll = Math.random();
          if (roll < 0.03) {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "hp",
              position: { ...enemy.position },
              value: 10,
            });
          } else if (roll < 0.07) {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "gem",
              position: { ...enemy.position },
              value: 5,
            });
          } else {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "coin",
              position: { ...enemy.position },
              value: 1,
            });
          }
        }
        break;
      }
    }
    if (projectileConsumed) {
      projectiles.splice(projectileIdx, 1);
    }
  }

  for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
    const enemy = enemies[enemyIdx];
    const touching = distance(enemy.position, player.position) <= PLAYER_HIT_RADIUS;
    
    if (touching) {
      if (enemy.type === "bomber") {
        playerDamageTaken += enemy.touchDamage * 2.5;
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.5);
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.45);
        enemies.splice(enemyIdx, 1);
      } else if (enemy.touchTimer <= 0) {
        playerDamageTaken += enemy.touchDamage;
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.3);
        enemy.touchTimer = ENEMY_TOUCH_COOLDOWN;
      }
    }
  }

  return { killsGained, playerDamageTaken, spawnedPickups, cannonHits, maxHitDealt };
}
