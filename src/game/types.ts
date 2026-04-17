export type RunPhase = "start" | "playing" | "upgrade" | "gameover";

export type UpgradeType = "fireRate" | "speed" | "cooldown";
export type EnemyType = "corsair" | "bomber" | "brute";

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
  position: Vec2;
  hp: number;
  speed: number;
  touchDamage: number;
  touchTimer: number;
  rangedCooldown: number;
}

export type ProjectileKind = "playerAuto" | "playerCannon" | "enemyCorsair" | "enemyBomber" | "enemyBrute";

export function isEnemyProjectileKind(kind: ProjectileKind): boolean {
  return kind === "enemyCorsair" || kind === "enemyBomber" || kind === "enemyBrute";
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

export type VisualEffectKind = "waterSplash" | "hitBurst";

export interface VisualEffect {
  id: number;
  kind: VisualEffectKind;
  position: Vec2;
  remaining: number;
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
  boostRemaining: number;
  boostDuration: number;
  boostActiveRemaining: number;
  boostActiveDuration: number;
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
  visualEffects: VisualEffect[];
  coins: CoinState[];
  upgrades: UpgradeStats;
  cooldowns: Cooldowns;
  stats: GameStats;
  pendingUpgradeOptions: UpgradeOption[];
  message: FlashMessage | null;
  spawnIntensity: number;
}
