import {
  BASE_ENEMY_DAMAGE,
  BASE_ENEMY_HP,
  BASE_ENEMY_SPEED,
  BASE_SPAWN_INTERVAL,
  CAMERA_VIEW_HALF,
  ENEMY_TOUCH_COOLDOWN,
  MIN_ENEMY_SEPARATION,
  MIN_SPAWN_INTERVAL,
  SPAWN_OUTSIDE_VIEW_MIN_DIST,
  WORLD_HALF_HEIGHT,
  WORLD_HALF_WIDTH,
} from "../constants";
import { distance } from "../utils";
import type { EnemyState, EnemyType } from "../types";

function pickEnemyType(): EnemyType {
  const roll = Math.random();
  if (roll < 0.5) {
    return "corsair";
  }
  if (roll < 0.8) {
    return "bomber";
  }
  return "brute";
}

function getEnemyCap(elapsedTimeSec: number): number {
  // Active enemy cap ramp for a fuller opening minute without
  // forcing an immediate swarm.
  // 0:00–0:30 -> 3
  // 0:30–1:00 -> 4
  // 1:00–1:30 -> 5
  // 1:30+      -> +1 every 15 seconds, max 12
  if (elapsedTimeSec < 30) return 3;
  if (elapsedTimeSec < 60) return 4;
  if (elapsedTimeSec < 90) return 5;
  const after = elapsedTimeSec - 90;
  const ramp = Math.floor(after / 15);
  return Math.min(12, 6 + ramp);
}

function spawnEnemyOutsideCamera(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  playerPosition: { x: number; y: number },
  elapsedTime: number,
): boolean {
  const minDistFromPlayer = Math.max(SPAWN_OUTSIDE_VIEW_MIN_DIST, CAMERA_VIEW_HALF + 20);
  const spawnRadiusMin = minDistFromPlayer;
  const spawnRadiusMax = CAMERA_VIEW_HALF * 2.0 + 10;

  const attempts = 32;
  for (let a = 0; a < attempts; a += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
    const x = playerPosition.x + Math.cos(angle) * radius;
    const y = playerPosition.y + Math.sin(angle) * radius;

    if (x < -WORLD_HALF_WIDTH || x > WORLD_HALF_WIDTH || y < -WORLD_HALF_HEIGHT || y > WORLD_HALF_HEIGHT) {
      continue;
    }

    if (distance({ x, y }, playerPosition) < minDistFromPlayer) {
      continue;
    }

    let tooClose = false;
    for (const enemy of enemies) {
      if (distance(enemy.position, { x, y }) < MIN_ENEMY_SEPARATION) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const hpScale = 1 + Math.min(0.55, elapsedTime * 0.004);
    const speedScale = Math.min(1.6, elapsedTime * 0.008);
    const touchDamage = BASE_ENEMY_DAMAGE + Math.floor(elapsedTime / 60);

    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(),
      position: { x, y },
      hp: BASE_ENEMY_HP * hpScale,
      speed: BASE_ENEMY_SPEED + speedScale,
      touchDamage,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: 0.35 + Math.random() * 1.1,
    });
    return true;
  }

  // Fallback: try a random in-bounds point that's at least somewhat separated.
  for (let a = 0; a < 16; a += 1) {
    const x = -WORLD_HALF_WIDTH + Math.random() * (WORLD_HALF_WIDTH * 2);
    const y = -WORLD_HALF_HEIGHT + Math.random() * (WORLD_HALF_HEIGHT * 2);
    if (distance({ x, y }, playerPosition) < minDistFromPlayer) continue;
    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(),
      position: { x, y },
      hp: BASE_ENEMY_HP,
      speed: BASE_ENEMY_SPEED,
      touchDamage: BASE_ENEMY_DAMAGE,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: 0.4 + Math.random() * 0.9,
    });
    return true;
  }

  return false;
}

export function spawnEnemiesToCap(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  playerPosition: { x: number; y: number },
  elapsedTime: number,
  desiredCap: number,
): void {
  let guard = 64;
  while (enemies.length < desiredCap && guard-- > 0) {
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime);
  }
}

export function updateEnemySpawning(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  spawnTimerRef: { value: number },
  elapsedTime: number,
  delta: number,
  playerPosition: { x: number; y: number },
): number {
  const cap = getEnemyCap(elapsedTime);
  if (enemies.length >= cap) {
    return 0;
  }

  const spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - elapsedTime * 0.0085);
  spawnTimerRef.value -= delta;

  while (spawnTimerRef.value <= 0 && enemies.length < cap) {
    spawnTimerRef.value += spawnInterval;
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime);
  }

  return 1 / spawnInterval;
}

export { getEnemyCap };
