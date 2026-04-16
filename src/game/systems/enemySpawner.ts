import {
  BASE_ENEMY_DAMAGE,
  BASE_ENEMY_HP,
  BASE_ENEMY_SPEED,
  ENEMY_BOMBER_RANGED_COOLDOWN,
  BASE_SPAWN_INTERVAL,
  CAMERA_VIEW_HALF,
  ENEMY_TOUCH_COOLDOWN,
  MIN_ENEMY_SEPARATION,
  MIN_SPAWN_INTERVAL,
  SPAWN_OUTSIDE_VIEW_MIN_DIST,
  WORLD_HALF_SIZE,
} from "../constants";
import { distance } from "../utils";
import type { EnemyState, EnemyType } from "../types";

function getEnemyCap(elapsedTimeSec: number): number {
  // addons.md: controlled active enemy cap ramp
  // 0:00–0:30 -> 2
  // 0:30–1:00 -> 3
  // 1:00–1:15 -> 4
  // 1:15–1:30 -> 5
  // then +1 every 15 seconds, max 12
  if (elapsedTimeSec < 30) return 2;
  if (elapsedTimeSec < 60) return 3;
  if (elapsedTimeSec < 75) return 4;
  if (elapsedTimeSec < 90) return 5;
  const after = elapsedTimeSec - 90;
  const ramp = Math.floor(after / 15);
  return Math.min(12, 5 + ramp);
}

function chooseEnemyType(elapsedTimeSec: number): EnemyType {
  const r = Math.random();
  if (elapsedTimeSec < 30) {
    if (r < 0.7) return "corsair";
    if (r < 0.9) return "bomber";
    return "brute";
  }
  if (elapsedTimeSec < 60) {
    if (r < 0.55) return "corsair";
    if (r < 0.85) return "bomber";
    return "brute";
  }
  if (r < 120) {
    if (r < 0.45) return "corsair";
    if (r < 0.8) return "bomber";
    return "brute";
  }
  if (r < 0.4) return "corsair";
  if (r < 0.7) return "bomber";
  return "brute";
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
  const enemyType = chooseEnemyType(elapsedTime);

  for (let a = 0; a < attempts; a += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
    const x = playerPosition.x + Math.cos(angle) * radius;
    const y = playerPosition.y + Math.sin(angle) * radius;

    if (x < -WORLD_HALF_SIZE || x > WORLD_HALF_SIZE || y < -WORLD_HALF_SIZE || y > WORLD_HALF_SIZE) {
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

    const hpScale = 1 + Math.min(0.35, elapsedTime * 0.003);
    const speedScale = 1 + Math.min(0.35, elapsedTime * 0.0025);
    const touchDamage = BASE_ENEMY_DAMAGE + Math.floor(elapsedTime / 120);

    const typeHpMult = enemyType === "brute" ? 1.35 : enemyType === "bomber" ? 0.8 : 1.0;
    const typeSpeedMult = enemyType === "brute" ? 0.82 : enemyType === "bomber" ? 0.9 : 1.15;
    const typeTouchMult = enemyType === "brute" ? 1.35 : enemyType === "bomber" ? 0.85 : 1.0;

    enemies.push({
      id: enemyIdRef.value++,
      position: { x, y },
      type: enemyType,
      facing: 0,
      hp: BASE_ENEMY_HP * hpScale * typeHpMult,
      speed: BASE_ENEMY_SPEED * speedScale * typeSpeedMult,
      touchDamage: touchDamage * typeTouchMult,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldownRemaining:
        enemyType === "bomber" ? Math.random() * ENEMY_BOMBER_RANGED_COOLDOWN : 0,
    });
    return true;
  }

  // Fallback: try a random in-bounds point that's at least somewhat separated.
  for (let a = 0; a < 16; a += 1) {
    const x = -WORLD_HALF_SIZE + Math.random() * (WORLD_HALF_SIZE * 2);
    const y = -WORLD_HALF_SIZE + Math.random() * (WORLD_HALF_SIZE * 2);
    if (distance({ x, y }, playerPosition) < minDistFromPlayer) continue;
    const fallbackType = chooseEnemyType(elapsedTime);
    const typeHpMult = fallbackType === "brute" ? 1.35 : fallbackType === "bomber" ? 0.8 : 1.0;
    const typeSpeedMult = fallbackType === "brute" ? 0.82 : fallbackType === "bomber" ? 0.9 : 1.15;
    const typeTouchMult = fallbackType === "brute" ? 1.35 : fallbackType === "bomber" ? 0.85 : 1.0;

    enemies.push({
      id: enemyIdRef.value++,
      position: { x, y },
      type: fallbackType,
      facing: 0,
      hp: BASE_ENEMY_HP * typeHpMult,
      speed: BASE_ENEMY_SPEED * typeSpeedMult,
      touchDamage: BASE_ENEMY_DAMAGE * typeTouchMult,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldownRemaining:
        fallbackType === "bomber" ? Math.random() * ENEMY_BOMBER_RANGED_COOLDOWN : 0,
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

  const spawnInterval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - elapsedTime * 0.006);
  spawnTimerRef.value -= delta;

  while (spawnTimerRef.value <= 0 && enemies.length < cap) {
    spawnTimerRef.value += spawnInterval;
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime);
  }

  return 1 / spawnInterval;
}

export { getEnemyCap };
