/**
 * Captain meta-progression system.
 * Tracks captainLevel (1-50) and captainXp across runs.
 *
 * XP earned per run: score * 0.1 + kills * 5 + timeSurvived * 2
 * Level threshold: level N requires N² * 100 XP to reach
 */

export interface CaptainProgress {
  captainLevel: number;
  captainXp: number;
  title: string;
}

export interface BestRun {
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  evolutionsUnlocked: number;
  xpGained: number;
  captainLevel: number;
  date: string;
}

/** Full run record for runHistory (same shape as BestRun) */
export interface RunRecord {
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  evolutionsUnlocked: number;
  xpGained: number;
  captainLevel: number;
  date: string;
}

const STORAGE_KEY_LEVEL = "flowforge.captain.level";
const STORAGE_KEY_XP = "flowforge.captain.xp";
const STORAGE_KEY_BEST = "flowforge.captain.bestRun";
const STORAGE_KEY_HISTORY = "flowforge.runHistory";
const MAX_RUN_HISTORY = 20;

/** Level titles — cosmetic milestones */
const CAPTAIN_TITLES: Record<number, string> = {
  1: "Recruit",
  5: "Sailor",
  10: "Veteran",
  15: "Harbor Master",
  20: "Commander",
  25: "Fleet Admiral",
  30: "Captain",
  35: "Sea Serpent",
  40: "Admiral",
  45: "Ocean Lord",
  50: "Legend",
};

export function getCaptainTitle(level: number): string {
  const keys = Object.keys(CAPTAIN_TITLES)
    .map(Number)
    .filter((k) => k <= level)
    .sort((a, b) => b - a);
  return CAPTAIN_TITLES[keys[0] ?? 1] ?? "Legend";
}

/** XP required to advance from level N-1 to level N */
export function xpForLevel(level: number): number {
  return level * level * 100;
}

/** Total XP needed to reach level L from level 1 */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

/** XP earned from a single run */
export function calculateRunXp(stats: {
  score: number;
  enemiesKilled: number;
  timeSurvived: number;
}): number {
  return Math.floor(stats.score * 0.1 + stats.enemiesKilled * 5 + stats.timeSurvived * 2);
}

/** Load persisted captain progress from localStorage */
export function loadCaptainProgress(): CaptainProgress {
  const level = Number(localStorage.getItem(STORAGE_KEY_LEVEL) || 1);
  const xp = Number(localStorage.getItem(STORAGE_KEY_XP) || 0);
  return {
    captainLevel: Math.max(1, Math.min(50, level)),
    captainXp: Math.max(0, xp),
    title: getCaptainTitle(level),
  };
}

/** Persist captain progress to localStorage */
export function saveCaptainProgress(progress: CaptainProgress): void {
  localStorage.setItem(STORAGE_KEY_LEVEL, String(progress.captainLevel));
  localStorage.setItem(STORAGE_KEY_XP, String(progress.captainXp));
}

/** Add XP and handle level-ups. Returns { updated progress, XP used, levels gained }. */
export function addXp(
  progress: CaptainProgress,
  xpToAdd: number,
): {
  progress: CaptainProgress;
  xpUsed: number;
  levelsGained: number;
} {
  let remaining = xpToAdd;
  let levelsGained = 0;
  let level = progress.captainLevel;
  let xp = progress.captainXp;

  while (remaining > 0 && level < 50) {
    const needed = xpForLevel(level + 1) - xp;
    if (remaining >= needed) {
      remaining -= needed;
      xp = 0;
      level++;
      levelsGained++;
    } else {
      xp += remaining;
      remaining = 0;
    }
  }

  return {
    progress: { captainLevel: level, captainXp: xp, title: getCaptainTitle(level) },
    xpUsed: xpToAdd - remaining,
    levelsGained,
  };
}

/** Load best run from localStorage */
export function loadBestRun(): BestRun | null {
  const raw = localStorage.getItem(STORAGE_KEY_BEST);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BestRun;
  } catch {
    return null;
  }
}

/** Load run history from localStorage */
export function loadRunHistory(): RunRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RunRecord[];
  } catch {
    return [];
  }
}

/** Push a completed run onto the history, capping at MAX_RUN_HISTORY */
export function pushRunHistory(stats: {
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  evolutionsUnlocked: number;
}, xpGained: number, captainLevel: number): void {
  const record: RunRecord = {
    score: stats.score,
    timeSurvived: stats.timeSurvived,
    enemiesKilled: stats.enemiesKilled,
    collectedCoins: stats.collectedCoins,
    evolutionsUnlocked: stats.evolutionsUnlocked,
    xpGained,
    captainLevel,
    date: new Date().toISOString(),
  };
  const history = loadRunHistory();
  history.unshift(record);
  if (history.length > MAX_RUN_HISTORY) {
    history.splice(MAX_RUN_HISTORY);
  }
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

/** Save best run if the new run is better */
export function saveBestRun(
  stats: {
    score: number;
    timeSurvived: number;
    enemiesKilled: number;
    collectedCoins: number;
    evolutionsUnlocked: number;
  },
  xpGained: number,
  captainLevel: number,
): boolean {
  const current: BestRun = {
    score: stats.score,
    timeSurvived: stats.timeSurvived,
    enemiesKilled: stats.enemiesKilled,
    collectedCoins: stats.collectedCoins,
    evolutionsUnlocked: stats.evolutionsUnlocked,
    xpGained,
    captainLevel,
    date: new Date().toISOString(),
  };
  const best = loadBestRun();
  if (!best || stats.score > best.score) {
    localStorage.setItem(STORAGE_KEY_BEST, JSON.stringify(current));
    return true;
  }
  return false;
}
