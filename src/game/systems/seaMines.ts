import {
  SEA_MINE_ARMING_TIME,
  SEA_MINE_DAMAGE,
  SEA_MINE_DRIFT_SPEED,
  SEA_MINE_DROP_COUNT,
  SEA_MINE_LIFETIME,
  SEA_MINE_RADIUS,
} from "../constants";
import { distance } from "../utils";
import type { EnemyState, MineState, PlayerState, VisualEffect } from "../types";

interface NumberRef {
  value: number;
}

interface SeaMineResult {
  enemyKills: number;
}

export function spawnSeaMinesBehindPlayer(
  mines: MineState[],
  player: PlayerState,
  mineIdRef: NumberRef,
  stackCount: number,
): void {
  const count = Math.max(SEA_MINE_DROP_COUNT, SEA_MINE_DROP_COUNT + (Math.max(0, stackCount - 1) * 1));
  const backward = { x: -Math.cos(player.facing), y: -Math.sin(player.facing) };
  const side = { x: -backward.y, y: backward.x };

  for (let i = 0; i < count; i += 1) {
    const lane = i - (count - 1) / 2;
    const sideOffset = lane * 1.2;
    const trailing = 1.9 + Math.abs(lane) * 0.25;
    mines.push({
      id: mineIdRef.value++,
      position: {
        x: player.position.x + backward.x * trailing + side.x * sideOffset,
        y: player.position.y + backward.y * trailing + side.y * sideOffset,
      },
      velocity: {
        x: backward.x * SEA_MINE_DRIFT_SPEED,
        y: backward.y * SEA_MINE_DRIFT_SPEED,
      },
      armingRemaining: SEA_MINE_ARMING_TIME,
      lifetimeRemaining: SEA_MINE_LIFETIME,
      radius: SEA_MINE_RADIUS,
      damage: SEA_MINE_DAMAGE,
    });
  }
}

export function updateSeaMines(
  mines: MineState[],
  enemies: EnemyState[],
  visualEffects: VisualEffect[],
  effectIdRef: NumberRef,
  delta: number,
): SeaMineResult {
  let enemyKills = 0;

  for (let i = mines.length - 1; i >= 0; i -= 1) {
    const mine = mines[i];
    mine.position.x += mine.velocity.x * delta;
    mine.position.y += mine.velocity.y * delta;
    mine.armingRemaining = Math.max(0, mine.armingRemaining - delta);
    mine.lifetimeRemaining -= delta;

    if (mine.armingRemaining > 0) {
      continue;
    }

    let triggered = false;
    for (let e = 0; e < enemies.length; e += 1) {
      if (distance(enemies[e].position, mine.position) <= 0.9) {
        triggered = true;
        break;
      }
    }

    if (!triggered && mine.lifetimeRemaining > 0) {
      continue;
    }

    visualEffects.push({
      id: effectIdRef.value++,
      kind: "hitBurst",
      position: { ...mine.position },
      remaining: 0.4,
      color: "#9be870",
    });

    for (let e = enemies.length - 1; e >= 0; e -= 1) {
      const enemy = enemies[e];
      if (distance(enemy.position, mine.position) > mine.radius) continue;
      enemy.hp -= mine.damage;
      if (enemy.hp <= 0) {
        enemies.splice(e, 1);
        enemyKills += 1;
      }
    }

    mines.splice(i, 1);
  }

  return { enemyKills };
}
