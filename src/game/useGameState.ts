import { useCallback, useRef, useState } from "react";
import {
  BASE_AUTO_ATTACK_INTERVAL,
  BASE_CANNON_COOLDOWN,
  BOOST_ACTIVE_TIME,
  BOOST_COOLDOWN,
  BASE_PLAYER_HP,
  BASE_PLAYER_SPEED,
} from "./constants";
import { runAutoAttack } from "./systems/autoAttack";
import { getBoostSpeedMultiplier, tryActivateBoost } from "./systems/boostAbility";
import { tryFireCannon } from "./systems/cannonAbility";
import { triggerExtraAbility } from "./systems/abilityExecution";
import { resolveCollisions, updateEnemyMovement, updateProjectileMotion } from "./systems/collision";
import { updateDelayedAoEs } from "./systems/delayedAoE";
import { runEliteAbilities } from "./systems/eliteAbilities";
import { processPickups } from "./systems/pickups";
import { updateSeaMines } from "./systems/seaMines";
import { updateOilSlicks } from "./systems/oilSlick";
import { runEnemyRangedAttacks } from "./systems/enemyRanged";
import { getRunArcEnemyCap, computeRunSpawnIntensity, getRunRegionBiome } from "./systems/runArc";
import { spawnEnemiesToCap, updateEnemySpawning } from "./systems/enemySpawner";
import { runBossAttacks, updateMegaBossEncounter } from "./systems/bossSpawner";
import { updateHarvestableSpawning } from "./systems/harvestableSpawner";
import { updatePlayerMovement } from "./systems/playerController";
import {
  applyDamageMitigation,
  applyEliteExtraAbilitySelection,
  applyUpgrade,
  buildEliteExtraAbilityChoices,
  buildUpgradeChoices,
  countEvolutionStacks,
  emitLevelUpEvents,
  retargetNextUpgradeThreshold,
} from "./systems/upgrades";
import { BASE_PASSIVE_BROADSIDE_INTERVAL, UPGRADE_OPTIONS } from "./constants";
import type { FlashMessage, GameSnapshot, MovementKey, MultiplayerWorldState, RunRecord, UpgradeType } from "./types";
import { runPassiveBroadside } from "./systems/passiveBroadside";
import { directionFromAngle, distance, perpRight } from "./utils";

const VIBE_PORTAL_UNLOCK_TIME = 120;
const VIBE_PORTAL_NEAR_DISTANCE = 8;
const VIBE_PORTAL_TRIGGER_DISTANCE = 2.4;
const VIBE_PORTAL_POSITION = { x: 36, y: -28 } as const;
const SACRIFICE_RIG_PERIOD = 28;
const TIDAL_SWEEP_PERIOD = 8;
const KRAKEN_ACTIVE_TIME = 15;
const PHANTOM_FLEET_ACTIVE_TIME = 8;
const DRONE_SWARM_ACTIVE_TIME = 10;

export function decayPostFxPulse(
  pulse: GameSnapshot["postFxPulse"],
  delta: number,
): GameSnapshot["postFxPulse"] {
  if (!pulse) return null;
  const remaining = pulse.remaining - delta;
  if (remaining <= 0) return null;
  return { ...pulse, remaining };
}

export function shouldAdvanceSimThisTick(phase: GameSnapshot["phase"]): boolean {
  return phase === "playing" || phase === "upgrade";
}

function spawnRadialBarrage(
  count: number,
  speed: number,
  damage: number,
  ttl: number,
  projectileIdRef: { value: number },
  projectiles: GameSnapshot["projectiles"],
  origin: { x: number; y: number },
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const dir = directionFromAngle(angle);
    projectiles.push({
      id: projectileIdRef.value++,
      kind: "playerCannon",
      position: { x: origin.x, y: origin.y },
      velocity: { x: dir.x * speed, y: dir.y * speed },
      ttl,
      damage,
      radius: 0.36,
      pierceRemaining: 0,
    });
  }
}

function createInitialSnapshot(phase: GameSnapshot["phase"] = "loading"): GameSnapshot {
  return {
    phase,
    loading: { progress: 0, label: "" },
    player: {
      position: { x: 0, y: 0 },
      facing: 0,
      hp: BASE_PLAYER_HP,
      maxHp: BASE_PLAYER_HP,
      baseSpeed: BASE_PLAYER_SPEED,
    },
    enemies: [],
    harvestables: [],
    projectiles: [],
    delayedAoEs: [],
    mines: [],
    oilSlicks: [],
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
      stacks: {} as Record<UpgradeType, number>,
      activeCannonAbility: "cannon",
      activeBoostAbility: "boost",
      activeExtraAbility: null,
    },
    cooldowns: {
      cannonRemaining: 0,
      cannonDuration: BASE_CANNON_COOLDOWN,
      boostRemaining: 0,
      boostDuration: BOOST_COOLDOWN,
      boostActiveRemaining: 0,
      boostActiveDuration: BOOST_ACTIVE_TIME,
      extraRemaining: 0,
      extraDuration: 12,
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
      killStreak: 0,
      killStreakBest: 0,
      killStreakFlash: false,
    },
    pendingUpgradeOptions: [],
    pendingUpgradeContext: "levelup",
    message: null,
    vibePortal: {
      position: { x: VIBE_PORTAL_POSITION.x, y: VIBE_PORTAL_POSITION.y },
      visible: false,
      near: false,
      triggered: false,
    },
    spawnIntensity: 0,
    runClock: {
      phase: "wave",
      phaseTime: 0,
      elapsedTotal: 0,
    },
    runBiome: "open_sea",
    megaBoss: null,
  };
}

function copySnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    loading: { ...snapshot.loading },
    player: { ...snapshot.player, position: { ...snapshot.player.position } },
    enemies: snapshot.enemies.map((enemy) => ({ ...enemy, position: { ...enemy.position } })),
    harvestables: snapshot.harvestables.map((h) => ({ ...h, position: { ...h.position } })),
    projectiles: snapshot.projectiles.map((projectile) => ({
      ...projectile,
      position: { ...projectile.position },
      velocity: { ...projectile.velocity },
    })),
    delayedAoEs: snapshot.delayedAoEs.map((aoe) => ({
      ...aoe,
      position: { ...aoe.position },
    })),
    mines: snapshot.mines.map((mine) => ({
      ...mine,
      position: { ...mine.position },
      velocity: { ...mine.velocity },
    })),
    oilSlicks: snapshot.oilSlicks.map((slick) => ({ ...slick, position: { ...slick.position } })),
    visualEffects: snapshot.visualEffects.map((effect) => ({
      ...effect,
      position: { ...effect.position },
    })),
    audioEvents: snapshot.audioEvents.map((audio) => ({ ...audio })),
    postFxPulse: snapshot.postFxPulse ? { ...snapshot.postFxPulse } : null,
    pickups: snapshot.pickups.map((pickup) => ({ ...pickup, position: { ...pickup.position } })),
    upgrades: { ...snapshot.upgrades },
    cooldowns: { ...snapshot.cooldowns },
    stats: { ...snapshot.stats },
    pendingUpgradeOptions: snapshot.pendingUpgradeOptions.map((option) => ({ ...option })),
    pendingUpgradeContext: snapshot.pendingUpgradeContext,
    message: snapshot.message ? { ...snapshot.message } : null,
    vibePortal: {
      ...snapshot.vibePortal,
      position: { ...snapshot.vibePortal.position },
    },
    runClock: { ...snapshot.runClock },
  };
}

export interface UseGameStateApi {
  snapshot: GameSnapshot;
  startRun: () => void;
  restartRun: () => void;
  setMovementKey: (key: MovementKey, pressed: boolean) => void;
  triggerCannon: () => void;
  triggerBoost: () => void;
  triggerExtra: () => void;
  chooseUpgrade: (type: UpgradeType) => void;
  togglePause: () => void;
  quitRun: () => void;
  tick: (delta: number) => void;
  applyMultiplayerWorld: (world: MultiplayerWorldState) => void;
  finishLoading: () => void;
  setLoadingProgress: (progress: number, label: string) => void;
  consumeAudioEvents: () => GameSnapshot["audioEvents"];
}

