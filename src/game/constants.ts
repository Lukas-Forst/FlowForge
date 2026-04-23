import type { EnemyType, UpgradeOption, UpgradeType } from "./types";

export const EVOLUTION_UPGRADE_TYPES: readonly UpgradeType[] = [
  "deathBlossom",
  "ghostTide",
  "ironclad",
  "tidalSweep",
  "hellfireWake",
];

export const WORLD_HALF_WIDTH = 135;
export const WORLD_HALF_HEIGHT = 80;
export const WORLD_HALF_SIZE = WORLD_HALF_WIDTH;

export const CAMERA_VIEW_HALF = 62;
export const CAMERA_EDGE_MARGIN_X = 48;
export const CAMERA_EDGE_MARGIN_Z = 32;
export const SPAWN_OUTSIDE_VIEW_MIN_DIST = CAMERA_VIEW_HALF + 25;
export const MIN_ENEMY_SEPARATION = 2.8;

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

export const ENEMY_RANGED_COOLDOWN: Record<EnemyType, number> = {
  corsair: 2.35,
  bomber: 1.65,
  brute: 3.1,
  swarmer: 0,
  sniper: 5.5,
  boss: 3.0,
  shore_battery: 4.0,
};
export const ENEMY_RANGED_SPEED: Record<EnemyType, number> = {
  corsair: 13,
  bomber: 21,
  brute: 10,
  swarmer: 0,
  sniper: 28,
  boss: 16,
  shore_battery: 15,
};
export const ENEMY_RANGED_DAMAGE: Record<EnemyType, number> = {
  corsair: 4,
  bomber: 3,
  brute: 7,
  swarmer: 0,
  sniper: 9,
  boss: 18,
  shore_battery: 8,
};
export const ENEMY_RANGED_RADIUS: Record<EnemyType, number> = {
  corsair: 0.26,
  bomber: 0.18,
  brute: 0.34,
  swarmer: 0,
  sniper: 0.15,
  boss: 0.4,
  shore_battery: 0.35,
};

export const UPGRADE_OPTIONS: Record<UpgradeOption["type"], UpgradeOption> = {
  fireRate: { type: "fireRate", label: "Powder Frenzy", description: "Increase base auto-fire rate by 22%.", rarity: "common", maxStacks: 5 },
  speed: { type: "speed", label: "Trade Winds", description: "Increase ship speed by 15%.", rarity: "common", maxStacks: 4 },
  cooldown: { type: "cooldown", label: "Swabbed Cannons", description: "Reduce cannon cooldown by 18%.", rarity: "common", maxStacks: 4 },
  maxHp: { type: "maxHp", label: "Hull Reinforcement", description: "Increase max HP by 25 and heal to full.", rarity: "common", maxStacks: 3 },
  projectileCount: { type: "projectileCount", label: "Twin Cannons", description: "Add an extra forward auto-shot.", rarity: "uncommon", maxStacks: 3 },
  sideGuns: { type: "sideGuns", label: "Broadside Volley", description: "Passive port and starboard shots.", rarity: "uncommon", maxStacks: 2 },
  pierce: { type: "pierce", label: "Armor Piercing", description: "Auto-shots pierce 1 extra enemy.", rarity: "uncommon", maxStacks: 2 },
  coinMagnet: { type: "coinMagnet", label: "Salvage Net", description: "Increase coin pickup radius.", rarity: "uncommon", maxStacks: 2 },
  armor: { type: "armor", label: "Iron Plating", description: "Reduce damage taken by 15%.", rarity: "uncommon", maxStacks: 3 },
  boostRepeat: { type: "boostRepeat", label: "Second Wind", description: "Boost cooldown -40%, active time +50%.", rarity: "rare", maxStacks: 1 },
  cannonSpread: { type: "cannonSpread", label: "Shrapnel Blast", description: "Cannon salvo size +2, wider arc.", rarity: "rare", maxStacks: 2 },
  fullSteam: { type: "fullSteam", label: "Full Steam Ahead", description: "Auto-fire doubled while boost is active.", rarity: "epic", maxStacks: 1 },
  grapeshot: { type: "grapeshot", label: "Grapeshot", description: "Shots split into 3 on hit. (WIP: stacks tracked.)", rarity: "rare", maxStacks: 2 },
  sternChaser: { type: "sternChaser", label: "Stern Chaser", description: "Adds a rear-firing auto-shot. (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 2 },
  explosiveRounds: { type: "explosiveRounds", label: "Explosive Rounds", description: "Shots detonate on impact (small AoE). (WIP: stacks tracked.)", rarity: "rare", maxStacks: 2 },
  ramProw: { type: "ramProw", label: "Ram Prow", description: "Ramming deals damage (scales with speed). (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 2 },
  ghostHull: { type: "ghostHull", label: "Ghost Hull", description: "Brief invuln after each boost. (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 1 },
  afterburner: { type: "afterburner", label: "Afterburner", description: "Boost leaves a burning damage trail. (WIP: stacks tracked.)", rarity: "rare", maxStacks: 2 },
  bilgePump: { type: "bilgePump", label: "Bilge Pump", description: "Regenerate 1 HP per second. (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 2 },
  scavenger: { type: "scavenger", label: "Scavenger", description: "Kills: 15% chance to drop an HP pickup. (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 2 },
  sacrificeRig: { type: "sacrificeRig", label: "Sacrifice Rig", description: "Spend 20 HP for a double resource burst. (WIP: stacks tracked.)", rarity: "rare", maxStacks: 1 },
  deepDredge: { type: "deepDredge", label: "Deep Dredge", description: "Loot nodes drop 2× resources. (WIP: stacks tracked.)", rarity: "uncommon", maxStacks: 2 },
  crowsNest: { type: "crowsNest", label: "Crow's Nest", description: "Loot nodes flash a gold pulse. (WIP: stacks tracked.)", rarity: "common", maxStacks: 1 },
  pressGang: { type: "pressGang", label: "Press Gang", description: "Every 20 kills spawns a chest. (WIP: stacks tracked.)", rarity: "rare", maxStacks: 1 },
  deathBlossom: { type: "deathBlossom", label: "Death Blossom (EVOLVED)", description: "Fires in all 8 directions at once.", rarity: "epic", maxStacks: 1 },
  ghostTide: { type: "ghostTide", label: "Ghost Tide (EVOLVED)", description: "Boost recharges almost instantly; +60% speed.", rarity: "epic", maxStacks: 1 },
  ironclad: { type: "ironclad", label: "Ironclad (EVOLVED)", description: "−50% damage taken; ramming reflects damage.", rarity: "epic", maxStacks: 1 },
  tidalSweep: { type: "tidalSweep", label: "Tidal Sweep (EVOLVED)", description: "On-screen pickups auto-collect every 8s.", rarity: "epic", maxStacks: 1 },
  hellfireWake: { type: "hellfireWake", label: "Hellfire Wake (EVOLVED)", description: "Boost trail detonates enemies it touches.", rarity: "epic", maxStacks: 1 },
};
