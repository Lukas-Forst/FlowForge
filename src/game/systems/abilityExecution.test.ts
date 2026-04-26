import { describe, expect, it } from "vitest";
import { triggerBoostAbility, triggerCannonAbility, triggerExtraAbility } from "./abilityExecution";
import type { FlashMessage, GameSnapshot } from "../types";

function makeSnapshot(): GameSnapshot {
  return {
    phase: "playing",
    loading: { progress: 1, label: "" },
    player: { position: { x: 0, y: 0 }, facing: 0, hp: 100, maxHp: 100, baseSpeed: 9 },
    enemies: [],
    harvestables: [],
    projectiles: [],
    delayedAoEs: [],
    mines: [],
    visualEffects: [],
    audioEvents: [],
    postFxPulse: null,
    pickups: [],
    upgrades: {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {} as GameSnapshot["upgrades"]["stacks"],
    },
    cooldowns: {
      cannonRemaining: 0,
      cannonDuration: 0,
      boostRemaining: 0,
      boostDuration: 0,
      extraRemaining: 0,
      extraDuration: 0,
      boostActiveRemaining: 0,
      boostActiveDuration: 0,
      invulnRemaining: 0,
      frenzyRemaining: 0,
    },
    stats: {
      timeSurvived: 0,
      enemiesKilled: 0,
      collectedCoins: 0,
      score: 0,
      longestUnscathedStreak: 0,
      currentUnscathedStreak: 0,
      biggestHit: 0,
      evolutionsUnlocked: 0,
    },
    pendingUpgradeOptions: [],
    pendingUpgradeContext: "levelup",
    message: null,
    vibePortal: { position: { x: 0, y: 0 }, visible: false, near: false, triggered: false },
    spawnIntensity: 0,
    runClock: { phase: "wave", phaseTime: 0, elapsedTotal: 0 },
    runBiome: "open_sea",
  };
}

describe("triggerCannonAbility", () => {
  it("fires cannon and pushes cannon audio event", () => {
    const snapshot = makeSnapshot();
    let message: FlashMessage | null = { text: "old", remaining: 1 };
    triggerCannonAbility(snapshot, { value: 1 }, { value: 1 }, (next) => {
      message = next;
    });

    expect(snapshot.projectiles.length).toBeGreaterThan(0);
    expect(snapshot.audioEvents.at(-1)?.sfx).toBe("cannon_fire");
    expect(message).toBeNull();
  });
});

describe("triggerBoostAbility", () => {
  it("sets phantom fleet timers when upgrade is present", () => {
    const snapshot = makeSnapshot();
    snapshot.upgrades.stacks.phantomFleet = 1;
    const phantomFleetRemainingRef = { value: 0 };
    const phantomFleetAttackTimerRef = { value: 0.24 };

    triggerBoostAbility(
      snapshot,
      { value: 1 },
      { value: 1 },
      phantomFleetRemainingRef,
      phantomFleetAttackTimerRef,
      8,
      () => {},
    );

    expect(phantomFleetRemainingRef.value).toBe(8);
    expect(phantomFleetAttackTimerRef.value).toBe(0.1);
  });

  it("spawns delayed mortar ring when ring barrage is stacked", () => {
    const snapshot = makeSnapshot();
    snapshot.upgrades.stacks.ringBarrage = 1;

    triggerBoostAbility(
      snapshot,
      { value: 1 },
      { value: 1 },
      { value: 0 },
      { value: 0.24 },
      8,
      () => {},
    );

    expect(snapshot.delayedAoEs).toHaveLength(10);
    expect(snapshot.delayedAoEs.every((aoe) => aoe.source === "player")).toBe(true);
    expect(snapshot.delayedAoEs.every((aoe) => aoe.visualType === "mortar")).toBe(true);
  });

  it("spawns sea mines when boostMines is stacked", () => {
    const snapshot = makeSnapshot();
    snapshot.upgrades.stacks.boostMines = 1;

    triggerBoostAbility(
      snapshot,
      { value: 1 },
      { value: 1 },
      { value: 0 },
      { value: 0.24 },
      8,
      () => {},
    );

    expect(snapshot.mines).toHaveLength(3);
  });
});

describe("triggerExtraAbility", () => {
  it("spawns delayed depth charge and starts cooldown", () => {
    const snapshot = makeSnapshot();
    snapshot.upgrades.stacks.extraDepthCharge = 1;
    triggerExtraAbility(snapshot, { value: 1 }, { value: 1 }, () => {});
    expect(snapshot.delayedAoEs).toHaveLength(1);
    expect(snapshot.delayedAoEs[0]?.visualType).toBe("depthCharge");
    expect(snapshot.cooldowns.extraRemaining).toBeGreaterThan(0);
  });

  it("fires torpedo projectile when extraTorpedo is unlocked", () => {
    const snapshot = makeSnapshot();
    snapshot.upgrades.stacks.extraTorpedo = 1;
    triggerExtraAbility(snapshot, { value: 1 }, { value: 1 }, () => {});
    expect(snapshot.projectiles).toHaveLength(1);
    expect(snapshot.projectiles[0]?.kind).toBe("playerTorpedo");
    expect(snapshot.delayedAoEs).toHaveLength(0);
  });
});
