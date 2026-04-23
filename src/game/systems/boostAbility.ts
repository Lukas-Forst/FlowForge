import { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_SPEED_MULTIPLIER } from "../constants";
import type { Cooldowns } from "../types";

export { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_SPEED_MULTIPLIER };

export function tryActivateBoost(cooldowns: Cooldowns, cooldownMultiplier = 1): boolean {
  if (cooldowns.boostRemaining > 0) {
    return false;
  }

  cooldowns.boostDuration = Math.max(0.3, BOOST_COOLDOWN * cooldownMultiplier);
  cooldowns.boostRemaining = cooldowns.boostDuration;
  cooldowns.boostActiveDuration = BOOST_ACTIVE_TIME;
  cooldowns.boostActiveRemaining = cooldowns.boostActiveDuration;
  return true;
}

export function getBoostSpeedMultiplier(cooldowns: Cooldowns): number {
  if (cooldowns.boostActiveRemaining > 0) {
    return BOOST_SPEED_MULTIPLIER;
  }
  return 1;
}
