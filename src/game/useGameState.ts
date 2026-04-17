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
import { collectNearbyCoins } from "./systems/coins";
import { runEnemyRangedAttacks } from "./systems/enemyRanged";
import { getEnemyCap, spawnEnemiesToCap, updateEnemySpawning } from "./systems/enemySpawner";
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
    coins: [],
    upgrades: {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      // addons.md option A: first upgrade at 10
      nextThreshold: 10,
    },
    cooldowns: {
      cannonRemaining: 0,
      cannonDuration: BASE_CANNON_COOLDOWN,
      boostRemaining: 0,
      boostDuration: BOOST_COOLDOWN,
      boostActiveRemaining: 0,
      boostActiveDuration: BOOST_ACTIVE_TIME,
    },
    stats: {
      timeSurvived: 0,
      enemiesKilled: 0,
      collectedCoins: 0,
      score: 0,
    },
    pendingUpgradeOptions: [],
    message: null,
    spawnIntensity: 0,
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
    coins: snapshot.coins.map((coin) => ({ ...coin, position: { ...coin.position } })),
    upgrades: { ...snapshot.upgrades },
    cooldowns: { ...snapshot.cooldowns },
    stats: { ...snapshot.stats },
    pendingUpgradeOptions: snapshot.pendingUpgradeOptions.map((option) => ({ ...option })),
    message: snapshot.message ? { ...snapshot.message } : null,
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
  tick: (delta: number) => void;
}

export function useGameState(): UseGameStateApi {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialSnapshot("start"));
  const stateRef = useRef<GameSnapshot>(snapshot);
  const inputRef = useRef({ w: false, a: false, s: false, d: false });
  const enemyIdRef = useRef({ value: 1 });
  const projectileIdRef = useRef({ value: 1 });
  const coinIdRef = useRef({ value: 1 });
  const effectIdRef = useRef({ value: 1 });
  const spawnTimerRef = useRef({ value: 0.2 });
  const autoAttackTimerRef = useRef({ value: BASE_AUTO_ATTACK_INTERVAL });

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
    coinIdRef.current.value = 1;
    effectIdRef.current.value = 1;
    spawnTimerRef.current.value = 0.2;
    autoAttackTimerRef.current.value = BASE_AUTO_ATTACK_INTERVAL;
    syncState();
  }, [syncState]);

  const startRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getEnemyCap(0);
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap);
    syncState();
  }, [resetForRun]);

  const restartRun = useCallback(() => {
    resetForRun("playing");
    const state = stateRef.current;
    const cap = getEnemyCap(0);
    spawnEnemiesToCap(state.enemies, enemyIdRef.current, state.player.position, 0, cap);
    syncState();
  }, [resetForRun]);

  const setMovementKey = useCallback((key: MovementKey, pressed: boolean) => {
    inputRef.current[key] = pressed;
  }, []);

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

    state.stats.timeSurvived += delta;
    state.stats.score = Math.floor(state.stats.timeSurvived) + state.stats.enemiesKilled * 10;
    state.cooldowns.cannonRemaining = Math.max(0, state.cooldowns.cannonRemaining - delta);
    state.cooldowns.boostRemaining = Math.max(0, state.cooldowns.boostRemaining - delta);
    state.cooldowns.boostActiveRemaining = Math.max(0, state.cooldowns.boostActiveRemaining - delta);

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
      delta,
    );
    state.spawnIntensity = updateEnemySpawning(
      state.enemies,
      enemyIdRef.current,
      spawnTimerRef.current,
      state.stats.timeSurvived,
      delta,
      state.player.position,
    );
    updateEnemyMovement(state.enemies, state.player, delta);
    runEnemyRangedAttacks(state.enemies, state.player, projectileIdRef.current, state.projectiles, delta);
    updateProjectileMotion(state.projectiles, delta, state.visualEffects, effectIdRef.current);

    const collisionResult = resolveCollisions(
      state.player,
      state.enemies,
      state.projectiles,
      coinIdRef.current,
      state.visualEffects,
      effectIdRef.current,
    );

    if (collisionResult.spawnedCoins.length > 0) {
      state.coins.push(...collisionResult.spawnedCoins);
    }
    state.stats.enemiesKilled += collisionResult.killsGained;
    state.player.hp = Math.max(0, state.player.hp - collisionResult.playerDamageTaken);

    const coinsCollectedNow = collectNearbyCoins(state.coins, state.player);
    state.stats.collectedCoins += coinsCollectedNow;

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

    if (state.stats.collectedCoins >= state.upgrades.nextThreshold) {
      state.phase = "upgrade";
      state.pendingUpgradeOptions = buildUpgradeChoices();
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
    tick,
  };
}
