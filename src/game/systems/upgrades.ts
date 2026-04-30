import { EVOLUTION_UPGRADE_TYPES, UPGRADE_OPTIONS } from "../constants";
import type { AudioEvent, PostFxPulse, UpgradeOption, UpgradeStats, UpgradeType, Vec2, VisualEffect } from "../types";
import { applyAbilityUpgrade, isAbilityCardRelevant, isAbilityLockedIn, isAbilityUpgrade } from "./abilitySlots";

const EVOLUTION_SET = new Set<UpgradeType>(EVOLUTION_UPGRADE_TYPES);
const IMPLEMENTED_UPGRADES = new Set<UpgradeType>(Object.keys(UPGRADE_OPTIONS) as UpgradeType[]);
const EPIC_TYPES = new Set<UpgradeType>([
  "fullSteam",
  ...EVOLUTION_UPGRADE_TYPES,
]);

function evolutionPrereqsMet(type: UpgradeType, upgrades: UpgradeStats): boolean {
  const s = upgrades.stacks;
  const hasAnyOtherEpic = (): boolean => {
    for (const key of EPIC_TYPES) {
      if (key === "krakenCall") continue;
      if ((s[key] ?? 0) > 0) return true;
    }
    return false;
  };
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
    case "krakenCall":
      return (
        (s.fireRate ?? 0) >= UPGRADE_OPTIONS.fireRate.maxStacks &&
        (s.pierce ?? 0) >= UPGRADE_OPTIONS.pierce.maxStacks &&
        hasAnyOtherEpic()
      );
    case "phantomFleet":
      return (
        (s.afterburner ?? 0) >= UPGRADE_OPTIONS.afterburner.maxStacks &&
        (s.ghostTide ?? 0) >= 1
      );
    default:
      return false;
  }
}

