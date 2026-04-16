import { ENEMY_TOUCH_COOLDOWN, PLAYER_HIT_RADIUS, PROJECTILE_DESPAWN_PADDING, WORLD_HALF_SIZE } from "../constants";
import { angleFromDirection, clampToBounds, distance, normalize } from "../utils";
import type { CoinState, EnemyState, PlayerState, ProjectileState } from "../types";

interface CollisionResult {
  killsGained: number;
  playerDamageTaken: number;
  spawnedCoins: CoinState[];
}

export function updateProjectileMotion(projectiles: ProjectileState[], delta: number): void {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.velocity.x * delta;
    projectile.position.y += projectile.velocity.y * delta;
    projectile.ttl -= delta;

    if (
      projectile.ttl <= 0 ||
      projectile.position.x < -WORLD_HALF_SIZE - PROJECTILE_DESPAWN_PADDING ||
      projectile.position.x > WORLD_HALF_SIZE + PROJECTILE_DESPAWN_PADDING ||
      projectile.position.y < -WORLD_HALF_SIZE - PROJECTILE_DESPAWN_PADDING ||
      projectile.position.y > WORLD_HALF_SIZE + PROJECTILE_DESPAWN_PADDING
    ) {
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
    if (direction.x !== 0 || direction.y !== 0) {
      enemy.facing = angleFromDirection(direction);
    }
    enemy.position.x += direction.x * enemy.speed * delta;
    enemy.position.y += direction.y * enemy.speed * delta;
    enemy.position = clampToBounds(enemy.position, WORLD_HALF_SIZE);
    enemy.touchTimer -= delta;
  }
}

export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  projectiles: ProjectileState[],
  enemyProjectiles: ProjectileState[],
  coinIdRef: { value: number },
): CollisionResult {
  let killsGained = 0;
  let playerDamageTaken = 0;
  const spawnedCoins: CoinState[] = [];

  for (let projectileIdx = projectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = projectiles[projectileIdx];
    let projectileConsumed = false;
    for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
      const enemy = enemies[enemyIdx];
      if (distance(enemy.position, projectile.position) <= projectile.radius + 0.65) {
        enemy.hp -= projectile.damage;
        projectileConsumed = true;
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

  // Enemy projectiles -> player damage
  for (let projectileIdx = enemyProjectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = enemyProjectiles[projectileIdx];
    if (distance(projectile.position, player.position) <= projectile.radius + PLAYER_HIT_RADIUS) {
      playerDamageTaken += projectile.damage;
      enemyProjectiles.splice(projectileIdx, 1);
    }
  }

  return { killsGained, playerDamageTaken, spawnedCoins };
}
