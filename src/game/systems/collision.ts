import { BASE_AUTO_ATTACK_DAMAGE, ENEMY_TOUCH_COOLDOWN, PLAYER_HIT_RADIUS, PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER } from "../constants";
import { angleFromDirection, distance, normalize } from "../utils";
import { isEnemyProjectileKind, type AudioEvent, type EnemyState, type PickupState, type PlayerState, type ProjectileState, type VisualEffect, type HarvestableState } from "../types";

export interface CollisionResult {
  killsGained: number;
  eliteKillsGained: number;
  playerDamageTaken: number;
  spawnedPickups: PickupState[];
  cannonHits: number;
  maxHitDealt: number;
  critsGained: number; // enemy hits that were crits (>60 damage to player)
  critsDealt: number;  // player hits that were crits (>60 damage to enemies)
}

export function spawnHarvestableDrops(
  h: HarvestableState,
  spawnedPickups: PickupState[],
  pickupIdRef: { value: number },
  resourceMultiplier: number = 1,
  gemValueBonus: number = 0,
): void {
  const mult = Math.max(1, resourceMultiplier);
  const gemBonus = Math.max(0, gemValueBonus);
  const pushCoins = (count: number) => {
    const total = Math.max(1, Math.round(count * mult));
    for (let i = 0; i < total; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const offset = Math.random() * h.radius;
      spawnedPickups.push({
        id: pickupIdRef.value++,
        kind: "coin",
        position: { x: h.position.x + Math.cos(angle) * offset, y: h.position.y + Math.sin(angle) * offset },
        value: 1,
      });
    }
  };
  const pushGems = (count: number) => {
    const total = Math.max(1, Math.round(count * mult));
    for (let i = 0; i < total; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const offset = Math.random() * h.radius;
      spawnedPickups.push({
        id: pickupIdRef.value++,
        kind: "gem",
        position: { x: h.position.x + Math.cos(angle) * offset, y: h.position.y + Math.sin(angle) * offset },
        value: 1 + gemBonus,
      });
    }
  };

  switch (h.type) {
    case "abandoned_boat":
      pushCoins(10 + Math.floor(Math.random() * 6));
      break;
    case "scrap_raft":
      pushCoins(3 + Math.floor(Math.random() * 3));
      break;
    case "floating_cargo":
      pushCoins(8 + Math.floor(Math.random() * 5));
      break;
    case "derelict_steamer":
      pushCoins(40 + Math.floor(Math.random() * 21));
      break;
    case "anchor_cache":
      pushGems(2 + Math.floor(Math.random() * 3));
      break;
    case "sunken_galleon":
      pushCoins(120 + Math.floor(Math.random() * 61));
      break;
    case "treasure_chest":
      pushGems(8 + Math.floor(Math.random() * 5));
      break;
    default:
      pushCoins(3 + Math.floor(Math.random() * 3));
  }
}

const ENEMY_FACING_SMOOTHING = 8;

function angleDelta(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function pushEffect(
  effects: VisualEffect[],
  effectIdRef: { value: number },
  kind: VisualEffect["kind"],
  position: { x: number; y: number },
  duration: number,
  intensity?: number,
): void {
  effects.push({
    id: effectIdRef.value++,
    kind,
    position: { ...position },
    remaining: duration,
    ...(intensity !== undefined ? { intensity } : {}),
  });
}

function pushScreenShakeForDamage(
  effects: VisualEffect[],
  effectIdRef: { value: number },
  position: { x: number; y: number },
  damage: number,
  baseDuration = 0.3,
): void {
  // Scale shake intensity with damage relative to base auto attack damage
  const ratio = damage / BASE_AUTO_ATTACK_DAMAGE;
  let intensity = ratio;

  // Crits (>60 damage) get an extra 1.5x punch
  if (damage > 60) {
    intensity *= 1.5;
  }

  // Cap at 2.5x so big nukes don't tear the screen off
  intensity = Math.min(intensity, 2.5);

  pushEffect(effects, effectIdRef, "screenShake", position, baseDuration, intensity);
}

export function updateProjectileMotion(
  projectiles: ProjectileState[],
  playerPosition: { x: number; y: number },
  delta: number,
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
): void {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.position.x += projectile.velocity.x * delta;
    projectile.position.y += projectile.velocity.y * delta;
    projectile.ttl -= delta;

    const farFromPlayer = distance(projectile.position, playerPosition) > PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER;

    if (projectile.ttl <= 0 || farFromPlayer) {
      const splashKind = isEnemyProjectileKind(projectile.kind) ? "waterSplash" : "projectileSplash";
      pushEffect(visualEffects, effectIdRef, splashKind, projectile.position, 0.38);
      if (projectile.kind === "playerCannon" || projectile.kind === "enemyBrute") {
        pushEffect(visualEffects, effectIdRef, "waterRippleSmall", projectile.position, 0.38);
      }
      projectiles.splice(i, 1);
    }
  }
}