export function buildUpgradeChoices(upgrades: UpgradeStats): UpgradeOption[] {
  const available: UpgradeOption[] = [];

  for (const key of Object.keys(UPGRADE_OPTIONS) as UpgradeType[]) {
    if (!IMPLEMENTED_UPGRADES.has(key)) {
      continue;
    }

    const opt = UPGRADE_OPTIONS[key];
    const currentStacks = upgrades.stacks[key] || 0;
    if (isAbilityUpgrade(key)) {
      if (isAbilityLockedIn(upgrades)) {
        continue;
      }
      if (!isAbilityCardRelevant(key, upgrades)) {
        continue;
      }
    }

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
    common: 9,
    uncommon: 5,
    rare: 3,
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

const ELITE_EXTRA_ABILITY_TYPES: UpgradeType[] = ["extraTorpedo", "extraDepthCharge", "extraOilSlick"];

export function buildEliteExtraAbilityChoices(upgrades: UpgradeStats): UpgradeOption[] {
  const choices: UpgradeOption[] = [];
  for (const type of ELITE_EXTRA_ABILITY_TYPES) {
    const option = UPGRADE_OPTIONS[type];
    if (!option) continue;
    const isOwned = (upgrades.stacks[type] ?? 0) > 0;
    if (!isOwned) {
      choices.push(option);
    }
  }
  return choices.length > 0 ? choices : ELITE_EXTRA_ABILITY_TYPES.map((type) => UPGRADE_OPTIONS[type]);
}

export function applyUpgrade(upgrades: UpgradeStats, type: UpgradeType): void {
  upgrades.level += 1;
  upgrades.nextThreshold += upgrades.level + 4;
  upgrades.stacks[type] = (upgrades.stacks[type] || 0) + 1;
  applyAbilityUpgrade(upgrades, type);

  if (type === "fireRate") upgrades.fireRateMult *= 1.22;
  if (type === "speed") upgrades.speedMult *= 1.15;
  if (type === "cooldown") upgrades.cooldownMult *= 0.82;
  if (type === "boostRepeat") upgrades.cooldownMult *= 0.6;
}

export function applyEliteExtraAbilitySelection(upgrades: UpgradeStats, type: UpgradeType): void {
  if (!ELITE_EXTRA_ABILITY_TYPES.includes(type)) {
    return;
  }
  upgrades.stacks[type] = Math.max(1, upgrades.stacks[type] ?? 0);
  applyAbilityUpgrade(upgrades, type);
}

export function applyDamageMitigation(rawDamage: number, upgrades: UpgradeStats): number {
  if (rawDamage <= 0) {
    return 0;
  }
  const armorStacks = Math.max(0, upgrades.stacks.armor ?? 0);
  const evolutionMitigation = (upgrades.stacks.ironclad ?? 0) > 0 ? 0.5 : 0;
  const mitigation = Math.min(0.85, armorStacks * 0.15 + evolutionMitigation);
  return rawDamage * (1 - mitigation);
}

export function getUpgradePrerequisiteDescription(type: UpgradeType): string | null {
  switch (type) {
    case "fullSteam":
      return "Max Powder Frenzy + Max Trade Winds";
    case "deathBlossom":
      return "Max Powder Frenzy + Max Twin Cannons";
    case "ghostTide":
      return "Max Trade Winds + Second Wind";
    case "ironclad":
      return "Max Iron Plating + Max Hull Reinforcement";
    case "tidalSweep":
      return "Max Salvage Net + Max Deep Dredge";
    case "hellfireWake":
      return "Max Explosive Rounds + Max Afterburner";
    case "krakenCall":
      return "Max Powder Frenzy + Max Armor Piercing + any epic";
    case "phantomFleet":
      return "Max Afterburner + Ghost Tide";
    default:
      return null;
  }
}

/**
 * Returns the upgrade delta preview: [currentValue, newValue, deltaPercent] or null if not applicable.
 */
export function getUpgradeDelta(type: UpgradeType, currentStacks: number, upgrades: UpgradeStats): { current: number; next: number; delta: number } | null {
  switch (type) {
    case "fireRate": {
      const cur = upgrades.fireRateMult;
      const next = cur * 1.22;
      return { current: cur, next, delta: 22 };
    }
    case "speed": {
      const cur = upgrades.speedMult;
      const next = cur * 1.15;
      return { current: cur, next, delta: 15 };
    }
    case "cooldown": {
      const cur = upgrades.cooldownMult;
      const next = cur * 0.82;
      // cooldown is reduction, so lower is better — show as negative %
      const pct = Math.round((1 - 0.82) * 100);
      return { current: cur, next, delta: -pct };
    }
    case "maxHp": {
      const baseHp = 100;
      const curHpBonus = currentStacks * 25;
      const nextHpBonus = (currentStacks + 1) * 25;
      return { current: baseHp + curHpBonus, next: baseHp + nextHpBonus, delta: 25 };
    }
    case "projectileCount": {
      const cur = 1 + currentStacks;
      const next = cur + 1;
      return { current: cur, next, delta: Math.round((1 / cur) * 100) };
    }
    case "sideGuns": {
      const cur = 1 + currentStacks;
      const next = cur + 1;
      return { current: cur, next, delta: Math.round((1 / cur) * 100) };
    }
    case "pierce": {
      const cur = currentStacks;
      const next = cur + 1;
      const delta = cur <= 0 ? 100 : Math.round((1 / cur) * 100);
      return { current: cur, next, delta };
    }
    case "armor": {
      const cur = currentStacks * 15;
      const next = (currentStacks + 1) * 15;
      const delta = cur <= 0 ? 100 : Math.round((15 / cur) * 100);
      return { current: cur, next, delta };
    }
    case "coinMagnet": {
      const cur = currentStacks * 0.3 + 1.4;
      const next = (currentStacks + 1) * 0.3 + 1.4;
      return { current: Math.round(cur * 10) / 10, next: Math.round(next * 10) / 10, delta: Math.round((0.3 / cur) * 100) };
    }
    default:
      return null;
  }
}

function formatDeltaLabel(type: UpgradeType, delta: { current: number; next: number; delta: number }): string {
  switch (type) {
    case "fireRate":
      return `${delta.current.toFixed(2)}x → ${delta.next.toFixed(2)}x (+${delta.delta}%)`;
    case "speed":
      return `${delta.current.toFixed(2)}x → ${delta.next.toFixed(2)}x (+${delta.delta}%)`;
    case "cooldown":
      return `${delta.current.toFixed(2)}x → ${delta.next.toFixed(2)}x (${delta.delta}%)`;
    case "maxHp":
      return `${Math.round(delta.current)} → ${Math.round(delta.next)} HP (+${delta.delta})`;
    case "projectileCount":
    case "sideGuns":
      return `${delta.current} → ${delta.next} shots (+1)`;
    case "pierce":
      return `${delta.current} → ${delta.next} pierce (+1)`;
    case "armor":
      return `${Math.round(delta.current)}% → ${Math.round(delta.next)}% DR (+15%)`;
    case "coinMagnet":
      return `${delta.current} → ${delta.next} pickup radius`;
    default:
      return null;
  }
}

export function getUpgradeDeltaLabel(type: UpgradeType, currentStacks: number, upgrades: UpgradeStats): string | null {
  const delta = getUpgradeDelta(type, currentStacks, upgrades);
  if (!delta) return null;
  return formatDeltaLabel(type, delta);
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
