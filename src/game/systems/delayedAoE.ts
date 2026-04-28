import { distance } from "../utils";
import type { DelayedAoEState, EnemyState, PlayerState, VisualEffect } from "../types";

interface NumberRef {
  value: number;
}

interface DelayedAoEResult {
  enemyKills: number;
}

export function updateDelayedAoEs(
  delayedAoEs: DelayedAoEState[],
  enemies: EnemyState[],
  player: PlayerState,
  visualEffects: VisualEffect[],
  effectIdRef: NumberRef,
  delta: number,
): DelayedAoEResult {
  let enemyKills = 0;

  for (let i = delayedAoEs.length - 1; i >= 0; i -= 1) {
    const aoe = delayedAoEs[i];
    aoe.remaining -= delta;

    if (aoe.remaining > 0) {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "telegraphRing",
        position: { ...aoe.position },
        remaining: Math.min(0.18, aoe.remaining),
      });
      continue;
    }

    if (aoe.visualType === "depthCharge") {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "depthBurst",
        position: { ...aoe.position },
        remaining: 0.65,
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "screenShake",
        position: { ...aoe.position },
        remaining: 0.28,
      });
    } else {
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "hitBurst",
        position: { ...aoe.position },
        remaining: 0.35,
        color: aoe.source === "player" ? "#7bd3ff" : "#ff7a66",
      });
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "screenShake",
        position: { ...aoe.position },
        remaining: 0.14,
      });
    }

    if (aoe.source === "player") {
      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        if (distance(enemy.position, aoe.position) > aoe.radius) continue;
        enemy.hp -= aoe.damage;
        if (enemy.hp <= 0) {
          enemies.splice(e, 1);
          enemyKills += 1;
        }
      }
    } else if (distance(player.position, aoe.position) <= aoe.radius) {
      player.hp = Math.max(0, player.hp - aoe.damage);
    }

    delayedAoEs.splice(i, 1);
  }

  return { enemyKills };
}