export function useGameState(): UseGameStateApi {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialSnapshot("loading"));
  const stateRef = useRef<GameSnapshot>(snapshot);
  const inputRef = useRef({ w: false, a: false, s: false, d: false });
  const enemyIdRef = useRef({ value: 1 });
  const harvestableIdRef = useRef({ value: 1 });
  const projectileIdRef = useRef({ value: 1 });
  const pickupIdRef = useRef({ value: 1 });
  const effectIdRef = useRef({ value: 1 });
  const delayedAoEIdRef = useRef({ value: 1 });
  const mineIdRef = useRef({ value: 1 });
  const oilSlickIdRef = useRef({ value: 1 });
  const cannonReadyRef = useRef({ value: false });
  const spawnTimerRef = useRef({ value: 0.2 });
  const autoAttackTimerRef = useRef({ value: BASE_AUTO_ATTACK_INTERVAL });
  const passiveBroadsideTimerRef = useRef({ value: BASE_PASSIVE_BROADSIDE_INTERVAL });
  const hitPauseTimerRef = useRef({ value: 0 });
  const megaBossSpawnedRef = useRef({ value: false });
  const bilgePumpTimerRef = useRef({ value: 0 });
  const sacrificeRigTimerRef = useRef({ value: SACRIFICE_RIG_PERIOD });
  const tidalSweepTimerRef = useRef({ value: TIDAL_SWEEP_PERIOD });
  const pressGangNextKillRef = useRef({ value: 20 });
  const krakenAttackTimerRef = useRef({ value: 0 });
  const krakenRemainingRef = useRef({ value: 0 });
  const krakenUsedRef = useRef({ value: false });
  const phantomFleetRemainingRef = useRef({ value: 0 });
  const phantomFleetAttackTimerRef = useRef({ value: 0.24 });
  const droneSwarmRemainingRef = useRef({ value: 0 });
  const droneSwarmAttackTimerRef = useRef({ value: 0.2 });
  const killStreakRef = useRef({ value: 0 });
  const killStreakFlashRef = useRef({ value: false });
  const lastPlayerPosRef = useRef({ x: 0, y: 0 });
  const playerWakeTimerRef = useRef({ value: 0 });

  const syncState = useCallback(() => {
    setSnapshot(copySnapshot(stateRef.current));
  }, []);

  const setMessage = useCallback((message: FlashMessage | null) => {
    stateRef.current.message = message;
  }, []);

  const resetForRun = useCallback((phase: GameSnapshot["phase"]) => {
    stateRef.current = createInitialSnapshot(phase);
    // Keep held movement input across phase transitions (e.g. Enter while holding W).
    enemyIdRef.current.value = 1;
    harvestableIdRef.current.value = 1;
    projectileIdRef.current.value = 1;
    pickupIdRef.current.value = 1;
    effectIdRef.current.value = 1;
    delayedAoEIdRef.current.value = 1;
    mineIdRef.current.value = 1;
    oilSlickIdRef.current.value = 1;
    spawnTimerRef.current.value = 0.2;
    autoAttackTimerRef.current.value = BASE_AUTO_ATTACK_INTERVAL;
    passiveBroadsideTimerRef.current.value = BASE_PASSIVE_BROADSIDE_INTERVAL;
    hitPauseTimerRef.current.value = 0;
    megaBossSpawnedRef.current.value = false;
    bilgePumpTimerRef.current.value = 0;
    sacrificeRigTimerRef.current.value = SACRIFICE_RIG_PERIOD;
    tidalSweepTimerRef.current.value = TIDAL_SWEEP_PERIOD;
    pressGangNextKillRef.current.value = 20;
    krakenAttackTimerRef.current.value = 0;
    krakenRemainingRef.current.value = 0;
    krakenUsedRef.current.value = false;
    phantomFleetRemainingRef.current.value = 0;
    phantomFleetAttackTimerRef.current.value = 0.24;
    droneSwarmRemainingRef.current.value = 0;
    droneSwarmAttackTimerRef.current.value = 0.2;
    syncState();
  }, [syncState]);

  const startRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getRunArcEnemyCap(0, { hasMegaBoss: false, legacyBossPhase: false });
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap, state.runClock.phase);
    syncState();
  }, [resetForRun]);

  const restartRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getRunArcEnemyCap(0, { hasMegaBoss: false, legacyBossPhase: false });
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap, state.runClock.phase);
    syncState();
  }, [resetForRun]);

  const setMovementKey = useCallback((key: MovementKey, pressed: boolean) => {
    inputRef.current[key] = pressed;
  }, []);

  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === "playing") {
      state.phase = "paused";
      syncState();
    } else if (state.phase === "paused") {
      state.phase = "playing";
      syncState();
    }
  }, [syncState]);

  const quitRun = useCallback(() => {
    const state = stateRef.current;
    const best = Number(localStorage.getItem("flowforge.best") || 0);
    localStorage.setItem("flowforge.best", Math.max(best, state.stats.score).toString());
    resetForRun("start");
    syncState();
  }, [resetForRun, syncState]);

  const triggerCannon = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") {
      return;
    }
    let fired = false;
    switch (state.upgrades.activeCannonAbility ?? "cannon") {
      case "drones":
        if (state.cooldowns.cannonRemaining <= 0) {
          state.cooldowns.cannonDuration = Math.max(3.5, 8 * state.upgrades.cooldownMult);
          state.cooldowns.cannonRemaining = state.cooldowns.cannonDuration;
          droneSwarmRemainingRef.current.value = DRONE_SWARM_ACTIVE_TIME;
          droneSwarmAttackTimerRef.current.value = 0.12;
          fired = true;
        }
        break;
      case "chainShot":
        if (state.cooldowns.cannonRemaining <= 0) {
          const dir = directionFromAngle(state.player.facing);
          state.projectiles.push({
            id: projectileIdRef.current.value++,
            kind: "playerCannon",
            position: { x: state.player.position.x + dir.x * 1.1, y: state.player.position.y + dir.y * 1.1 },
            velocity: { x: dir.x * 20, y: dir.y * 20 },
            ttl: 2.2,
            damage: 68,
            radius: 0.55,
            pierceRemaining: 99,
          });
          state.cooldowns.cannonDuration = Math.max(2.5, 7 * state.upgrades.cooldownMult);
          state.cooldowns.cannonRemaining = state.cooldowns.cannonDuration;
          fired = true;
        }
        break;
      case "flare":
        if (state.cooldowns.cannonRemaining <= 0) {
          spawnRadialBarrage(7, 12, 24, 1.1, projectileIdRef.current, state.projectiles, state.player.position);
          state.cooldowns.cannonDuration = Math.max(3.5, 9 * state.upgrades.cooldownMult);
          state.cooldowns.cannonRemaining = state.cooldowns.cannonDuration;
          fired = true;
        }
        break;
      case "cannon":
      default:
        fired = tryFireCannon(
          state.player,
          state.cooldowns,
          projectileIdRef.current,
          state.upgrades.cooldownMult,
          state.projectiles,
          state.visualEffects,
          effectIdRef.current,
          state.upgrades.stacks.cannonSpread ?? 0,
        );
        break;
    }
    if (!fired) {
      setMessage({
        text: "Cannons reloading...",
        remaining: 0.8,
      });
    } else {
      state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "cannon_fire" });
      setMessage(null);
    }
    syncState();
  }, [setMessage, syncState]);

  const triggerBoost = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") {
      return;
    }
    let boosted = false;
    switch (state.upgrades.activeBoostAbility ?? "boost") {
      case "mines": {
        if (state.cooldowns.boostRemaining <= 0) {
          const forward = directionFromAngle(state.player.facing);
          const right = perpRight(forward);
          const spawn = (lat: number, back: number): void => {
            const p = {
              x: state.player.position.x + right.x * lat - forward.x * back,
              y: state.player.position.y + right.y * lat - forward.y * back,
            };
            state.projectiles.push({
              id: projectileIdRef.current.value++,
              kind: "playerCannon",
              position: p,
              velocity: { x: -forward.x * 2, y: -forward.y * 2 },
              ttl: 8,
              damage: 60,
              radius: 0.5,
            });
          };
          spawn(-0.9, 1.6);
          spawn(0, 2.1);
          spawn(0.9, 1.6);
          state.cooldowns.boostDuration = Math.max(4.5, 10 * state.upgrades.cooldownMult);
          state.cooldowns.boostRemaining = state.cooldowns.boostDuration;
          boosted = true;
        }
        break;
      }
      case "ringBarrage":
        if (state.cooldowns.boostRemaining <= 0) {
          spawnRadialBarrage(10, 9, 35, 2.4, projectileIdRef.current, state.projectiles, state.player.position);
          state.cooldowns.boostDuration = Math.max(4.5, 10 * state.upgrades.cooldownMult);
          state.cooldowns.boostRemaining = state.cooldowns.boostDuration;
          boosted = true;
        }
        break;
      case "anchorDrop":
        if (state.cooldowns.boostRemaining <= 0) {
          spawnRadialBarrage(8, 7.5, 45, 1.2, projectileIdRef.current, state.projectiles, state.player.position);
          state.cooldowns.boostDuration = Math.max(3.5, 9 * state.upgrades.cooldownMult);
          state.cooldowns.boostRemaining = state.cooldowns.boostDuration;
          boosted = true;
        }
        break;
      case "boost":
      default:
        boosted = tryActivateBoost(state.cooldowns, state.upgrades.cooldownMult);
        break;
    }
    if (!boosted) {
      setMessage({
        text: "Boost recharging...",
        remaining: 0.65,
      });
    } else {
      if ((state.upgrades.stacks.boostRepeat ?? 0) > 0) {
        state.cooldowns.boostActiveRemaining = Math.max(
          state.cooldowns.boostActiveRemaining,
          state.cooldowns.boostActiveDuration * 1.5,
        );
      }
      if ((state.upgrades.stacks.ghostHull ?? 0) > 0) {
        state.cooldowns.invulnRemaining = Math.max(state.cooldowns.invulnRemaining, 1.25);
      }
      if ((state.upgrades.stacks.ghostTide ?? 0) > 0) {
        state.cooldowns.boostRemaining = Math.min(state.cooldowns.boostRemaining, 0.45);
      }
      if ((state.upgrades.stacks.phantomFleet ?? 0) > 0) {
        phantomFleetRemainingRef.current.value = PHANTOM_FLEET_ACTIVE_TIME;
        phantomFleetAttackTimerRef.current.value = 0.1;
      }
      setMessage(null);
    }
    syncState();
  }, [setMessage, syncState]);

  const triggerExtra = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") {
      return;
    }
    triggerExtraAbility(state, projectileIdRef.current, delayedAoEIdRef.current, oilSlickIdRef.current, setMessage);
    syncState();
  }, [setMessage, syncState]);

  const chooseUpgrade = useCallback((type: UpgradeType) => {
    const state = stateRef.current;
    if (state.phase !== "upgrade") {
      return;
    }
    if (state.pendingUpgradeContext === "eliteExtra") {
      applyEliteExtraAbilitySelection(state.upgrades, type);
      setMessage({ text: "Elite spoils claimed: E ability equipped!", remaining: 1.1 });
    } else {
      applyUpgrade(state.upgrades, type);
      if (type === "maxHp") {
        state.player.maxHp += 25;
        state.player.hp = state.player.maxHp;
      }
      retargetNextUpgradeThreshold(state.upgrades, state.stats.collectedCoins);
      if (type === "krakenCall" && !krakenUsedRef.current.value) {
        krakenUsedRef.current.value = true;
        krakenRemainingRef.current.value = KRAKEN_ACTIVE_TIME;
        krakenAttackTimerRef.current.value = 0.12;
      }
      state.postFxPulse = emitLevelUpEvents(
        state.player.position,
        state.audioEvents,
        state.visualEffects,
        effectIdRef.current,
      );
      setMessage({ text: `${type} upgraded!`, remaining: 0.8 });
    }
    state.phase = "playing";
    state.pendingUpgradeOptions = [];
    state.pendingUpgradeContext = "levelup";
    syncState();
  }, [setMessage, syncState]);

  const finishLoading = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === "loading") {
      state.phase = "start";
      state.loading = { progress: 1, label: "" };
      syncState();
    }
  }, [syncState]);

  const setLoadingProgress = useCallback((progress: number, label: string) => {
    const state = stateRef.current;
    state.loading = { progress: Math.max(0, Math.min(1, progress)), label };
    syncState();
  }, [syncState]);

  const applyMultiplayerWorld = useCallback((world: MultiplayerWorldState) => {
    const state = stateRef.current;
    state.runClock = {
      phase: world.runClock.phase,
      phaseTime: world.runClock.phaseTime,
      elapsedTotal: world.runClock.elapsedTotal,
    };
    state.runBiome = world.runBiome;
    state.spawnIntensity = world.spawnIntensity;
    state.enemies = world.enemies.map((enemy) => ({
      ...enemy,
      position: { ...enemy.position },
    }));
    state.pickups = world.pickups.map((pickup) => ({
      ...pickup,
      position: { ...pickup.position },
    }));
    state.stats.collectedCoins = world.sharedCoins;
    syncState();
  }, [syncState]);

  const consumeAudioEvents = useCallback(() => {
    const state = stateRef.current;
    if (state.audioEvents.length === 0) return [];
    const queue = state.audioEvents;
    state.audioEvents = [];
    return queue;
  }, []);

  const tick = useCallback((delta: number) => {
    const state = stateRef.current;
    const step = Number.isFinite(delta) ? Math.max(0, Math.min(0.05, delta)) : 0;
    state.postFxPulse = decayPostFxPulse(state.postFxPulse, step);

    if (state.message) {
      state.message.remaining -= step;
      if (state.message.remaining <= 0) {
        state.message = null;
      }
    }

    if (!shouldAdvanceSimThisTick(state.phase)) {
      syncState();
      return;
    }

    if (hitPauseTimerRef.current.value > 0) {
      hitPauseTimerRef.current.value -= step;
      syncState();
      return;
    }

    state.stats.timeSurvived += step;
    const evoN = countEvolutionStacks(state.upgrades);
    state.stats.evolutionsUnlocked = evoN;
    state.stats.score = Math.floor(
      state.stats.timeSurvived * 100 + state.stats.enemiesKilled * 25 + state.stats.collectedCoins * 2 + evoN * 500
    );
    state.cooldowns.cannonRemaining = Math.max(0, state.cooldowns.cannonRemaining - step);
    state.cooldowns.boostRemaining = Math.max(0, state.cooldowns.boostRemaining - step);

    state.cooldowns.boostActiveRemaining = Math.max(0, state.cooldowns.boostActiveRemaining - step);
    state.cooldowns.extraRemaining = Math.max(0, (state.cooldowns.extraRemaining ?? 0) - step);
    state.cooldowns.invulnRemaining = Math.max(0, state.cooldowns.invulnRemaining - step);
    state.cooldowns.frenzyRemaining = Math.max(0, state.cooldowns.frenzyRemaining - step);

    // Kill streak tracking — snapshot kills before this tick's damage sources so we can detect actual kills.
    const killsBefore = state.stats.enemiesKilled;

    // Cannon ready glow effect
    const cannonIsReady = state.cooldowns.cannonRemaining === 0;
    if (cannonIsReady && !cannonReadyRef.current.value) {
      cannonReadyRef.current.value = true;
      state.visualEffects.push({
        id: effectIdRef.current.value++,
        kind: "cannonReady",
        position: { x: state.player.position.x, y: state.player.position.y },
        remaining: 999,
      });
    } else if (!cannonIsReady && cannonReadyRef.current.value) {
      cannonReadyRef.current.value = false;
      for (let i = state.visualEffects.length - 1; i >= 0; i--) {
        if (state.visualEffects[i].kind === "cannonReady") {
          state.visualEffects.splice(i, 1);
        }
      }
    } else if (cannonIsReady) {
      for (const fx of state.visualEffects) {
        if (fx.kind === "cannonReady") {
          fx.position.x = state.player.position.x;
          fx.position.y = state.player.position.y;
        }
      }
    }

    const rc = state.runClock;
    rc.elapsedTotal += step;
    rc.phaseTime += step;

    const portal = state.vibePortal;
    portal.visible = rc.elapsedTotal >= VIBE_PORTAL_UNLOCK_TIME;
    if (!portal.visible || portal.triggered) {
      portal.near = false;
    } else {
      const dx = state.player.position.x - portal.position.x;
      const dy = state.player.position.y - portal.position.y;
      const dist = Math.hypot(dx, dy);
      portal.near = dist <= VIBE_PORTAL_NEAR_DISTANCE;
      if (state.phase === "playing" && dist <= VIBE_PORTAL_TRIGGER_DISTANCE) {
        portal.triggered = true;
        portal.near = false;
        setMessage({ text: "Sailing to the Vibe Portal...", remaining: 1.2 });
      }
    }

    if (rc.phase === "wave" && rc.phaseTime >= 60) {
      rc.phase = "elite";
      rc.phaseTime = 0;
      setMessage({ text: "Elite surge — chest nearby, expect gold-flag ships!", remaining: 2.6 });
      // Spawn chest reward
      const a1 = Math.random() * Math.PI * 2;
      state.pickups.push({
        id: pickupIdRef.current.value++,
        kind: "chest",
        position: { x: state.player.position.x + Math.cos(a1) * 15, y: state.player.position.y + Math.sin(a1) * 15 },
        value: 0
      });
    } else if (rc.phase === "elite" && rc.phaseTime >= 10) {
      rc.phase = "lull";
      rc.phaseTime = 0;
      setMessage({ text: "Lull — few foes, supply drop incoming.", remaining: 2.2 });
      // Spawn supply drop reward
      const a2 = Math.random() * Math.PI * 2;
      const supplyKind = Math.random() < 0.34 ? "supply_heal" : Math.random() < 0.5 ? "supply_frenzy" : "supply_invuln";
      state.pickups.push({
        id: pickupIdRef.current.value++,
        kind: supplyKind,
        position: { x: state.player.position.x + Math.cos(a2) * 12, y: state.player.position.y + Math.sin(a2) * 12 },
        value: 0
      });
    } else if (rc.phase === "lull" && rc.phaseTime >= 15) {
      rc.phase = "wave";
      rc.phaseTime = 0;
      setMessage({ text: "Wave resuming — full pressure returns.", remaining: 1.8 });
    }

    state.runBiome = getRunRegionBiome(rc.elapsedTotal);

    const ghostTideSpeedBoost = (state.upgrades.stacks.ghostTide ?? 0) > 0 ? 1.6 : 1;
    updatePlayerMovement(
      state.player,
      inputRef.current,
      step,
      state.upgrades.speedMult * ghostTideSpeedBoost * getBoostSpeedMultiplier(state.cooldowns),
    );

    // Player wake effect — ripples trailing behind moving ship
    const dx = state.player.position.x - lastPlayerPosRef.current.x;
    const dy = state.player.position.y - lastPlayerPosRef.current.y;
    const isMoving = Math.hypot(dx, dy) > 0.01;
    lastPlayerPosRef.current.x = state.player.position.x;
    lastPlayerPosRef.current.y = state.player.position.y;
    if (isMoving) {
      playerWakeTimerRef.current.value -= step;
      if (playerWakeTimerRef.current.value <= 0) {
        playerWakeTimerRef.current.value = 0.22;
        // Spawn wake slightly behind the player based on facing
        const behindX = state.player.position.x - Math.sin(state.player.facing) * 0.9;
        const behindY = state.player.position.y - Math.cos(state.player.facing) * 0.9;
        state.visualEffects.push({
          id: effectIdRef.current.value++,
          kind: "playerWake",
          position: { x: behindX, y: behindY },
          remaining: 1.8,
        });
      }
    }

    const fullSteamActive = (state.upgrades.stacks.fullSteam ?? 0) > 0 && state.cooldowns.boostActiveRemaining > 0;
    runAutoAttack(
      state.enemies,
      state.player,
      projectileIdRef.current,
      autoAttackTimerRef.current,
      state.upgrades.fireRateMult,
      state.projectiles,
      state.visualEffects,
      effectIdRef.current,
      step,
      state.cooldowns.frenzyRemaining > 0 || fullSteamActive,
      state.upgrades.stacks.projectileCount ?? 0,
      state.upgrades.stacks.pierce ?? 0,
      state.upgrades.stacks.sternChaser ?? 0,
      state.upgrades.stacks.grapeshot ?? 0,
      state.upgrades.stacks.explosiveRounds ?? 0,
      state.upgrades.stacks.deathBlossom ?? 0,
    );
    if (droneSwarmRemainingRef.current.value > 0 && state.enemies.length > 0) {
      droneSwarmRemainingRef.current.value = Math.max(0, droneSwarmRemainingRef.current.value - step);
      droneSwarmAttackTimerRef.current.value -= step;
      if (droneSwarmAttackTimerRef.current.value <= 0) {
        droneSwarmAttackTimerRef.current.value = 0.18;
        const droneCount = 3;
        for (let i = 0; i < droneCount; i += 1) {
          const angle = state.player.facing + (Math.PI * 2 * i) / droneCount;
          const dir = directionFromAngle(angle);
          state.projectiles.push({
            id: projectileIdRef.current.value++,
            kind: "playerAuto",
            position: { x: state.player.position.x + dir.x * 1.4, y: state.player.position.y + dir.y * 1.4 },
            velocity: { x: dir.x * 18, y: dir.y * 18 },
            ttl: 0.9,
            damage: 16,
            radius: 0.28,
            pierceRemaining: 0,
          });
        }
      }
    }
    runPassiveBroadside(
      state.player,
      state.upgrades,
      passiveBroadsideTimerRef.current,
      projectileIdRef.current,
      state.projectiles,
      state.visualEffects,
      effectIdRef.current,
      step,
    );
    const spawnInt = computeRunSpawnIntensity(rc.elapsedTotal);
    state.spawnIntensity = Math.max(
      spawnInt,
      updateEnemySpawning(
      state.enemies,
      enemyIdRef.current,
      spawnTimerRef.current,
      state.stats.timeSurvived,
      step,
      state.player.position,
      rc.phase,
      ),
    );
    const hadBoss = state.enemies.some((e) => e.type === "boss");
    updateMegaBossEncounter(
      state.enemies,
      enemyIdRef.current,
      state.player.position,
      rc.elapsedTotal,
      megaBossSpawnedRef.current,
    );
    const hasBoss = state.enemies.some((e) => e.type === "boss");
    if (!hadBoss && hasBoss) {
      state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "boss_cue", volume: 1.2 });
      state.megaBoss = { spawned: true, introRemaining: 2.0, name: "STORM LEVIATHAN" };
    }
    if (state.megaBoss) {
      if (state.megaBoss.introRemaining > 0) {
        state.megaBoss.introRemaining = Math.max(0, state.megaBoss.introRemaining - step);
      }
      if (!hasBoss) {
        state.megaBoss = null;
      }
    }
    updateHarvestableSpawning(
      state.harvestables,
      harvestableIdRef.current,
      state.player.position,
      state.stats.timeSurvived,
      step,
    );
    updateEnemyMovement(state.enemies, state.player, step);
    runEliteAbilities(
      state.enemies,
      state.player,
      projectileIdRef.current,
      state.projectiles,
      state.delayedAoEs,
      delayedAoEIdRef.current,
      state.visualEffects,
      effectIdRef.current,
      step,
    );
    runEnemyRangedAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, step);
    runBossAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, step);
    updateProjectileMotion(state.projectiles, state.player.position, step, state.visualEffects, effectIdRef.current);
    const delayedAoEResult = updateDelayedAoEs(
      state.delayedAoEs,
      state.enemies,
      state.player,
      state.visualEffects,
      effectIdRef.current,
      step,
    );
    state.stats.enemiesKilled += delayedAoEResult.enemyKills;
    const seaMineResult = updateSeaMines(
      state.mines,
      state.enemies,
      state.visualEffects,
      effectIdRef.current,
      step,
    );
    state.stats.enemiesKilled += seaMineResult.enemyKills;
    const oilSlickResult = updateOilSlicks(
      state.oilSlicks,
      state.enemies,
      state.visualEffects,
      effectIdRef.current,
      step,
    );
    state.stats.enemiesKilled += oilSlickResult.enemyKills;

    bilgePumpTimerRef.current.value += step;
    if (bilgePumpTimerRef.current.value >= 1) {
      bilgePumpTimerRef.current.value -= 1;
      const regen = (state.upgrades.stacks.bilgePump ?? 0) + ((state.upgrades.stacks.ironclad ?? 0) > 0 ? 1 : 0);
      if (regen > 0) {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + regen);
      }
    }

    sacrificeRigTimerRef.current.value -= step;
    if (
      (state.upgrades.stacks.sacrificeRig ?? 0) > 0 &&
      sacrificeRigTimerRef.current.value <= 0 &&
      state.player.hp > 28
    ) {
      sacrificeRigTimerRef.current.value = SACRIFICE_RIG_PERIOD;
      state.player.hp = Math.max(1, state.player.hp - 20);
      for (let i = 0; i < 12; i += 1) {
        const angle = (Math.PI * 2 * i) / 12;
        state.pickups.push({
          id: pickupIdRef.current.value++,
          kind: "coin",
          position: { x: state.player.position.x + Math.cos(angle) * 2.3, y: state.player.position.y + Math.sin(angle) * 2.3 },
          value: 2,
        });
      }
      state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "upgrade_sting" });
    }

    tidalSweepTimerRef.current.value -= step;
    if ((state.upgrades.stacks.tidalSweep ?? 0) > 0 && tidalSweepTimerRef.current.value <= 0) {
      tidalSweepTimerRef.current.value = TIDAL_SWEEP_PERIOD;
      for (const pickup of state.pickups) {
        pickup.position.x = state.player.position.x + (Math.random() - 0.5) * 0.4;
        pickup.position.y = state.player.position.y + (Math.random() - 0.5) * 0.4;
      }
    }

    if (state.cooldowns.boostActiveRemaining > 0 && (state.upgrades.stacks.afterburner ?? 0) > 0) {
      const burnDps = 18 + (state.upgrades.stacks.afterburner ?? 0) * 14 + ((state.upgrades.stacks.hellfireWake ?? 0) > 0 ? 18 : 0);
      const burnRadius = (state.upgrades.stacks.hellfireWake ?? 0) > 0 ? 2.5 : 1.6;
      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        if (distance(enemy.position, state.player.position) <= burnRadius) {
          enemy.hp -= burnDps * step;
          if (enemy.hp <= 0) {
            state.enemies.splice(i, 1);
            state.stats.enemiesKilled += 1;
            state.pickups.push({
              id: pickupIdRef.current.value++,
              kind: "coin",
              position: { ...enemy.position },
              value: 1 + (state.upgrades.stacks.crowsNest ?? 0),
            });
          }
        }
      }
    }

    if (krakenRemainingRef.current.value > 0) {
      krakenRemainingRef.current.value = Math.max(0, krakenRemainingRef.current.value - step);
      krakenAttackTimerRef.current.value -= step;
      if (krakenAttackTimerRef.current.value <= 0) {
        krakenAttackTimerRef.current.value = 0.35;
        const krakenHits = 2 + ((state.upgrades.stacks.fullSteam ?? 0) > 0 ? 1 : 0);
        for (let hit = 0; hit < krakenHits; hit += 1) {
          let targetIndex = -1;
          let targetDistance = Number.POSITIVE_INFINITY;
          for (let i = 0; i < state.enemies.length; i += 1) {
            const d = distance(state.enemies[i].position, state.player.position);
            if (d < 18 && d < targetDistance) {
              targetDistance = d;
              targetIndex = i;
            }
          }
          if (targetIndex >= 0) {
            const target = state.enemies[targetIndex];
            target.hp -= 42;
            state.visualEffects.push({
              id: effectIdRef.current.value++,
              kind: "hitBurst",
              position: { ...target.position },
              remaining: 0.35,
              color: "#5ef3ff",
            });
            if (target.hp <= 0) {
              state.enemies.splice(targetIndex, 1);
              state.stats.enemiesKilled += 1;
              state.pickups.push({
                id: pickupIdRef.current.value++,
                kind: "coin",
                position: { ...target.position },
                value: 1,
              });
            }
          }
        }
      }
    }

    if (phantomFleetRemainingRef.current.value > 0 && (state.upgrades.stacks.phantomFleet ?? 0) > 0) {
      phantomFleetRemainingRef.current.value = Math.max(0, phantomFleetRemainingRef.current.value - step);
      phantomFleetAttackTimerRef.current.value -= step;
      if (phantomFleetAttackTimerRef.current.value <= 0) {
        phantomFleetAttackTimerRef.current.value = 0.28;
        const forward = { x: Math.cos(state.player.facing), y: Math.sin(state.player.facing) };
        const right = { x: -forward.y, y: forward.x };
        const offsets = [-1.15, 1.15];
        for (const offset of offsets) {
          const origin = {
            x: state.player.position.x + right.x * offset - forward.x * 1.2,
            y: state.player.position.y + right.y * offset - forward.y * 1.2,
          };
          state.projectiles.push({
            id: projectileIdRef.current.value++,
            kind: "playerAuto",
            position: origin,
            velocity: { x: forward.x * 20, y: forward.y * 20 },
            ttl: 2.1,
            damage: 16,
            radius: 0.34,
            pierceRemaining: Math.max(0, state.upgrades.stacks.pierce ?? 0),
          });
        }
      }
    }

    const collisionResult = resolveCollisions(
      state.player,
      state.enemies,
      state.harvestables,
      state.projectiles,
      pickupIdRef.current,
      state.visualEffects,
      effectIdRef.current,
      state.audioEvents,
      {
        hpDropBonusChance: (state.upgrades.stacks.scavenger ?? 0) * 0.08,
        harvestResourceMultiplier: 1 + (state.upgrades.stacks.deepDredge ?? 0) * 0.5,
        harvestGemValueBonus: state.upgrades.stacks.crowsNest ?? 0,
        ramDamageMultiplier: 1 + (state.upgrades.stacks.ramProw ?? 0) * 0.75 + ((state.upgrades.stacks.ironclad ?? 0) > 0 ? 0.75 : 0),
        ramReflectBonus: (state.upgrades.stacks.ironclad ?? 0) > 0 ? 1.5 : 0,
      },
    );

    if (collisionResult.spawnedPickups) {
      state.pickups.push(...collisionResult.spawnedPickups);
    }
    const prevEnemyCount = state.enemies.length;
    state.stats.enemiesKilled += collisionResult.killsGained;
    if (collisionResult.eliteKillsGained > 0) {
      const eliteChoices = buildEliteExtraAbilityChoices(state.upgrades);
      if (state.phase === "playing" && eliteChoices.length > 0) {
        state.phase = "upgrade";
        state.pendingUpgradeContext = "eliteExtra";
        state.pendingUpgradeOptions = eliteChoices;
        setMessage({ text: "Elite defeated! Choose an E ability.", remaining: 99 });
        syncState();
        return;
      }
    }
    if ((state.upgrades.stacks.pressGang ?? 0) > 0) {
      while (state.stats.enemiesKilled >= pressGangNextKillRef.current.value) {
        pressGangNextKillRef.current.value += 20;
        state.pickups.push({
          id: pickupIdRef.current.value++,
          kind: "chest",
          position: { x: state.player.position.x + (Math.random() - 0.5) * 6, y: state.player.position.y + (Math.random() - 0.5) * 6 },
          value: 0,
        });
      }
    }
    
    // Apply invulnerability frame block + armor mitigation.
    if (state.cooldowns.invulnRemaining <= 0) {
      const mitigatedDamage = applyDamageMitigation(collisionResult.playerDamageTaken, state.upgrades);
      state.player.hp = Math.max(0, state.player.hp - mitigatedDamage);
      if (mitigatedDamage > 0) {
        state.stats.currentUnscathedStreak = 0;
      } else {
        state.stats.currentUnscathedStreak += step;
        state.stats.longestUnscathedStreak = Math.max(state.stats.longestUnscathedStreak, state.stats.currentUnscathedStreak);
      }

      // Kill streak: if player took no damage this tick, count kills gained and grow streak.
      const killsGainedThisTick = state.stats.enemiesKilled - killsBefore;
      if (killsGainedThisTick > 0 && mitigatedDamage === 0) {
        killStreakRef.current.value += killsGainedThisTick;
        state.stats.killStreak = killStreakRef.current.value;
        state.stats.killStreakBest = Math.max(state.stats.killStreakBest, killStreakRef.current.value);
        killStreakFlashRef.current.value = false;
        state.stats.killStreakFlash = false;
      } else if (mitigatedDamage > 0) {
        // Streak broken — flash if it was a real streak.
        if (killStreakRef.current.value >= 2) {
          killStreakFlashRef.current.value = true;
          state.stats.killStreakFlash = true;
        }
        killStreakRef.current.value = 0;
        state.stats.killStreak = 0;
      }
    }

    state.stats.biggestHit = Math.max(state.stats.biggestHit, collisionResult.maxHitDealt);

    const { coinsGained, triggerUpgrade } = processPickups(
      state.pickups,
      state.player,
      state.cooldowns,
      state.audioEvents,
      effectIdRef.current,
      state.upgrades.stacks.coinMagnet ?? 0,
    );
    state.stats.collectedCoins += coinsGained;

    if (collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0) {
      state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "damage_taken" });
    }

    if ((collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0) || collisionResult.cannonHits > 0) {
      hitPauseTimerRef.current.value = 0.1;
    }

    for (let i = state.visualEffects.length - 1; i >= 0; i -= 1) {
      state.visualEffects[i].remaining -= step;
      if (state.visualEffects[i].remaining <= 0) {
        state.visualEffects.splice(i, 1);
      }
    }

    if (state.player.hp <= 0) {
      state.phase = "gameover";
      state.pendingUpgradeOptions = [];
      state.pendingUpgradeContext = "levelup";
      state.stats.evolutionsUnlocked = countEvolutionStacks(state.upgrades);
      state.stats.score = Math.floor(
        state.stats.timeSurvived * 100 + state.stats.enemiesKilled * 25 + state.stats.collectedCoins * 2 + state.stats.evolutionsUnlocked * 500
      );
      setMessage(null);

      let topLabel = "—";
      const rarityOrder: Record<"common" | "uncommon" | "rare" | "epic", number> = { common: 1, uncommon: 2, rare: 3, epic: 4 };
      let bestR = 0;
      for (const key of Object.keys(UPGRADE_OPTIONS) as UpgradeType[]) {
        if ((state.upgrades.stacks[key] ?? 0) < 1) continue;
        const r = UPGRADE_OPTIONS[key].rarity;
        if (rarityOrder[r] > bestR) {
          bestR = rarityOrder[r];
          topLabel = UPGRADE_OPTIONS[key].label;
        }
      }

      const record: RunRecord = {
        score: state.stats.score,
        timeSurvived: state.stats.timeSurvived,
        enemiesKilled: state.stats.enemiesKilled,
        collectedCoins: state.stats.collectedCoins,
        evolutionsUnlocked: state.stats.evolutionsUnlocked,
        topUpgrade: topLabel,
        date: new Date().toISOString(),
      };
      try {
        const raw = localStorage.getItem("flowforge_runs");
        const list: RunRecord[] = raw ? (JSON.parse(raw) as RunRecord[]) : [];
        list.unshift(record);
        list.sort((a, b) => b.score - a.score);
        localStorage.setItem("flowforge_runs", JSON.stringify(list.slice(0, 10)));
        const prev = Number(localStorage.getItem("flowforge.best") || 0);
        localStorage.setItem("flowforge.best", Math.max(prev, state.stats.score).toString());
      } catch {
        /* ignore */
      }

      syncState();
      return;
    }

    if (state.phase === "playing" && (state.stats.collectedCoins >= state.upgrades.nextThreshold || triggerUpgrade)) {
      const choices = buildUpgradeChoices(state.upgrades);
      if (choices.length === 0) {
        setMessage({ text: "No upgrades available", remaining: 0.9 });
        syncState();
        return;
      }
      state.phase = "upgrade";
      state.pendingUpgradeContext = "levelup";
      state.pendingUpgradeOptions = choices;
      setMessage({ text: "Choose your upgrade", remaining: 99 });
      syncState();
      return;
    }

    syncState();
  }, [setMessage, syncState]);

  return {
    snapshot,
    startRun,
    restartRun,
    setMovementKey,
    triggerCannon,
    triggerBoost,
    triggerExtra,
    chooseUpgrade,
    togglePause,
    quitRun,
    tick,
    applyMultiplayerWorld,
    finishLoading,
    setLoadingProgress,
    consumeAudioEvents,
  };
}
