export type RunPhase = "loading" | "start" | "playing" | "paused" | "upgrade" | "gameover";

export type SfxId =
  | "cannon_fire"
  | "hit"
  | "pickup"
  | "upgrade_sting"
  | "boss_cue"
  | "damage_taken"
  | "ship_destroyed"
  | "harvestable_destroyed";

export type AmbientId = "sea_bed" | "boss_bed";

export interface AudioEvent {
  id: number;
  sfx: SfxId;
  volume?: number;
  pitch?: number;
}

export type PostFxEffect = "chromaticAb" | "flash";

export interface PostFxPulse {
  effect: PostFxEffect;
  remaining: number;
  duration: number;
}

export interface LoadingState {
  progress: number;
  label: string;
}

export type UpgradeType =
  | "fireRate"
  | "speed"
  | "cooldown"
  | "maxHp"
  | "projectileCount"
  | "sideGuns"
  | "pierce"
  | "coinMagnet"
  | "armor"
  | "boostRepeat"
  | "cannonSpread"
  | "fullSteam"
  | "grapeshot"
  | "sternChaser"
  | "explosiveRounds"
  | "ramProw"
  | "ghostHull"
  | "afterburner"
  | "bilgePump"
  | "scavenger"
  | "sacrificeRig"
  | "deepDredge"
  | "crowsNest"
  | "pressGang"
  | "deathBlossom"
  | "ghostTide"
  | "ironclad"
  | "tidalSweep"
  | "hellfireWake";

export type EnemyType = "corsair" | "bomber" | "brute" | "swarmer" | "sniper" | "boss" | "shore_battery";

export type MovementKey = "w" | "a" | "s" | "d";

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Vec2;
  facing: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
}

export interface EnemyState {
  id: number;
  type: EnemyType;
  /** Elites: stronger, gold-tinted; Phases 2+ only. */
  isElite: boolean;
  position: Vec2;
  facing: number;
  hp: number;
  maxHp: number;
  speed: number;
  touchDamage: number;
  touchTimer: number;
  rangedCooldown: number;
}

export type HarvestableType =
  | "scrap_raft"
  | "abandoned_boat"
  | "floating_cargo"
  | "derelict_steamer"
  | "anchor_cache"
  | "sunken_galleon"
  | "treasure_chest";

export interface HarvestableState {
  id: number;
  type: HarvestableType;
  position: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  rotation: number;
}

export type ProjectileKind = "playerAuto" | "playerCannon" | "enemyCorsair" | "enemyBomber" | "enemyBrute" | "enemySniper" | "enemyBoss" | "enemyBattery";

export function isEnemyProjectileKind(kind: ProjectileKind): boolean {
  return kind === "enemyCorsair" || kind === "enemyBomber" || kind === "enemyBrute" || kind === "enemySniper" || kind === "enemyBoss" || kind === "enemyBattery";
}

export interface ProjectileState {
  id: number;
  kind: ProjectileKind;
  position: Vec2;
  velocity: Vec2;
  ttl: number;
  damage: number;
  radius: number;
}

export type VisualEffectKind = "waterSplash" | "hitBurst" | "muzzleFlash" | "waterRippleSmall" | "telegraphRing" | "damageNumber" | "enemyDeath" | "screenShake";

export interface VisualEffect {
  id: number;
  kind: VisualEffectKind;
  position: Vec2;
  remaining: number;
  text?: string;
  color?: string;
}

export type PickupKind =
  | "coin"
  | "gem"
  | "hp"
  | "chest"
  | "supply_heal"
  | "supply_frenzy"
  | "supply_invuln"
  | "instant_levelup";

export interface PickupState {
  id: number;
  kind: PickupKind;
  position: Vec2;
  value: number;
}

export interface UpgradeStats {
  level: number;
  fireRateMult: number;
  speedMult: number;
  cooldownMult: number;
  nextThreshold: number;
  stacks: Record<UpgradeType, number>;
}

export interface Cooldowns {
  cannonRemaining: number;
  cannonDuration: number;
  boostRemaining: number;
  boostDuration: number;
  boostActiveRemaining: number;
  boostActiveDuration: number;
  invulnRemaining: number;
  frenzyRemaining: number;
}

export interface GameStats {
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  score: number;
  longestUnscathedStreak: number;
  currentUnscathedStreak: number;
  biggestHit: number;
  /** Count of evolution upgrades taken (stacks ≥ 1). */
  evolutionsUnlocked: number;
}

export interface UpgradeOption {
  type: UpgradeType;
  label: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic";
  maxStacks: number;
}

export interface InputState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export interface FlashMessage {
  text: string;
  remaining: number;
}

export interface RunRecord {
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  evolutionsUnlocked: number;
  topUpgrade: string;
  date: string;
}

export interface GameSnapshot {
  phase: RunPhase;
  loading: LoadingState;
  player: PlayerState;
  enemies: EnemyState[];
  harvestables: HarvestableState[];
  projectiles: ProjectileState[];
  visualEffects: VisualEffect[];
  audioEvents: AudioEvent[];
  postFxPulse: PostFxPulse | null;
  pickups: PickupState[];
  upgrades: UpgradeStats;
  cooldowns: Cooldowns;
  stats: GameStats;
  pendingUpgradeOptions: UpgradeOption[];
  message: FlashMessage | null;
  spawnIntensity: number;
  runClock: {
    phase: "wave" | "elite" | "lull" | "boss";
    phaseTime: number;
    elapsedTotal: number;
  };
  runBiome: BiomeType;
}

export type BiomeType = "open_sea" | "island_chain" | "deep_waters" | "boss_storm";

export interface BiomeTheme {
  waterColor: string;
  waterRoughness: number;
  waterClearcoat: number;
  bumpScale: number;
  waterEmissive: string;
  waterEmissiveIntensity: number;
  waveHeight: number;
  waveSpeed: number;
  shimmerColor: string;
  shimmerOpacity: number;
  backgroundColor: string;
  ambient: { color: string; intensity: number };
  directional: { color: string; intensity: number; position: [number, number, number] };
  rim: { color: string; intensity: number };
  fog: { color: string; near: number; far: number };
}
