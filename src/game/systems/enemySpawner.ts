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
<<<<<<< HEAD
import type { EnemyState, EnemyType, GameSnapshot } from "../types";
import { getEliteSpawnChance } from "./runArc";
=======
import type { EnemyState, EnemyType } from "../types";
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

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

<<<<<<< HEAD
export type RunSpawnPhase = GameSnapshot["runClock"]["phase"];

/** Whether a newly spawned ship should be an elite (stronger + gold tint). */
export function rollSpawnIsElite(elapsedRunSeconds: number, phase: RunSpawnPhase): boolean {
  if (phase === "lull" || phase === "boss") return false;
  if (phase === "elite") return true;
  return Math.random() < getEliteSpawnChance(elapsedRunSeconds);
}

=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
function getEnemyCap(elapsedTimeSec: number, phase: "wave" | "elite" | "lull" | "boss"): number {
  if (phase === "boss") return 0;
  if (phase === "lull") return 2;

  if (elapsedTimeSec < 30) return 6;
  if (elapsedTimeSec < 60) return 8;
  if (elapsedTimeSec < 90) return 10;
  const after = elapsedTimeSec - 90;
  const ramp = Math.floor(after / 15);
  return Math.min(16, 10 + ramp);
}

function spawnEnemyOutsideCamera(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  playerPosition: { x: number; y: number },
  elapsedTime: number,
<<<<<<< HEAD
  runPhase: RunSpawnPhase,
=======
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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

<<<<<<< HEAD
    const isElite = rollSpawnIsElite(elapsedTime, runPhase);
    const hpScale = (1 + Math.min(0.55, elapsedTime * 0.004)) * (isElite ? 1.65 : 1);
    const speedAdd = Math.min(1.6, elapsedTime * 0.008) + (isElite ? 0.45 : 0);
    const speed = BASE_ENEMY_SPEED + speedAdd;
    const touchDamage = Math.floor((BASE_ENEMY_DAMAGE + Math.floor(elapsedTime / 60)) * (isElite ? 1.22 : 1));
=======
    const hpScale = 1 + Math.min(0.55, elapsedTime * 0.004);
    const speedScale = Math.min(1.6, elapsedTime * 0.008);
    const touchDamage = BASE_ENEMY_DAMAGE + Math.floor(elapsedTime / 60);
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
    const toPlayer = {
      x: playerPosition.x - x,
      y: playerPosition.y - y,
    };

    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(elapsedTime),
<<<<<<< HEAD
      isElite,
=======
      isElite: false,
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
      position: { x, y },
      facing: angleFromDirection(toPlayer),
      hp: BASE_ENEMY_HP * hpScale,
      maxHp: BASE_ENEMY_HP * hpScale,
<<<<<<< HEAD
      speed,
      touchDamage,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: (0.35 + Math.random() * 1.1) * (isElite ? 0.88 : 1),
=======
      speed: BASE_ENEMY_SPEED + speedScale,
      touchDamage,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: 0.35 + Math.random() * 1.1,
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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
<<<<<<< HEAD
    const isElite = rollSpawnIsElite(elapsedTime, runPhase);
    const hpMul = (isElite ? 1.65 : 1) * (1 + Math.min(0.55, elapsedTime * 0.004));
    const speedAdd = Math.min(1.6, elapsedTime * 0.008) + (isElite ? 0.45 : 0);
    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(elapsedTime),
      isElite,
      position: { x, y },
      facing: angleFromDirection(toPlayer),
      hp: BASE_ENEMY_HP * hpMul,
      maxHp: BASE_ENEMY_HP * hpMul,
      speed: BASE_ENEMY_SPEED + speedAdd,
      touchDamage: Math.floor((BASE_ENEMY_DAMAGE + Math.floor(elapsedTime / 60)) * (isElite ? 1.22 : 1)),
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: (0.4 + Math.random() * 0.9) * (isElite ? 0.88 : 1),
=======
    enemies.push({
      id: enemyIdRef.value++,
      type: pickEnemyType(elapsedTime),
      isElite: false,
      position: { x, y },
      facing: angleFromDirection(toPlayer),
      hp: BASE_ENEMY_HP,
      maxHp: BASE_ENEMY_HP,
      speed: BASE_ENEMY_SPEED,
      touchDamage: BASE_ENEMY_DAMAGE,
      touchTimer: ENEMY_TOUCH_COOLDOWN,
      rangedCooldown: 0.4 + Math.random() * 0.9,
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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
<<<<<<< HEAD
  runPhase: RunSpawnPhase = "wave",
): void {
  let guard = 64;
  while (enemies.length < desiredCap && guard-- > 0) {
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime, runPhase);
=======
): void {
  let guard = 64;
  while (enemies.length < desiredCap && guard-- > 0) {
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime);
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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
<<<<<<< HEAD
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime, phase);
=======
    spawnEnemyOutsideCamera(enemies, enemyIdRef, playerPosition, elapsedTime);
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  }

  return 1 / spawnInterval;
}

export { getEnemyCap };