export function updateEnemyMovement(enemies: EnemyState[], player: PlayerState, delta: number): void {
  for (const enemy of enemies) {
    const distToPlayer = distance(player.position, enemy.position);
    let direction = { x: 0, y: 0 };
    
    if (distToPlayer > 0.01) {
      const rawDir = normalize({
        x: player.position.x - enemy.position.x,
        y: player.position.y - enemy.position.y,
      });

      if (enemy.type === "bomber" || enemy.type === "swarmer") {
        direction = rawDir;
      } else if (enemy.type === "brute") {
        if (distToPlayer >= 10) {
          direction = rawDir;
        }
      } else if (enemy.type === "sniper") {
        if (distToPlayer < 14) {
          direction = { x: -rawDir.x, y: -rawDir.y };
        } else if (distToPlayer > 16) {
          direction = rawDir;
        }
      } else if (enemy.type === "corsair") {
        if (distToPlayer < 7) {
          direction = { x: -rawDir.x, y: -rawDir.y };
        } else if (distToPlayer > 9) {
          direction = rawDir;
        } else {
          direction = { x: -rawDir.y, y: rawDir.x };
        }
      }
    }

    if (direction.x !== 0 || direction.y !== 0) {
      const targetFacing = angleFromDirection(direction);
      enemy.facing += angleDelta(targetFacing, enemy.facing) * Math.min(1, delta * ENEMY_FACING_SMOOTHING);
      
      enemy.position.x += direction.x * enemy.speed * delta;
      enemy.position.y += direction.y * enemy.speed * delta;
    }
    
    enemy.touchTimer -= delta;
    if (enemy.hitFlashTimer != null && enemy.hitFlashTimer > 0) {
      enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - delta);
    }
  }
}

