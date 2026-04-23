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
import { resolveCollisions, updateEnemyMovement, updateProjectileMotion } from "./systems/collision";
import { processPickups } from "./systems/pickups";
import { runEnemyRangedAttacks } from "./systems/enemyRanged";
import { getRunArcEnemyCap, computeRunSpawnIntensity, getRunRegionBiome } from "./systems/runArc";
import { spawnEnemiesToCap, updateEnemySpawning } from "./systems/enemySpawner";
import { runBossAttacks, updateMegaBossEncounter } from "./systems/bossSpawner";
import { updateHarvestableSpawning } from "./systems/harvestableSpawner";
import { updatePlayerMovement } from "./systems/playerController";
import { applyUpgrade, buildUpgradeChoices, countEvolutionStacks, emitLevelUpEvents } from "./systems/upgrades";
import { UPGRADE_OPTIONS } from "./constants";
import type { FlashMessage, GameSnapshot, MovementKey, RunRecord, UpgradeType } from "./types";

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
    },
    cooldowns: {
      cannonRemaining: 0,
      cannonDuration: BASE_CANNON_COOLDOWN,
      boostRemaining: 0,
      boostDuration: BOOST_COOLDOWN,
      boostActiveRemaining: 0,
      boostActiveDuration: BOOST_ACTIVE_TIME,
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
    message: null,
    spawnIntensity: 0,
    runClock: {
      phase: "wave",
      phaseTime: 0,
      elapsedTotal: 0,
    },
    runBiome: "open_sea",
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
    message: snapshot.message ? { ...snapshot.message } : null,
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
  chooseUpgrade: (type: UpgradeType) => void;
  togglePause: () => void;
  quitRun: () => void;
  tick: (delta: number) => void;
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
  const spawnTimerRef = useRef({ value: 0.2 });
  const autoAttackTimerRef = useRef({ value: BASE_AUTO_ATTACK_INTERVAL });
  const hitPauseTimerRef = useRef({ value: 0 });
  const megaBossSpawnedRef = useRef({ value: false });

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
    spawnTimerRef.current.value = 0.2;
    autoAttackTimerRef.current.value = BASE_AUTO_ATTACK_INTERVAL;
    hitPauseTimerRef.current.value = 0;
    megaBossSpawnedRef.current.value = false;
    syncState();
  }, [syncState]);

  const startRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getRunArcEnemyCap(0, { hasMegaBoss: false, legacyBossPhase: false });
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap);
    syncState();
  }, [resetForRun]);

  const restartRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getRunArcEnemyCap(0, { hasMegaBoss: false, legacyBossPhase: false });
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap);
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
    const fired = tryFireCannon(
      state.player,
      state.cooldowns,
      projectileIdRef.current,
      state.upgrades.cooldownMult,
      state.projectiles,
      state.visualEffects,
      effectIdRef.current,
    );
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
    const boosted = tryActivateBoost(state.cooldowns, state.upgrades.cooldownMult);
    if (!boosted) {
      setMessage({
        text: "Boost recharging...",
        remaining: 0.65,
      });
    } else {
      setMessage(null);
    }
    syncState();
  }, [setMessage, syncState]);

  const chooseUpgrade = useCallback((type: UpgradeType) => {
    const state = stateRef.current;
    if (state.phase !== "upgrade") {
      return;
    }
    applyUpgrade(state.upgrades, type);
    if (type === "maxHp") {
      state.player.maxHp += 25;
      state.player.hp = state.player.maxHp;
    }
    state.phase = "playing";
    state.pendingUpgradeOptions = [];
    state.postFxPulse = emitLevelUpEvents(
      state.player.position,
      state.audioEvents,
      state.visualEffects,
      effectIdRef.current,
    );
    setMessage({ text: `${type} upgraded!`, remaining: 0.8 });
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
    state.cooldowns.invulnRemaining = Math.max(0, state.cooldowns.invulnRemaining - step);
    state.cooldowns.frenzyRemaining = Math.max(0, state.cooldowns.frenzyRemaining - step);

    const rc = state.runClock;
    rc.elapsedTotal += step;
    rc.phaseTime += step;

    if (rc.phase === "wave" && rc.phaseTime >= 60) {
      rc.phase = "elite";
      rc.phaseTime = 0;
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
    }

    state.runBiome = getRunRegionBiome(rc.elapsedTotal);

    updatePlayerMovement(
      state.player,
      inputRef.current,
      step,
      state.upgrades.speedMult * getBoostSpeedMultiplier(state.cooldowns),
    );
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
      state.cooldowns.frenzyRemaining > 0,
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
    }
    updateHarvestableSpawning(
      state.harvestables,
      harvestableIdRef.current,
      state.player.position,
      state.stats.timeSurvived,
      step,
    );
    updateEnemyMovement(state.enemies, state.player, step);
    runEnemyRangedAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, step);
    runBossAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, step);
    updateProjectileMotion(state.projectiles, state.player.position, step, state.visualEffects, effectIdRef.current);

    const collisionResult = resolveCollisions(
      state.player,
      state.enemies,
      state.harvestables,
      state.projectiles,
      pickupIdRef.current,
      state.visualEffects,
      effectIdRef.current,
      state.audioEvents,
    );

    if (collisionResult.spawnedPickups) {
      state.pickups.push(...collisionResult.spawnedPickups);
    }
    state.stats.enemiesKilled += collisionResult.killsGained;
    
    // Apply invulnerability frame block
    if (state.cooldowns.invulnRemaining <= 0) {
      state.player.hp = Math.max(0, state.player.hp - collisionResult.playerDamageTaken);
      if (collisionResult.playerDamageTaken > 0) {
        state.stats.currentUnscathedStreak = 0;
      } else {
        state.stats.currentUnscathedStreak += step;
        state.stats.longestUnscathedStreak = Math.max(state.stats.longestUnscathedStreak, state.stats.currentUnscathedStreak);
      }
    }

    state.stats.biggestHit = Math.max(state.stats.biggestHit, collisionResult.maxHitDealt);

    const { coinsGained, triggerUpgrade } = processPickups(
      state.pickups,
      state.player,
      state.cooldowns,
      state.audioEvents,
      effectIdRef.current,
    );
    state.stats.collectedCoins += coinsGained;

    if (collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0) {
      state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "damage_taken" });
    }

    if ((collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0) || collisionResult.cannonHits > 0) {
      hitPauseTimerRef.current.value = 0.06;
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
      state.phase = "upgrade";
      state.pendingUpgradeOptions = buildUpgradeChoices(state.upgrades);
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
    chooseUpgrade,
    togglePause,
    quitRun,
    tick,
    finishLoading,
    setLoadingProgress,
    consumeAudioEvents,
  };
}
