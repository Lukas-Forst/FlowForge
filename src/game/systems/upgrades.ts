import { EVOLUTION_UPGRADE_TYPES, UPGRADE_OPTIONS } from "../constants";
import type { AudioEvent, PostFxPulse, UpgradeOption, UpgradeStats, UpgradeType, Vec2, VisualEffect } from "../types";

const EVOLUTION_SET = new Set<UpgradeType>(EVOLUTION_UPGRADE_TYPES);

function evolutionPrereqsMet(type: UpgradeType, upgrades: UpgradeStats): boolean {
  const s = upgrades.stacks;
  switch (type) {
    case "deathBlossom":
      return (
        (s.fireRate ?? 0) >= UPGRADE_OPTIONS.fireRate.maxStacks &&
        (s.projectileCount ?? 0) >= UPGRADE_OPTIONS.projectileCount.maxStacks
      );
    case "ghostTide":
      return (s.speed ?? 0) >= UPGRADE_OPTIONS.speed.maxStacks && (s.boostRepeat ?? 0) >= UPGRADE_OPTIONS.boostRepeat.maxStacks;
    case "ironclad":
      return (s.armor ?? 0) >= UPGRADE_OPTIONS.armor.maxStacks && (s.maxHp ?? 0) >= UPGRADE_OPTIONS.maxHp.maxStacks;
    case "tidalSweep":
      return (s.coinMagnet ?? 0) >= UPGRADE_OPTIONS.coinMagnet.maxStacks && (s.deepDredge ?? 0) >= UPGRADE_OPTIONS.deepDredge.maxStacks;
    case "hellfireWake":
      return (
        (s.explosiveRounds ?? 0) >= UPGRADE_OPTIONS.explosiveRounds.maxStacks &&
        (s.afterburner ?? 0) >= UPGRADE_OPTIONS.afterburner.maxStacks
      );
    default:
      return false;
  }
}

export function buildUpgradeChoices(upgrades: UpgradeStats): UpgradeOption[] {
  const available: UpgradeOption[] = [];

  for (const key of Object.keys(UPGRADE_OPTIONS) as UpgradeType[]) {
    const opt = UPGRADE_OPTIONS[key];
    const currentStacks = upgrades.stacks[key] || 0;

    if (EVOLUTION_SET.has(key)) {
      if (currentStacks >= opt.maxStacks) {
        continue;
      }
      if (!evolutionPrereqsMet(key, upgrades)) {
        continue;
      }
    } else if (key === "fullSteam") {
      const fireRateStacks = upgrades.stacks["fireRate"] || 0;
      const speedStacks = upgrades.stacks["speed"] || 0;
      if (fireRateStacks < UPGRADE_OPTIONS["fireRate"].maxStacks || speedStacks < UPGRADE_OPTIONS["speed"].maxStacks) {
        continue;
      }
    }

    if (currentStacks < opt.maxStacks) {
      available.push(opt);
    }
  }

  const weightMap: Record<"common" | "uncommon" | "rare" | "epic", number> = {
    common: 10,
    uncommon: 5,
    rare: 2,
    epic: 1,
  };

  const pool: UpgradeOption[] = [];
  for (const opt of available) {
    const w = weightMap[opt.rarity];
    for (let i = 0; i < w; i += 1) {
      pool.push(opt);
    }
  }

  const choices: UpgradeOption[] = [];
  let enforceCommon = available.some((o) => o.rarity === "common");

  let guard = 80;
  while (choices.length < 3 && available.length > choices.length && guard-- > 0) {
    if (enforceCommon && choices.length === 2 && !choices.some((c) => c.rarity === "common")) {
      const commons = available.filter((o) => o.rarity === "common" && !choices.includes(o));
      if (commons.length > 0) {
        choices.push(commons[Math.floor(Math.random() * commons.length)]);
      }
      break;
    }

    if (pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const pick = pool[idx];
    if (!choices.includes(pick)) {
      choices.push(pick);
      for (let i = pool.length - 1; i >= 0; i -= 1) {
        if (pool[i].type === pick.type) pool.splice(i, 1);
      }
    }
  }

  return choices;
}

export function applyUpgrade(upgrades: UpgradeStats, type: UpgradeType): void {
  upgrades.level += 1;
  upgrades.nextThreshold += upgrades.level + 4;
  upgrades.stacks[type] = (upgrades.stacks[type] || 0) + 1;

  if (type === "fireRate") upgrades.fireRateMult *= 1.22;
  if (type === "speed") upgrades.speedMult *= 1.15;
  if (type === "cooldown") upgrades.cooldownMult *= 0.82;
  if (type === "boostRepeat") upgrades.cooldownMult *= 0.6;
}

export function retargetNextUpgradeThreshold(upgrades: UpgradeStats, collectedCoins: number): void {
  const minStep = upgrades.level + 4;
  upgrades.nextThreshold = Math.max(upgrades.nextThreshold, collectedCoins + minStep);
}

export function countEvolutionStacks(upgrades: UpgradeStats): number {
  let n = 0;
  for (const t of EVOLUTION_UPGRADE_TYPES) {
    if ((upgrades.stacks[t] ?? 0) >= 1) n += 1;
  }
  return n;
}

export function emitLevelUpEvents(
  playerPos: Vec2,
  audio: AudioEvent[],
  vfx: VisualEffect[],
  effectIdRef: { value: number },
): PostFxPulse {
  audio.push({ id: effectIdRef.value++, sfx: "upgrade_sting" });
  vfx.push({
    id: effectIdRef.value++,
    kind: "screenShake",
    position: { x: playerPos.x, y: playerPos.y },
    remaining: 0.14,
  });
  vfx.push({
    id: effectIdRef.value++,
    kind: "hitBurst",
    position: { x: playerPos.x, y: playerPos.y },
    remaining: 0.35,
    color: "#ffe16b",
  });
  return { effect: "chromaticAb", remaining: 0.2, duration: 0.2 };
}