export function resolveCollisions(
  player: PlayerState,
  enemies: EnemyState[],
  harvestables: HarvestableState[],
  projectiles: ProjectileState[],
  pickupIdRef: { value: number },
  visualEffects: VisualEffect[],
  effectIdRef: { value: number },
  audioEvents?: AudioEvent[],
  modifiers?: {
    hpDropBonusChance?: number;
    harvestResourceMultiplier?: number;
    harvestGemValueBonus?: number;
    ramDamageMultiplier?: number;
    ramReflectBonus?: number;
  },
): CollisionResult {
  const hpDropBonus = Math.max(0, modifiers?.hpDropBonusChance ?? 0);
  const harvestResourceMultiplier = Math.max(1, modifiers?.harvestResourceMultiplier ?? 1);
  const harvestGemValueBonus = Math.max(0, modifiers?.harvestGemValueBonus ?? 0);
  const ramDamageMultiplier = Math.max(1, modifiers?.ramDamageMultiplier ?? 1);
  const ramReflectBonus = Math.max(0, modifiers?.ramReflectBonus ?? 0);

  let killsGained = 0;
  let eliteKillsGained = 0;
  let playerDamageTaken = 0;
  let cannonHits = 0;
  let maxHitDealt = 0;
  let critsGained = 0;
  let critsDealt = 0;
  const spawnedPickups: PickupState[] = [];

  for (let projectileIdx = projectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = projectiles[projectileIdx];

    if (isEnemyProjectileKind(projectile.kind)) {
      if (distance(player.position, projectile.position) <= PLAYER_HIT_RADIUS + projectile.radius) {
        playerDamageTaken += projectile.damage;
        if (projectile.damage > 60) critsGained += 1;
        pushEffect(visualEffects, effectIdRef, "hitBurst", projectile.position, 0.22);
        pushScreenShakeForDamage(visualEffects, effectIdRef, player.position, projectile.damage, 0.35);
        if (audioEvents) {
          audioEvents.push({ id: effectIdRef.value++, sfx: "hit", position: projectile.position });
        }
        projectiles.splice(projectileIdx, 1);
      }
      continue;
    }

    let projectileConsumed = false;
    for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
      const enemy = enemies[enemyIdx];
      if (distance(enemy.position, projectile.position) <= projectile.radius + 0.65) {
        enemy.hp -= projectile.damage;
        maxHitDealt = Math.max(maxHitDealt, projectile.damage);
        if (projectile.kind === "playerCannon" || projectile.kind === "playerAuto") cannonHits += 1;
        const canPierce = (projectile.pierceRemaining ?? 0) > 0;
        projectileConsumed = !canPierce;
        if (canPierce) {
          projectile.pierceRemaining = (projectile.pierceRemaining ?? 0) - 1;
        }
        // Hit flash + knockback
        enemy.hitFlashTimer = 0.1;
        const knockDir = normalize({
          x: enemy.position.x - projectile.position.x,
          y: enemy.position.y - projectile.position.y,
        });
        const knockbackStrength = projectile.kind === "playerCannon" ? 0.9 : 0.45;
        enemy.position.x += knockDir.x * knockbackStrength;
        enemy.position.y += knockDir.y * knockbackStrength;
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.26);
        if (audioEvents) {
          audioEvents.push({ id: effectIdRef.value++, sfx: "hit", position: enemy.position });
        }
        
        const isCrit = projectile.damage > 60;
        if (isCrit) critsDealt += 1;
        const damageScale = projectile.damage > 80 ? 1.6 : projectile.damage > 60 ? 1.4 : projectile.damage > 40 ? 1.2 : projectile.damage > 20 ? 1.05 : 0.9;
        // Horizontal drift so rapid hits don't stack vertically — based on unique id to spread them
        const driftOffset = ((effectIdRef.value + projectile.id) % 11) * 0.12 - 0.6;
        visualEffects.push({
          id: effectIdRef.value++,
          kind: "damageNumber",
          position: { x: enemy.position.x + driftOffset, y: enemy.position.y },
          remaining: 0.9,
          text: projectile.damage.toString(),
          color: isCrit ? "#ff8c00" : "#ffffff",
          scale: damageScale,
          shake: isCrit,
        });

        // Screen shake scales with damage — big hits shake the camera harder
        pushScreenShakeForDamage(visualEffects, effectIdRef, player.position, projectile.damage, 0.25);

        if (enemy.hp <= 0) {
          killsGained += 1;
          if (enemy.isElite) {
            eliteKillsGained += 1;
          }
          enemies.splice(enemyIdx, 1);
          const deathKind = (() => {
            switch (enemy.type) {
              case "swarmer": return "enemyDeathSmall";
              case "brute": return "enemyDeathHeavy";
              case "bomber": return "enemyDeathExplosive";
              default: return "enemyDeath";
            }
          })();
          pushEffect(visualEffects, effectIdRef, deathKind as VisualEffect["kind"], enemy.position, 1.0);
          if (audioEvents) {
            audioEvents.push({ id: effectIdRef.value++, sfx: "ship_destroyed" });
          }
          const eliteHpDropBonus = enemy.isElite ? 0.04 : 0;
          const eliteGemDropBonus = enemy.isElite ? 0.13 : 0;
          const eliteCoinValueBonus = enemy.isElite ? 1 : 0;
          const roll = Math.random();
          if (roll < 0.03 + hpDropBonus + eliteHpDropBonus) {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "hp",
              position: { ...enemy.position },
              value: 10,
            });
          } else if (roll < 0.07 + eliteGemDropBonus) {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "gem",
              position: { ...enemy.position },
              value: 5,
            });
          } else {
            spawnedPickups.push({
              id: pickupIdRef.value++,
              kind: "coin",
              position: { ...enemy.position },
              value: 1 + eliteCoinValueBonus,
            });
          }
        }
        break;
      }
    }

    if (!projectileConsumed) {
      for (let hIdx = harvestables.length - 1; hIdx >= 0; hIdx -= 1) {
        const h = harvestables[hIdx];
        if (distance(h.position, projectile.position) <= projectile.radius + h.radius) {
          h.hp -= projectile.damage;
          maxHitDealt = Math.max(maxHitDealt, projectile.damage);
          if (projectile.kind === "playerCannon" || projectile.kind === "playerAuto") cannonHits += 1;
          projectileConsumed = true;
          pushEffect(visualEffects, effectIdRef, "hitBurst", h.position, 0.20);
          if (audioEvents) {
            audioEvents.push({ id: effectIdRef.value++, sfx: "hit", position: h.position });
          }
          
          visualEffects.push({
            id: effectIdRef.value++,
            kind: "damageNumber",
            position: { ...h.position },
            remaining: 0.8,
            text: projectile.damage.toString(),
            color: "#aaaaaa",
          });

          if (h.hp <= 0) {
            spawnHarvestableDrops(h, spawnedPickups, pickupIdRef, harvestResourceMultiplier, harvestGemValueBonus);
            harvestables.splice(hIdx, 1);
            pushEffect(visualEffects, effectIdRef, "waterSplash", h.position, 0.8);
            if (audioEvents) {
              audioEvents.push({ id: effectIdRef.value++, sfx: "harvestable_destroyed" });
            }
          }
          break;
        }
      }
    }

    if (projectileConsumed) {
      projectiles.splice(projectileIdx, 1);
    }
  }

  for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
    const enemy = enemies[enemyIdx];
    const touching = distance(enemy.position, player.position) <= PLAYER_HIT_RADIUS;
    
    if (touching) {
      if (enemy.type === "bomber") {
        playerDamageTaken += enemy.touchDamage * 2.5;
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.5);
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.45);
        enemies.splice(enemyIdx, 1);
      } else if (enemy.touchTimer <= 0) {
        playerDamageTaken += enemy.touchDamage;
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.3);
        enemy.touchTimer = ENEMY_TOUCH_COOLDOWN;
      }
      if (ramReflectBonus > 0) {
        enemy.hp -= (20 + playerDamageTaken * 0.4) * ramReflectBonus;
        if (enemy.hp <= 0) {
          killsGained += 1;
          if (enemy.isElite) {
            eliteKillsGained += 1;
          }
          enemies.splice(enemyIdx, 1);
          const deathKind = (() => {
            switch (enemy.type) {
              case "swarmer": return "enemyDeathSmall";
              case "brute": return "enemyDeathHeavy";
              case "bomber": return "enemyDeathExplosive";
              default: return "enemyDeath";
            }
          })();
          pushEffect(visualEffects, effectIdRef, deathKind as VisualEffect["kind"], enemy.position, 1.0);
        }
      }
    }
  }

  for (let hIdx = harvestables.length - 1; hIdx >= 0; hIdx -= 1) {
    const h = harvestables[hIdx];
    const touching = distance(h.position, player.position) <= PLAYER_HIT_RADIUS + h.radius;
    
    if (touching) {
      h.hp -= 50 * ramDamageMultiplier; 
      pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.25);
      pushEffect(visualEffects, effectIdRef, "hitBurst", h.position, 0.4);
      visualEffects.push({
        id: effectIdRef.value++,
        kind: "damageNumber",
        position: { ...h.position },
        remaining: 0.8,
        text: "RAM!",
        color: "#fffaaa",
      });

      if (h.hp <= 0) {
        spawnHarvestableDrops(h, spawnedPickups, pickupIdRef, harvestResourceMultiplier, harvestGemValueBonus);
        harvestables.splice(hIdx, 1);
        pushEffect(visualEffects, effectIdRef, "waterSplash", h.position, 0.8);
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.4);
        if (audioEvents) {
          audioEvents.push({ id: effectIdRef.value++, sfx: "harvestable_destroyed" });
        }
      }
    }
  }

  return { killsGained, eliteKillsGained, playerDamageTaken, spawnedPickups, cannonHits, maxHitDealt, critsGained, critsDealt };
}
