import { BASE_AUTO_ATTACK_DAMAGE, ENEMY_TOUCH_COOLDOWN, PLAYER_HIT_RADIUS, PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER } from "../constants";
import { angleFromDirection, distance, normalize } from "../utils";
import { isEnemyProjectileKind, type AudioEvent, type EnemyState, type PickupState, type PlayerState, type ProjectileState, type VisualEffect, type HarvestableState, type VisualEffectKind } from "../types";

// Minimal pooled effect factory — reuses a pool stored in useGameState to avoid GC churn.
export function getVisualEffect(
  id: number,
  kind: VisualEffectKind,
  position: { x: number; y: number },
  remaining: number,
  extras?: { text?: string; color?: string; scale?: number; intensity?: number; shake?: boolean; drift?: number },
): VisualEffect {
  return {
    id,
    kind,
    position: { x: position.x, y: position.y },
    remaining,
    ...(extras?.text !== undefined ? { text: extras.text } : {}),
    ...(extras?.color !== undefined ? { color: extras.color } : {}),
    ...(extras?.scale !== undefined ? { scale: extras.scale } : {}),
    ...(extras?.intensity !== undefined ? { intensity: extras.intensity } : {}),
    ...(extras?.shake !== undefined ? { shake: extras.shake } : {}),
    ...(extras?.drift !== undefined ? { drift: extras.drift } : {}),
  };
}

export interface CollisionResult {
  killsGained: number;
  eliteKillsGained: number;
  playerDamageTaken: number;
  invulnBlocked: boolean; // true when player was hit but damage was zeroed by invuln
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
const COLLISION_CELL_SIZE = 3.2;

function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function toCell(value: number): number {
  return Math.floor(value / COLLISION_CELL_SIZE);
}

function buildSpatialBuckets<T extends { position: { x: number; y: number } }>(items: T[]): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = cellKey(toCell(item.position.x), toCell(item.position.y));
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(key, [item]);
    }
  }
  return buckets;
}

function forEachNearbyBucketItem<T>(
  buckets: Map<string, T[]>,
  x: number,
  y: number,
  fn: (item: T) => boolean, // return false to stop early
): void {
  const cellX = toCell(x);
  const cellY = toCell(y);
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      const bucket = buckets.get(cellKey(cellX + ox, cellY + oy));
      if (bucket) {
        for (let i = 0; i < bucket.length; i += 1) {
          const item = bucket[i];
          const shouldContinue = fn(item);
          if (!shouldContinue) return;
        }
      }
    }
  }
}

function dist2(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

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
  extras?: { text?: string; color?: string; scale?: number; shake?: boolean; drift?: number },
): void {
  effects.push(getVisualEffect(effectIdRef.value++, kind, position, duration, { intensity, ...extras }));
}

