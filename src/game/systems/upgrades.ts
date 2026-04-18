import { UPGRADE_OPTIONS } from "../constants";
import type { UpgradeOption, UpgradeStats, UpgradeType } from "../types";

export function buildUpgradeChoices(upgrades: UpgradeStats): UpgradeOption[] {
  const available: UpgradeOption[] = [];
  
  for (const key of Object.keys(UPGRADE_OPTIONS) as UpgradeType[]) {
    const opt = UPGRADE_OPTIONS[key];
    const currentStacks = upgrades.stacks[key] || 0;
    
    if (key === "fullSteam") {
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
    for (let i = 0; i < w; i++) pool.push(opt);
  }

  const choices: UpgradeOption[] = [];
  let enforceCommon = available.some((o) => o.rarity === "common");
  
  let guard = 50;
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
      for (let i = pool.length - 1; i >= 0; i--) {
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
  if (type === "boostRepeat") upgrades.cooldownMult *= 0.6; // For boost
}
