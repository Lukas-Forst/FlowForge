import { distance } from "../utils";
import type { EnemyState, OilSlickState, VisualEffect } from "../types";
import { OIL_SLICK_DOT_DAMAGE, OIL_SLICK_DOT_INTERVAL } from "../constants";

interface NumberRef {
  value: number;
}

interface OilSlickResult {
  enemyKills: number;
}

export function updateOilSlicks(
  oilSlicks: OilSlickState[],
  enemies: EnemyState[],
  visualEffects: VisualEffect[],
  effectIdRef: NumberRef,
  delta: number,
): OilSlickResult {
  let enemyKills = 0;

  for (let i = oilSlicks.length - 1; i >= 0; i -= 1) {
    const slick = oilSlicks[i];
    slick.remaining -= delta;

    if (slick.remaining <= 0) {
      oilSlicks.splice(i, 1);
      continue;
    }

    slick.dotTimer -= delta;
    if (slick.dotTimer <= 0) {
      slick.dotTimer = OIL_SLICK_DOT_INTERVAL;
      for (let e = enemies.length - 1; e >= 0; e -= 1) {
        const enemy = enemies[e];
        if (distance(enemy.position, slick.position) > slick.radius) continue;
        enemy.hp -= OIL_SLICK_DOT_DAMAGE;
        if (enemy.hp <= 0) {
          enemies.splice(e, 1);
          enemyKills += 1;
        } else {
          visualEffects.push({
            id: effectIdRef.value++,
            kind: "waterRippleSmall",
            position: { ...enemy.position },
            remaining: 0.28,
          });
        }
      }
    }
  }

  return { enemyKills };
}
