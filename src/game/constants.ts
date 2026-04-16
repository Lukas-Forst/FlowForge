import type { UpgradeOption } from "./types";

// v1 world bounds (approx 400 x 400)
export const WORLD_HALF_SIZE = 200;
export const WORLD_SIZE = WORLD_HALF_SIZE * 2;

// Camera and spawning heuristics (world units)
export const CAMERA_VIEW_HALF = 80;
export const CAMERA_EDGE_MARGIN = 90;
export const SPAWN_OUTSIDE_VIEW_MIN_DIST = CAMERA_VIEW_HALF + 25;
export const MIN_ENEMY_SEPARATION = 2.8;

// Projectile despawn: remove once outside expanded map bounds.
export const PROJECTILE_DESPAWN_PADDING = 15;

export const BASE_PLAYER_HP = 100;
export const BASE_PLAYER_SPEED = 9;

export const BASE_AUTO_ATTACK_INTERVAL = 0.55;
export const BASE_AUTO_ATTACK_DAMAGE = 24;
export const AUTO_ATTACK_SPEED = 18;

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
