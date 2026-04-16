export type RunPhase = "start" | "playing" | "upgrade" | "gameover";

export type UpgradeType = "fireRate" | "speed" | "cooldown";

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

export type EnemyType = "corsair" | "bomber" | "brute";

export interface EnemyState {
  id: number;
  position: Vec2;
  type: EnemyType;
  facing: number;
  hp: number;
  speed: number;
  touchDamage: number;
  touchTimer: number;
  // Bomber ranged attack cooldown (seconds). Other types may keep this at 0 or ignore it.
  rangedCooldownRemaining: number;
}

export interface ProjectileState {
  id: number;
  position: Vec2;
  velocity: Vec2;
  ttl: number;
  damage: number;
  radius: number;
}

export interface CoinState {
  id: number;
  position: Vec2;
  value: number;
}

export interface UpgradeStats {
  level: number;
  fireRateMult: number;
  speedMult: number;
  cooldownMult: number;
  nextThreshold: number;
}

export interface Cooldowns {
  cannonRemaining: number;
  cannonDuration: number;
}

export interface GameStats {
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  score: number;
}

export interface UpgradeOption {
  type: UpgradeType;
  label: string;
  description: string;
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

export interface GameSnapshot {
  phase: RunPhase;
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  enemyProjectiles: ProjectileState[];
  coins: CoinState[];
  upgrades: UpgradeStats;
  cooldowns: Cooldowns;
  stats: GameStats;
  pendingUpgradeOptions: UpgradeOption[];
  message: FlashMessage | null;
  spawnIntensity: number;
}
