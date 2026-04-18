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
import { getEnemyCap, spawnEnemiesToCap, updateEnemySpawning } from "./systems/enemySpawner";
import { runBossAttacks, updateBossEncounter } from "./systems/bossSpawner";
import { updatePlayerMovement } from "./systems/playerController";
import { applyUpgrade, buildUpgradeChoices } from "./systems/upgrades";
import type { FlashMessage, GameSnapshot, MovementKey, UpgradeType } from "./types";

function createInitialSnapshot(phase: GameSnapshot["phase"] = "start"): GameSnapshot {
  return {
    phase,
    player: {
      position: { x: 0, y: 0 },
      facing: 0,
      hp: BASE_PLAYER_HP,
      maxHp: BASE_PLAYER_HP,
      baseSpeed: BASE_PLAYER_SPEED,
    },
    enemies: [],
    projectiles: [],
    visualEffects: [],
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
    },
    pendingUpgradeOptions: [],
    message: null,
    spawnIntensity: 0,
    runClock: {
      phase: "wave",
      phaseTime: 0,
      elapsedTotal: 0,
    },
  };
}

function copySnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    player: { ...snapshot.player, position: { ...snapshot.player.position } },
    enemies: snapshot.enemies.map((enemy) => ({ ...enemy, position: { ...enemy.position } })),
    projectiles: snapshot.projectiles.map((projectile) => ({
      ...projectile,
      position: { ...projectile.position },
      velocity: { ...projectile.velocity },
    })),
    visualEffects: snapshot.visualEffects.map((effect) => ({
      ...effect,
      position: { ...effect.position },
    })),
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
}

