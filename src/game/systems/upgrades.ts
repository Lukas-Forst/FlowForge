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
