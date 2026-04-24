import type { UpgradeStats, UpgradeType } from "../types";

const CANNON_CARD_TO_ABILITY: Record<"cannonDrones" | "cannonFlare" | "cannonChainShot", UpgradeStats["activeCannonAbility"]> = {
  cannonDrones: "drones",
  cannonFlare: "flare",
  cannonChainShot: "chainShot",
};

const BOOST_CARD_TO_ABILITY: Record<"boostMines" | "boostRingBarrage" | "boostAnchorDrop", UpgradeStats["activeBoostAbility"]> = {
  boostMines: "mines",
  boostRingBarrage: "ringBarrage",
  boostAnchorDrop: "anchorDrop",
};

const EXTRA_CARD_TO_ABILITY: Record<"extraTorpedo" | "extraDepthCharge" | "extraOilSlick", NonNullable<UpgradeStats["activeExtraAbility"]>> = {
  extraTorpedo: "torpedo",
  extraDepthCharge: "depthCharge",
  extraOilSlick: "oilSlick",
};

export function isAbilityUpgrade(type: UpgradeType): boolean {
  return type in CANNON_CARD_TO_ABILITY || type in BOOST_CARD_TO_ABILITY || type in EXTRA_CARD_TO_ABILITY;
}

export function applyAbilityUpgrade(upgrades: UpgradeStats, type: UpgradeType): boolean {
  if (type in CANNON_CARD_TO_ABILITY) {
    upgrades.activeCannonAbility = CANNON_CARD_TO_ABILITY[type as keyof typeof CANNON_CARD_TO_ABILITY];
    return true;
  }
  if (type in BOOST_CARD_TO_ABILITY) {
    upgrades.activeBoostAbility = BOOST_CARD_TO_ABILITY[type as keyof typeof BOOST_CARD_TO_ABILITY];
    return true;
  }
  if (type in EXTRA_CARD_TO_ABILITY) {
    upgrades.activeExtraAbility = EXTRA_CARD_TO_ABILITY[type as keyof typeof EXTRA_CARD_TO_ABILITY];
    return true;
  }
  return false;
}

export function isAbilityLockedIn(upgrades: UpgradeStats): boolean {
  return Boolean(upgrades.activeCannonAbility && upgrades.activeBoostAbility && upgrades.activeExtraAbility);
}

export function isAbilityCardRelevant(type: UpgradeType, upgrades: UpgradeStats): boolean {
  if (type in CANNON_CARD_TO_ABILITY) {
    return upgrades.activeCannonAbility !== CANNON_CARD_TO_ABILITY[type as keyof typeof CANNON_CARD_TO_ABILITY];
  }
  if (type in BOOST_CARD_TO_ABILITY) {
    return upgrades.activeBoostAbility !== BOOST_CARD_TO_ABILITY[type as keyof typeof BOOST_CARD_TO_ABILITY];
  }
  if (type in EXTRA_CARD_TO_ABILITY) {
    return upgrades.activeExtraAbility !== EXTRA_CARD_TO_ABILITY[type as keyof typeof EXTRA_CARD_TO_ABILITY];
  }
  return true;
}
