<<<<<<< HEAD
import { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_COOLDOWN_CONSUME_FRACTION, BOOST_SPEED_MULTIPLIER } from "../constants";
import type { Cooldowns } from "../types";

export { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_COOLDOWN_CONSUME_FRACTION, BOOST_SPEED_MULTIPLIER };
=======
import { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_SPEED_MULTIPLIER } from "../constants";
import type { Cooldowns } from "../types";

export { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_SPEED_MULTIPLIER };
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

export function tryActivateBoost(cooldowns: Cooldowns, cooldownMultiplier = 1): boolean {
  if (cooldowns.boostRemaining > 0) {
    return false;
  }

  cooldowns.boostDuration = Math.max(0.3, BOOST_COOLDOWN * cooldownMultiplier);
<<<<<<< HEAD
  cooldowns.boostRemaining = cooldowns.boostDuration * BOOST_COOLDOWN_CONSUME_FRACTION;
=======
  cooldowns.boostRemaining = cooldowns.boostDuration;
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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
