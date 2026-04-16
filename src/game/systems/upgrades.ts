import { UPGRADE_OPTIONS } from "../constants";
import type { UpgradeOption, UpgradeStats, UpgradeType } from "../types";

const ORDERED_UPGRADE_TYPES: UpgradeType[] = ["fireRate", "speed", "cooldown"];

export function buildUpgradeChoices(): UpgradeOption[] {
  return ORDERED_UPGRADE_TYPES.map((type) => UPGRADE_OPTIONS[type]);
}

export function applyUpgrade(upgrades: UpgradeStats, type: UpgradeType): void {
  upgrades.level += 1;
  // addons.md option A threshold progression:
  // 10, 15, 21, 28, 36, ... (increments: +5, +6, +7, ...)
  // After increment, upgrades.level=1 => +5, level=2 => +6, ...
  upgrades.nextThreshold += upgrades.level + 4;
  if (type === "fireRate") {
    upgrades.fireRateMult *= 1.22;
  }
  if (type === "speed") {
    upgrades.speedMult *= 1.15;
  }
  if (type === "cooldown") {
    upgrades.cooldownMult *= 0.82;
  }
}
