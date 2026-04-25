import { describe, expect, it } from "vitest";
import { BOOST_ACTIVE_TIME, BOOST_COOLDOWN, BOOST_COOLDOWN_CONSUME_FRACTION, BOOST_SPEED_MULTIPLIER, getBoostSpeedMultiplier, tryActivateBoost } from "./boostAbility";
import type { Cooldowns } from "../types";

function createCooldowns(): Cooldowns {
  return {
    cannonRemaining: 0,
    cannonDuration: 5,
    boostRemaining: 0,
    boostDuration: BOOST_COOLDOWN,
    extraRemaining: 0,
    extraDuration: 0,
    boostActiveRemaining: 0,
    boostActiveDuration: BOOST_ACTIVE_TIME,
    invulnRemaining: 0,
    frenzyRemaining: 0,
  };
}

describe("tryActivateBoost", () => {
  it("starts boost and cooldown when ready", () => {
    const cooldowns = createCooldowns();
    const activated = tryActivateBoost(cooldowns);
    expect(activated).toBe(true);
    expect(cooldowns.boostRemaining).toBeCloseTo(BOOST_COOLDOWN * BOOST_COOLDOWN_CONSUME_FRACTION, 5);
    expect(cooldowns.boostActiveRemaining).toBe(BOOST_ACTIVE_TIME);
  });

  it("does not activate while recharging", () => {
    const cooldowns = createCooldowns();
    cooldowns.boostRemaining = 1.25;
    const activated = tryActivateBoost(cooldowns);
    expect(activated).toBe(false);
    expect(cooldowns.boostActiveRemaining).toBe(0);
  });
});

describe("getBoostSpeedMultiplier", () => {
  it("returns burst speed while boost is active", () => {
    const cooldowns = createCooldowns();
    cooldowns.boostActiveRemaining = 0.1;
    expect(getBoostSpeedMultiplier(cooldowns)).toBe(BOOST_SPEED_MULTIPLIER);
  });

  it("returns normal speed when boost is inactive", () => {
    const cooldowns = createCooldowns();
    expect(getBoostSpeedMultiplier(cooldowns)).toBe(1);
  });
});