export function useGameState(): UseGameStateApi {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialSnapshot("start"));
  const stateRef = useRef<GameSnapshot>(snapshot);
  const inputRef = useRef({ w: false, a: false, s: false, d: false });
  const enemyIdRef = useRef({ value: 1 });
  const projectileIdRef = useRef({ value: 1 });
  const pickupIdRef = useRef({ value: 1 });
  const effectIdRef = useRef({ value: 1 });
  const spawnTimerRef = useRef({ value: 0.2 });
  const autoAttackTimerRef = useRef({ value: BASE_AUTO_ATTACK_INTERVAL });
  const hitPauseTimerRef = useRef({ value: 0 });

  const syncState = useCallback(() => {
    setSnapshot(copySnapshot(stateRef.current));
  }, []);

  const setMessage = useCallback((message: FlashMessage | null) => {
    stateRef.current.message = message;
  }, []);

  const resetForRun = useCallback((phase: GameSnapshot["phase"]) => {
    stateRef.current = createInitialSnapshot(phase);
    inputRef.current = { w: false, a: false, s: false, d: false };
    enemyIdRef.current.value = 1;
    projectileIdRef.current.value = 1;
    pickupIdRef.current.value = 1;
    effectIdRef.current.value = 1;
    spawnTimerRef.current.value = 0.2;
    autoAttackTimerRef.current.value = BASE_AUTO_ATTACK_INTERVAL;
    hitPauseTimerRef.current.value = 0;
    syncState();
  }, [syncState]);

  const startRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getEnemyCap(0, "wave");
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap);
    syncState();
  }, [resetForRun]);

  const restartRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getEnemyCap(0, "wave");
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
      setMessage(null);
    }
    syncState();
  }, [setMessage, syncState]);

  const triggerBoost = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") {
      return;
    }
    const boosted = tryActivateBoost(state.cooldowns);
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
    setMessage({ text: `${type} upgraded!`, remaining: 1.2 });
    syncState();
  }, [setMessage, syncState]);

  const tick = useCallback((delta: number) => {
    const state = stateRef.current;

    if (state.message) {
      state.message.remaining -= delta;
      if (state.message.remaining <= 0) {
        state.message = null;
      }
    }

    if (state.phase !== "playing") {
      syncState();
      return;
    }

    if (hitPauseTimerRef.current.value > 0) {
      hitPauseTimerRef.current.value -= delta;
      syncState();
      return;
    }

    state.stats.timeSurvived += delta;
    state.stats.score = Math.floor(state.stats.timeSurvived) + state.stats.enemiesKilled * 10 + state.stats.collectedCoins * 2;
    state.cooldowns.cannonRemaining = Math.max(0, state.cooldowns.cannonRemaining - delta);
    state.cooldowns.boostRemaining = Math.max(0, state.cooldowns.boostRemaining - delta);
    state.cooldowns.boostActiveRemaining = Math.max(0, state.cooldowns.boostActiveRemaining - delta);
    state.cooldowns.invulnRemaining = Math.max(0, state.cooldowns.invulnRemaining - delta);
    state.cooldowns.frenzyRemaining = Math.max(0, state.cooldowns.frenzyRemaining - delta);

    const rc = state.runClock;
    rc.elapsedTotal += delta;
    rc.phaseTime += delta;

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

    if (rc.phase !== "boss" && Math.floor(rc.elapsedTotal / 300) > Math.floor((rc.elapsedTotal - delta) / 300) && rc.elapsedTotal < 1000) {
      rc.phase = "boss";
      rc.phaseTime = 0;
    }

    if (rc.phase === "boss" && rc.phaseTime > 3.0) {
      const hasBoss = state.enemies.some((e) => e.type === "boss");
      if (!hasBoss) {
        rc.phase = "lull";
        rc.phaseTime = 0;
        state.stats.collectedCoins += 50;
      }
    }

    updatePlayerMovement(
      state.player,
      inputRef.current,
      delta,
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
      delta,
      state.cooldowns.frenzyRemaining > 0,
    );
    state.spawnIntensity = updateEnemySpawning(
      state.enemies,
      enemyIdRef.current,
      spawnTimerRef.current,
      state.stats.timeSurvived,
      delta,
      state.player.position,
      rc.phase,
    );
    updateBossEncounter(state.enemies, enemyIdRef.current, rc.phase, rc.phaseTime, state.player.position, rc.elapsedTotal);
    updateEnemyMovement(state.enemies, state.player, delta);
    runEnemyRangedAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, delta);
    runBossAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, state.visualEffects, effectIdRef.current, delta);
    updateProjectileMotion(state.projectiles, state.player.position, delta, state.visualEffects, effectIdRef.current);

    const collisionResult = resolveCollisions(
      state.player,
      state.enemies,
      state.projectiles,
      pickupIdRef.current,
      state.visualEffects,
      effectIdRef.current,
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
        state.stats.currentUnscathedStreak += delta;
        state.stats.longestUnscathedStreak = Math.max(state.stats.longestUnscathedStreak, state.stats.currentUnscathedStreak);
      }
    }

    state.stats.biggestHit = Math.max(state.stats.biggestHit, collisionResult.maxHitDealt);

    const { coinsGained, triggerUpgrade } = processPickups(state.pickups, state.player, state.cooldowns);
    state.stats.collectedCoins += coinsGained;

    if (collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0 || collisionResult.cannonHits > 0) {
      hitPauseTimerRef.current.value = 0.06;
    }

    for (let i = state.visualEffects.length - 1; i >= 0; i -= 1) {
      state.visualEffects[i].remaining -= delta;
      if (state.visualEffects[i].remaining <= 0) {
        state.visualEffects.splice(i, 1);
      }
    }

    if (state.player.hp <= 0) {
      state.phase = "gameover";
      state.pendingUpgradeOptions = [];
      state.stats.score = Math.floor(state.stats.timeSurvived) + state.stats.enemiesKilled * 10;
      setMessage(null);
      syncState();
      return;
    }

    if (state.stats.collectedCoins >= state.upgrades.nextThreshold || triggerUpgrade) {
      if (triggerUpgrade) {
         // Deduct cost arbitrarily, or just don't advance the threshold
      }
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
  };
}
