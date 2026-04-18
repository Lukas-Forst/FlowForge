import type { EnemyType, UpgradeOption } from "./types";

// Endless ocean: gameplay uses unbounded world coordinates (x × y play plane → scene x × z).
// Legacy arena half-sizes kept only for tuning spawn/view heuristics where a nominal “combat radius” helps.
export const WORLD_HALF_WIDTH = 135;
export const WORLD_HALF_HEIGHT = 80;
/** @deprecated Use WORLD_HALF_WIDTH / WORLD_HALF_HEIGHT; kept for quick greps during migration. */
export const WORLD_HALF_SIZE = WORLD_HALF_WIDTH;

// Camera and spawning heuristics (world units; relative to player, not map edges)
export const CAMERA_VIEW_HALF = 62;
/** @deprecated Endless mode: camera no longer clamps to arena edges. */
export const CAMERA_EDGE_MARGIN_X = 48;
/** @deprecated Endless mode: camera no longer clamps to arena edges. */
export const CAMERA_EDGE_MARGIN_Z = 32;
export const SPAWN_OUTSIDE_VIEW_MIN_DIST = CAMERA_VIEW_HALF + 25;
export const MIN_ENEMY_SEPARATION = 2.8;

/** Drop projectiles when farther than this from the player (endless world has no map box). */
export const PROJECTILE_DESPAWN_DISTANCE_FROM_PLAYER = 140;

export const BASE_PLAYER_HP = 100;
export const BASE_PLAYER_SPEED = 9;

export const BASE_AUTO_ATTACK_INTERVAL = 0.55;
export const BASE_AUTO_ATTACK_DAMAGE = 24;
export const AUTO_ATTACK_SPEED = 20;

export const BASE_CANNON_COOLDOWN = 5;
export const CANNON_PROJECTILE_SPEED = 22;
export const CANNON_PROJECTILE_DAMAGE = 42;
export const CANNON_SALVO_COUNT = 5;
export const CANNON_SIDE_ORIGIN_OFFSET = 0.95;
export const CANNON_BROADSIDE_SPREAD_RADIANS = 0.45;

export const BASE_ENEMY_HP = 34;
export const BASE_ENEMY_SPEED = 3.25;
export const BASE_ENEMY_DAMAGE = 6;
export const ENEMY_TOUCH_COOLDOWN = 0.8;

export const BASE_SPAWN_INTERVAL = 0.82;
export const MIN_SPAWN_INTERVAL = 0.2;

export const BOOST_COOLDOWN = 4.5;
export const BOOST_ACTIVE_TIME = 0.22;
export const BOOST_SPEED_MULTIPLIER = 3.1;

export const COIN_PICKUP_RADIUS = 1.4;
export const PLAYER_HIT_RADIUS = 1.15;

/** Enemy ranged attack tuning (decorative islands stay non-collidable). */
export const ENEMY_RANGED_COOLDOWN: Record<EnemyType, number> = {
  corsair: 2.35,
  bomber: 1.65,
  brute: 3.1,
};
export const ENEMY_RANGED_SPEED: Record<EnemyType, number> = {
  corsair: 13,
  bomber: 21,
  brute: 10,
};
export const ENEMY_RANGED_DAMAGE: Record<EnemyType, number> = {
  corsair: 4,
  bomber: 3,
  brute: 7,
};
export const ENEMY_RANGED_RADIUS: Record<EnemyType, number> = {
  corsair: 0.26,
  bomber: 0.18,
  brute: 0.34,
};

export const UPGRADE_OPTIONS: Record<UpgradeOption["type"], UpgradeOption> = {
  fireRate: {
    type: "fireRate",
    label: "Powder Frenzy",
    description: "Increase base auto-fire rate by 22%.",
  },
  speed: {
    type: "speed",
    label: "Trade Winds",
    description: "Increase ship speed by 15%.",
  },
  cooldown: {
    type: "cooldown",
    label: "Swabbed Cannons",
    description: "Reduce cannon cooldown by 18%.",
  },
};
