import type { EnemyType, UpgradeOption, UpgradeType } from "./types";

export const EVOLUTION_UPGRADE_TYPES: readonly UpgradeType[] = [
  "deathBlossom",
  "ghostTide",
  "ironclad",
  "tidalSweep",
  "hellfireWake",
  "krakenCall",
  "phantomFleet",
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
export const BASE_PASSIVE_BROADSIDE_INTERVAL = 4;
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
export const BOOST_ACTIVE_TIME = 1.1;
export const BOOST_SPEED_MULTIPLIER = 1.55;
export const BOOST_COOLDOWN_CONSUME_FRACTION = 0.5;
export const RING_BARRAGE_SHELL_COUNT = 10;
export const RING_BARRAGE_IMPACT_DELAY = 0.7;
export const RING_BARRAGE_DAMAGE = 55;
export const RING_BARRAGE_RADIUS = 2.8;
export const RING_BARRAGE_RING_DISTANCE = 7.5;
export const SEA_MINE_DROP_COUNT = 3;
export const SEA_MINE_ARMING_TIME = 0.4;
export const SEA_MINE_LIFETIME = 8;
export const SEA_MINE_RADIUS = 3.2;
export const SEA_MINE_DAMAGE = 70;
export const SEA_MINE_DRIFT_SPEED = 1.2;
export const DEPTH_CHARGE_COOLDOWN = 14;
export const DEPTH_CHARGE_DELAY = 1.5;
export const DEPTH_CHARGE_DAMAGE = 110;
export const DEPTH_CHARGE_RADIUS = 5.5;
export const TORPEDO_COOLDOWN = 10;
export const TORPEDO_DAMAGE = 85;
export const TORPEDO_SPEED = 24;
export const TORPEDO_TTL = 2.8;
export const TORPEDO_RADIUS = 0.42;

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
  sideGuns: { type: "sideGuns", label: "Broadside Volley", description: "Passive broadside volley adds extra side shots.", rarity: "uncommon", maxStacks: 2 },
  pierce: { type: "pierce", label: "Armor Piercing", description: "Auto-shots pierce 1 extra enemy.", rarity: "uncommon", maxStacks: 2 },
  coinMagnet: { type: "coinMagnet", label: "Salvage Net", description: "Increase coin pickup radius.", rarity: "uncommon", maxStacks: 2 },
  armor: { type: "armor", label: "Iron Plating", description: "Reduce damage taken by 15%.", rarity: "uncommon", maxStacks: 3 },
  boostRepeat: { type: "boostRepeat", label: "Second Wind", description: "Boost cooldown -40%, active time +50%.", rarity: "rare", maxStacks: 1 },
  ringBarrage: { type: "ringBarrage", label: "Ring Barrage", description: "Boost triggers delayed mortar impacts in a ring around your ship.", rarity: "rare", maxStacks: 2 },
  cannonSpread: { type: "cannonSpread", label: "Shrapnel Blast", description: "Cannon salvo size +2, wider arc.", rarity: "rare", maxStacks: 2 },
  fullSteam: { type: "fullSteam", label: "Full Steam Ahead", description: "Auto-fire doubled while boost is active.", rarity: "epic", maxStacks: 1 },
  grapeshot: { type: "grapeshot", label: "Grapeshot", description: "Auto-shots add two split pellets with reduced damage.", rarity: "rare", maxStacks: 2 },
  sternChaser: { type: "sternChaser", label: "Stern Chaser", description: "Adds rear-firing auto-shots.", rarity: "uncommon", maxStacks: 2 },
  explosiveRounds: { type: "explosiveRounds", label: "Explosive Rounds", description: "Player shots gain blast radius and impact damage.", rarity: "rare", maxStacks: 2 },
  ramProw: { type: "ramProw", label: "Ram Prow", description: "Ramming enemies deals scaling hull damage.", rarity: "uncommon", maxStacks: 2 },
  ghostHull: { type: "ghostHull", label: "Ghost Hull", description: "Gain temporary invulnerability after boosting.", rarity: "uncommon", maxStacks: 1 },
  afterburner: { type: "afterburner", label: "Afterburner", description: "Boosting burns nearby enemies over time.", rarity: "rare", maxStacks: 2 },
  bilgePump: { type: "bilgePump", label: "Bilge Pump", description: "Regenerate hull integrity each second.", rarity: "uncommon", maxStacks: 2 },
  scavenger: { type: "scavenger", label: "Scavenger", description: "Defeated enemies are more likely to drop HP salvage.", rarity: "uncommon", maxStacks: 2 },
  sacrificeRig: { type: "sacrificeRig", label: "Sacrifice Rig", description: "Periodically spend HP to gain bonus loot bursts.", rarity: "rare", maxStacks: 1 },
  deepDredge: { type: "deepDredge", label: "Deep Dredge", description: "Harvestables yield extra salvage and gems.", rarity: "uncommon", maxStacks: 2 },
  crowsNest: { type: "crowsNest", label: "Crow's Nest", description: "Increases crit readouts and salvage value.", rarity: "common", maxStacks: 1 },
  pressGang: { type: "pressGang", label: "Press Gang", description: "Every 20 kills summons a guaranteed chest.", rarity: "rare", maxStacks: 1 },
  deathBlossom: { type: "deathBlossom", label: "Death Blossom (EVOLVED)", description: "Auto-fire erupts in all directions.", rarity: "epic", maxStacks: 1 },
  ghostTide: { type: "ghostTide", label: "Ghost Tide (EVOLVED)", description: "Boost almost instantly recharges and grants +60% speed.", rarity: "epic", maxStacks: 1 },
  ironclad: { type: "ironclad", label: "Ironclad (EVOLVED)", description: "Massive damage reduction and lethal ramming impact.", rarity: "epic", maxStacks: 1 },
  tidalSweep: { type: "tidalSweep", label: "Tidal Sweep (EVOLVED)", description: "Automatically sweeps nearby loot every few seconds.", rarity: "epic", maxStacks: 1 },
  hellfireWake: { type: "hellfireWake", label: "Hellfire Wake (EVOLVED)", description: "Boost trails ignite and detonate surrounding enemies.", rarity: "epic", maxStacks: 1 },
  krakenCall: { type: "krakenCall", label: "Kraken Call (EVOLVED)", description: "Once per run, summon a kraken ally for 15s. Requires max Fire Rate + max Pierce + one epic.", rarity: "epic", maxStacks: 1 },
  phantomFleet: { type: "phantomFleet", label: "Phantom Fleet (EVOLVED)", description: "After each boost, 2 ghost decoys auto-fire for 8s. Requires max Afterburner + Ghost Tide.", rarity: "epic", maxStacks: 1 },
  cannonDrones: { type: "cannonDrones", label: "Drone Swarm", description: "SPACE deploys 3 combat drones for 10s.", rarity: "rare", maxStacks: 1 },
  cannonFlare: { type: "cannonFlare", label: "Flare Burst", description: "SPACE fires a wide flare cone that staggers enemies.", rarity: "rare", maxStacks: 1 },
  cannonChainShot: { type: "cannonChainShot", label: "Chain Shot", description: "SPACE fires a piercing heavy chain shot.", rarity: "rare", maxStacks: 1 },
  boostMines: { type: "boostMines", label: "Sea Mines", description: "SHIFT drops 3 drifting mines behind your ship.", rarity: "rare", maxStacks: 1 },
  boostRingBarrage: { type: "boostRingBarrage", label: "Ring Barrage", description: "SHIFT launches a 360-degree mortar ring.", rarity: "rare", maxStacks: 1 },
  boostAnchorDrop: { type: "boostAnchorDrop", label: "Anchor Drop", description: "SHIFT emits a short-range shockwave slam.", rarity: "rare", maxStacks: 1 },
  extraTorpedo: { type: "extraTorpedo", label: "Torpedo", description: "Unlock E: launch a piercing heavy torpedo.", rarity: "rare", maxStacks: 1 },
  extraDepthCharge: { type: "extraDepthCharge", label: "Depth Charge", description: "Unlock E: lob a delayed depth explosion.", rarity: "rare", maxStacks: 1 },
  extraOilSlick: { type: "extraOilSlick", label: "Oil Slick", description: "Unlock E: drop a burning slowing slick.", rarity: "rare", maxStacks: 1 },
};
