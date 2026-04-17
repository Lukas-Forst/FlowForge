import {
  ENEMY_TOUCH_COOLDOWN,
  PLAYER_HIT_RADIUS,
  PROJECTILE_DESPAWN_PADDING,
  WORLD_HALF_HEIGHT,
  WORLD_HALF_WIDTH,
} from "../constants";
import { clampToBounds, distance, normalize } from "../utils";
import { isEnemyProjectileKind, type CoinState, type EnemyState, type PlayerState, type ProjectileState, type VisualEffect } from "../types";

interface CollisionResult {
  killsGained: number;
  playerDamageTaken: number;
  spawnedCoins: CoinState[];
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
  delta: number,
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
): void {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.velocity.x * delta;
    projectile.position.y += projectile.velocity.y * delta;
    projectile.ttl -= delta;

    const outOfBounds =
      projectile.position.x < -WORLD_HALF_WIDTH - PROJECTILE_DESPAWN_PADDING ||
      projectile.position.x > WORLD_HALF_WIDTH + PROJECTILE_DESPAWN_PADDING ||
      projectile.position.y < -WORLD_HALF_HEIGHT - PROJECTILE_DESPAWN_PADDING ||
      projectile.position.y > WORLD_HALF_HEIGHT + PROJECTILE_DESPAWN_PADDING;

    if (projectile.ttl <= 0 || outOfBounds) {
      pushEffect(visualEffects, effectIdRef, "waterSplash", projectile.position, 0.32);
      projectiles.splice(i, 1);
    }
  }
}

export function updateEnemyMovement(enemies: EnemyState[], player: PlayerState, delta: number): void {
  for (const enemy of enemies) {
    const direction = normalize({
      x: player.position.x - enemy.position.x,
      y: player.position.y - enemy.position.y,
    });
    enemy.position.x += direction.x * enemy.speed * delta;
    enemy.position.y += direction.y * enemy.speed * delta;
    enemy.position = clampToBounds(enemy.position, WORLD_HALF_WIDTH, WORLD_HALF_HEIGHT);
    enemy.touchTimer -= delta;
  }
}

export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  projectiles: ProjectileState[],
  coinIdRef: { value: number },
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
): CollisionResult {
  let killsGained = 0;
  let playerDamageTaken = 0;
  const spawnedCoins: CoinState[] = [];

  for (let projectileIdx = projectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = projectiles[projectileIdx];

    if (isEnemyProjectileKind(projectile.kind)) {
      if (distance(player.position, projectile.position) <= PLAYER_HIT_RADIUS + projectile.radius) {
        playerDamageTaken += projectile.damage;
        pushEffect(visualEffects, effectIdRef, "hitBurst", projectile.position, 0.22);
        projectiles.splice(projectileIdx, 1);
      }
      continue;
    }

    let projectileConsumed = false;
    for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
      const enemy = enemies[enemyIdx];
      if (distance(enemy.position, projectile.position) <= projectile.radius + 0.65) {
        enemy.hp -= projectile.damage;
        projectileConsumed = true;
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.26);
        if (enemy.hp <= 0) {
          killsGained += 1;
          enemies.splice(enemyIdx, 1);
          spawnedCoins.push({
            id: coinIdRef.value++,
            position: { ...enemy.position },
            value: 1,
          });
        }
        break;
      }
    }
    if (projectileConsumed) {
      projectiles.splice(projectileIdx, 1);
    }
  }

  for (const enemy of enemies) {
    const touching = distance(enemy.position, player.position) <= PLAYER_HIT_RADIUS;
    if (touching && enemy.touchTimer <= 0) {
      playerDamageTaken += enemy.touchDamage;
      enemy.touchTimer = ENEMY_TOUCH_COOLDOWN;
    }
  }

  return { killsGained, playerDamageTaken, spawnedCoins };
}
