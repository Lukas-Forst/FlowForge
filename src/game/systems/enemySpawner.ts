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
} from "../constants";
import { angleFromDirection, distance } from "../utils";
import type { EnemyState, EnemyType } from "../types";

function pickEnemyType(elapsedTimeSec: number): EnemyType {
  const roll = Math.random();

  if (elapsedTimeSec < 30) {
    if (roll < 0.6) return "swarmer";
    return "corsair";
  }
  if (elapsedTimeSec < 60) {
    if (roll < 0.3) return "swarmer";
    if (roll < 0.7) return "corsair";
    return "brute";
  }
  if (elapsedTimeSec < 150) {
    if (roll < 0.25) return "swarmer";
    if (roll < 0.5) return "corsair";
    if (roll < 0.8) return "bomber";
    return "brute";
  }
  if (roll < 0.2) return "swarmer";
  if (roll < 0.45) return "corsair";
  if (roll < 0.7) return "bomber";
  if (roll < 0.85) return "sniper";
  return "brute";
}

function getEnemyCap(elapsedTimeSec: number, phase: "wave" | "elite" | "lull" | "boss"): number {
  if (phase === "boss") return 0;
  if (phase === "lull") return 2;

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
    const toPlayer = {
      x: playerPosition.x - x,
      y: playerPosition.y - y,
    };

    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(elapsedTime),
      position: { x, y },
      facing: angleFromDirection(toPlayer),
      hp: BASE_ENEMY_HP * hpScale,
      maxHp: BASE_ENEMY_HP * hpScale,
      speed: BASE_ENEMY_SPEED + speedScale,
      touchDamage,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: 0.35 + Math.random() * 1.1,
    });
    return true;
  }

  // Fallback: another annulus sample (no map box in endless mode).
  for (let a = 0; a < 24; a += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
    const x = playerPosition.x + Math.cos(angle) * radius;
    const y = playerPosition.y + Math.sin(angle) * radius;
    if (distance({ x, y }, playerPosition) < minDistFromPlayer) continue;
    const toPlayer = {
      x: playerPosition.x - x,
      y: playerPosition.y - y,
    };
    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(elapsedTime),
      position: { x, y },
      facing: angleFromDirection(toPlayer),
      hp: BASE_ENEMY_HP,
      maxHp: BASE_ENEMY_HP,
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
  phase: "wave" | "elite" | "lull" | "boss",
): number {
  const cap = getEnemyCap(elapsedTime, phase);
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