export function pushScreenShakeForDamage(
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
  reclaimProjectile?: (p: ProjectileState) => void,
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
      if (reclaimProjectile) {
        reclaimProjectile(projectile);
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
  playerInvulnerable = false,
): CollisionResult {
  const hpDropBonus = Math.max(0, modifiers?.hpDropBonusChance ?? 0);
  const harvestResourceMultiplier = Math.max(1, modifiers?.harvestResourceMultiplier ?? 1);
  const harvestGemValueBonus = Math.max(0, modifiers?.harvestGemValueBonus ?? 0);
  const ramDamageMultiplier = Math.max(1, modifiers?.ramDamageMultiplier ?? 1);
  const ramReflectBonus = Math.max(0, modifiers?.ramReflectBonus ?? 0);

  let killsGained = 0;
  let eliteKillsGained = 0;
  let playerDamageTaken = 0;
  // Damage amount that would have been dealt if invulnerability wasn't active.
  // Used for effects like ram reflection so invuln doesn't unintentionally reduce them.
  let playerDamageBlockedForReflect = 0;
  let invulnBlocked = false;
  let cannonHits = 0;
  let maxHitDealt = 0;
  let critsGained = 0;
  let critsDealt = 0;
  const spawnedPickups: PickupState[] = [];
  // Defer removals to avoid repeated index lookups during hot collision resolution.
  const enemiesToRemove = new Set<EnemyState>();
  const harvestablesToRemove = new Set<HarvestableState>();
  const enemyBuckets = buildSpatialBuckets(enemies);
  const harvestableBuckets = buildSpatialBuckets(harvestables);

  for (let projectileIdx = projectiles.length - 1; projectileIdx >= 0; projectileIdx -= 1) {
    const projectile = projectiles[projectileIdx];

    if (isEnemyProjectileKind(projectile.kind)) {
      const playerHitRadius = PLAYER_HIT_RADIUS + projectile.radius;
      if (dist2(player.position.x, player.position.y, projectile.position.x, projectile.position.y) <= playerHitRadius * playerHitRadius) {
        if (playerInvulnerable && projectile.damage > 0) {
          invulnBlocked = true;
          playerDamageBlockedForReflect += projectile.damage;
        } else {
          playerDamageTaken += projectile.damage;
        }
        if (audioEvents) {
          audioEvents.push({ id: effectIdRef.value++, sfx: "hit", position: projectile.position });
        }
        pushEffect(visualEffects, effectIdRef, "hitBurst", projectile.position, 0.22);
        pushScreenShakeForDamage(visualEffects, effectIdRef, player.position, projectile.damage, 0.35);
        projectiles.splice(projectileIdx, 1);
      }
      continue;
    }

    let projectileConsumed = false;
    const projectileHitRadius = projectile.radius + 0.65;
    forEachNearbyBucketItem(enemyBuckets, projectile.position.x, projectile.position.y, (enemy) => {
      if (enemy.hp <= 0) return true;
      if (dist2(enemy.position.x, enemy.position.y, projectile.position.x, projectile.position.y) <= projectileHitRadius * projectileHitRadius) {
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
        const damageScale =
          projectile.damage > 80
            ? 1.6
            : projectile.damage > 60
              ? 1.4
              : projectile.damage > 40
                ? 1.2
                : projectile.damage > 20
                  ? 1.05
                  : 0.9;
        // Horizontal drift so rapid hits don't stack vertically — based on unique id to spread them
        const driftOffset = ((effectIdRef.value + projectile.id) % 11) * 0.12 - 0.6;
        visualEffects.push(
          getVisualEffect(
            effectIdRef.value++,
            "damageNumber",
            { x: enemy.position.x + driftOffset, y: enemy.position.y },
            0.9,
            {
              text: projectile.damage.toString(),
              color: isCrit ? "#ff8c00" : "#ffffff",
              scale: damageScale,
              shake: isCrit,
            },
          ),
        );

        // Screen shake scales with damage — big hits shake the camera harder
        pushScreenShakeForDamage(visualEffects, effectIdRef, player.position, projectile.damage, 0.25);

        if (enemy.hp <= 0) {
          killsGained += 1;
          if (enemy.isElite) {
            eliteKillsGained += 1;
          }
          enemiesToRemove.add(enemy);
          const deathKind = (() => {
            switch (enemy.type) {
              case "swarmer":
                return "enemyDeathSmall";
              case "brute":
                return "enemyDeathHeavy";
              case "bomber":
                return "enemyDeathExplosive";
              default:
                return "enemyDeath";
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
        // Projectiles only hit one entity per sim tick.
        return false;
      }
      return true;
    });

    if (!projectileConsumed) {
      forEachNearbyBucketItem(harvestableBuckets, projectile.position.x, projectile.position.y, (h) => {
        if (h.hp <= 0) return true;
        const harvestHitRadius = projectile.radius + h.radius;
        if (dist2(h.position.x, h.position.y, projectile.position.x, projectile.position.y) <= harvestHitRadius * harvestHitRadius) {
          h.hp -= projectile.damage;
          maxHitDealt = Math.max(maxHitDealt, projectile.damage);
          if (projectile.kind === "playerCannon" || projectile.kind === "playerAuto") cannonHits += 1;
          projectileConsumed = true;
          pushEffect(visualEffects, effectIdRef, "hitBurst", h.position, 0.20);
          if (audioEvents) {
            audioEvents.push({ id: effectIdRef.value++, sfx: "hit", position: h.position });
          }
          visualEffects.push(getVisualEffect(effectIdRef.value++, "damageNumber", { ...h.position }, 0.8, {
            text: projectile.damage.toString(),
            color: "#aaaaaa",
          }));

          if (h.hp <= 0) {
            spawnHarvestableDrops(h, spawnedPickups, pickupIdRef, harvestResourceMultiplier, harvestGemValueBonus);
            harvestablesToRemove.add(h);
            pushEffect(visualEffects, effectIdRef, "waterSplash", h.position, 0.8);
            if (audioEvents) {
              audioEvents.push({ id: effectIdRef.value++, sfx: "harvestable_destroyed" });
            }
          }
          // Projectiles only hit one entity per sim tick.
          return false;
        }
        return true;
      });
    }

    if (projectileConsumed) {
      projectiles.splice(projectileIdx, 1);
    }
  }

  for (let enemyIdx = enemies.length - 1; enemyIdx >= 0; enemyIdx -= 1) {
    const enemy = enemies[enemyIdx];
    if (enemy.hp <= 0) continue; // killed earlier this tick
    const touching = dist2(enemy.position.x, enemy.position.y, player.position.x, player.position.y) <= PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS;
    
    if (touching) {
      if (enemy.type === "bomber") {
        const damage = enemy.touchDamage * 2.5;
        if (playerInvulnerable) {
          invulnBlocked = true;
          playerDamageBlockedForReflect += damage;
        } else {
          playerDamageTaken += damage;
        }
        pushEffect(visualEffects, effectIdRef, "hitBurst", enemy.position, 0.5);
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.45);
        enemiesToRemove.add(enemy);
      } else if (enemy.touchTimer <= 0) {
        if (playerInvulnerable) {
          invulnBlocked = true;
          playerDamageBlockedForReflect += enemy.touchDamage;
        } else {
          playerDamageTaken += enemy.touchDamage;
        }
        pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.3);
        enemy.touchTimer = ENEMY_TOUCH_COOLDOWN;
      }
      if (ramReflectBonus > 0) {
        enemy.hp -= (20 + playerDamageBlockedForReflect * 0.4) * ramReflectBonus;
        if (enemy.hp <= 0) {
          killsGained += 1;
          if (enemy.isElite) {
            eliteKillsGained += 1;
          }
          enemiesToRemove.add(enemy);
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
    if (h.hp <= 0) continue; // killed earlier this tick
    const hitRadius = PLAYER_HIT_RADIUS + h.radius;
    const touching = dist2(h.position.x, h.position.y, player.position.x, player.position.y) <= hitRadius * hitRadius;
    
    if (touching) {
      h.hp -= 50 * ramDamageMultiplier;
      pushEffect(visualEffects, effectIdRef, "screenShake", player.position, 0.25);
      pushEffect(visualEffects, effectIdRef, "hitBurst", h.position, 0.4);
      visualEffects.push(getVisualEffect(effectIdRef.value++, "damageNumber", { ...h.position }, 0.8, {
        text: "RAM!",
        color: "#fffaaa",
      }));

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

  // Final sweep for deferred removals.
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemiesToRemove.has(enemies[i])) {
      enemies.splice(i, 1);
    }
  }
  for (let i = harvestables.length - 1; i >= 0; i -= 1) {
    if (harvestablesToRemove.has(harvestables[i])) {
      harvestables.splice(i, 1);
    }
  }

  return { killsGained, eliteKillsGained, playerDamageTaken, invulnBlocked, spawnedPickups, cannonHits, maxHitDealt, critsGained, critsDealt };
}

