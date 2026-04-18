import { CAMERA_VIEW_HALF } from "../constants";
import type { EnemyState, ProjectileState, VisualEffect } from "../types";

export function updateBossEncounter(
  enemies: EnemyState[],
  enemyIdRef: { value: number },
  phase: "wave" | "elite" | "lull" | "boss",
  phaseTime: number,
  playerPosition: { x: number; y: number },
  elapsedTotal: number,
): void {
  if (phase !== "boss") return;

  const hasBoss = enemies.some((e) => e.type === "boss");
  if (!hasBoss && phaseTime < 1.0) {
    const hp = 600 + Math.floor(elapsedTotal / 60) * 350;
    
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = CAMERA_VIEW_HALF + 15;
    const x = playerPosition.x + Math.cos(spawnAngle) * spawnDist;
    const y = playerPosition.y + Math.sin(spawnAngle) * spawnDist;

    enemies.push({
      id: enemyIdRef.value++,
      type: "boss",
      position: { x, y },
      facing: spawnAngle + Math.PI,
      hp: hp,
      maxHp: hp,
      speed: 6.5,
      touchDamage: 50,
      touchTimer: 1.0,
      rangedCooldown: 3.5,
    });
  }
}

export function runBossAttacks(
  enemies: EnemyState[],
  _player: { position: { x: number; y: number } },
  projectileIdRef: { value: number },
  projectiles: ProjectileState[],
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  delta: number,
): void {
  for (const enemy of enemies) {
    if (enemy.type !== "boss") continue;

    enemy.rangedCooldown -= delta;
    
    // Boss signals early so the player can reposition
    if (enemy.rangedCooldown < 1.2 && enemy.rangedCooldown + delta >= 1.2) {
       visualEffects.push({
          id: effectIdRef.value++,
          kind: "telegraphRing",
          position: { ...enemy.position },
          remaining: 1.2,
       });
    }

    if (enemy.rangedCooldown <= 0) {
       // Radial burst
       const numProjectiles = 16;
       for (let i = 0; i < numProjectiles; i++) {
         const angle = (i / numProjectiles) * Math.PI * 2;
         const speed = 16;
         const spawnLead = 1.0;
         const vx = Math.cos(angle);
         const vy = Math.sin(angle);

         projectiles.push({
           id: projectileIdRef.value++,
           kind: "enemyBoss",
           position: {
             x: enemy.position.x + vx * spawnLead,
             y: enemy.position.y + vy * spawnLead,
           },
           velocity: { x: vx * speed, y: vy * speed },
           ttl: 5.0,
           damage: 20,
           radius: 0.5,
         });
       }
       
       visualEffects.push({
          id: effectIdRef.value++,
          kind: "screenShake",
          position: { ...enemy.position },
          remaining: 0.6,
       });

       enemy.rangedCooldown = 4.5;
    }
  }
}
