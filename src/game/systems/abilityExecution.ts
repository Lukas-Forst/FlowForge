import { tryActivateBoost } from "./boostAbility";
import { tryFireCannon } from "./cannonAbility";
import {
  DEPTH_CHARGE_COOLDOWN,
  DEPTH_CHARGE_DAMAGE,
  DEPTH_CHARGE_DELAY,
  DEPTH_CHARGE_RADIUS,
  OIL_SLICK_COOLDOWN,
  OIL_SLICK_DURATION,
  OIL_SLICK_RADIUS,
  OIL_SLICK_DOT_INTERVAL,
  RING_BARRAGE_DAMAGE,
  RING_BARRAGE_IMPACT_DELAY,
  RING_BARRAGE_RADIUS,
  RING_BARRAGE_RING_DISTANCE,
  RING_BARRAGE_SHELL_COUNT,
  TORPEDO_COOLDOWN,
  TORPEDO_DAMAGE,
  TORPEDO_RADIUS,
  TORPEDO_SPEED,
  TORPEDO_TTL,
} from "../constants";
import { spawnSeaMinesBehindPlayer } from "./seaMines";
import type { FlashMessage, GameSnapshot } from "../types";

interface NumberRef {
  value: number;
}

type SetMessage = (message: FlashMessage | null) => void;

export function triggerCannonAbility(
  state: GameSnapshot,
  projectileIdRef: NumberRef,
  effectIdRef: NumberRef,
  setMessage: SetMessage,
): void {
  const fired = tryFireCannon(
    state.player,
    state.cooldowns,
    projectileIdRef,
    state.upgrades.cooldownMult,
    state.projectiles,
    state.visualEffects,
    effectIdRef,
    state.upgrades.stacks.cannonSpread ?? 0,
  );
  if (!fired) {
    setMessage({
      text: "Cannons reloading...",
      remaining: 0.8,
    });
    return;
  }

  state.audioEvents.push({ id: effectIdRef.value++, sfx: "cannon_fire" });
  setMessage(null);
}

export function triggerBoostAbility(
  state: GameSnapshot,
  delayedAoEIdRef: NumberRef,
  mineIdRef: NumberRef,
  phantomFleetRemainingRef: NumberRef,
  phantomFleetAttackTimerRef: NumberRef,
  phantomFleetActiveTime: number,
  setMessage: SetMessage,
): void {
  const boosted = tryActivateBoost(state.cooldowns, state.upgrades.cooldownMult);
  if (!boosted) {
    setMessage({
      text: "Boost recharging...",
      remaining: 0.65,
    });
    return;
  }

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
    phantomFleetRemainingRef.value = phantomFleetActiveTime;
    phantomFleetAttackTimerRef.value = 0.1;
  }
  if ((state.upgrades.stacks.ringBarrage ?? 0) > 0) {
    const stackScale = 1 + (state.upgrades.stacks.ringBarrage - 1) * 0.25;
    const shellCount = Math.max(1, Math.round(RING_BARRAGE_SHELL_COUNT * stackScale));
    for (let i = 0; i < shellCount; i += 1) {
      const angle = (Math.PI * 2 * i) / shellCount;
      state.delayedAoEs.push({
        id: delayedAoEIdRef.value++,
        position: {
          x: state.player.position.x + Math.cos(angle) * RING_BARRAGE_RING_DISTANCE,
          y: state.player.position.y + Math.sin(angle) * RING_BARRAGE_RING_DISTANCE,
        },
        remaining: RING_BARRAGE_IMPACT_DELAY,
        radius: RING_BARRAGE_RADIUS,
        damage: RING_BARRAGE_DAMAGE,
        source: "player",
        visualType: "mortar",
      });
    }
  }
  if ((state.upgrades.stacks.boostMines ?? 0) > 0) {
    spawnSeaMinesBehindPlayer(state.mines, state.player, mineIdRef, state.upgrades.stacks.boostMines);
  }

  setMessage(null);
}

export function triggerExtraAbility(
  state: GameSnapshot,
  projectileIdRef: NumberRef,
  delayedAoEIdRef: NumberRef,
  oilSlickIdRef: NumberRef,
  setMessage: SetMessage,
): void {
  const hasTorpedo = (state.upgrades.stacks.extraTorpedo ?? 0) > 0;
  const hasDepthCharge = (state.upgrades.stacks.extraDepthCharge ?? 0) > 0;
  const hasOilSlick = (state.upgrades.stacks.extraOilSlick ?? 0) > 0;
  if (!hasTorpedo && !hasDepthCharge && !hasOilSlick) {
    setMessage({
      text: "No special ability equipped.",
      remaining: 0.75,
    });
    return;
  }

  if (state.cooldowns.extraRemaining > 0) {
    setMessage({
      text: "Special recharging...",
      remaining: 0.75,
    });
    return;
  }

  if (hasTorpedo) {
    state.cooldowns.extraDuration = TORPEDO_COOLDOWN * state.upgrades.cooldownMult;
    state.cooldowns.extraRemaining = state.cooldowns.extraDuration;
    const forward = { x: Math.cos(state.player.facing), y: Math.sin(state.player.facing) };
    const count = Math.max(1, state.upgrades.stacks.extraTorpedo ?? 1);
    const lateral = { x: -forward.y, y: forward.x };
    for (let i = 0; i < count; i += 1) {
      const lane = i - (count - 1) / 2;
      state.projectiles.push({
        id: projectileIdRef.value++,
        kind: "playerTorpedo",
        position: {
          x: state.player.position.x + forward.x * 1.25 + lateral.x * lane * 0.4,
          y: state.player.position.y + forward.y * 1.25 + lateral.y * lane * 0.4,
        },
        velocity: { x: forward.x * TORPEDO_SPEED, y: forward.y * TORPEDO_SPEED },
        ttl: TORPEDO_TTL,
        damage: TORPEDO_DAMAGE,
        radius: TORPEDO_RADIUS,
        pierceRemaining: 0,
      });
    }
    setMessage(null);
    return;
  }

  if (hasDepthCharge) {
    state.cooldowns.extraDuration = DEPTH_CHARGE_COOLDOWN * state.upgrades.cooldownMult;
    state.cooldowns.extraRemaining = state.cooldowns.extraDuration;
    const backward = { x: -Math.cos(state.player.facing), y: -Math.sin(state.player.facing) };
    state.delayedAoEs.push({
      id: delayedAoEIdRef.value++,
      position: {
        x: state.player.position.x + backward.x * 0.9,
        y: state.player.position.y + backward.y * 0.9,
      },
      remaining: DEPTH_CHARGE_DELAY,
      radius: DEPTH_CHARGE_RADIUS,
      damage: DEPTH_CHARGE_DAMAGE,
      source: "player",
      visualType: "depthCharge",
    });
    setMessage(null);
    return;
  }

  state.cooldowns.extraDuration = OIL_SLICK_COOLDOWN * state.upgrades.cooldownMult;
  state.cooldowns.extraRemaining = state.cooldowns.extraDuration;
  const backward = { x: -Math.cos(state.player.facing), y: -Math.sin(state.player.facing) };
  state.oilSlicks.push({
    id: oilSlickIdRef.value++,
    position: {
      x: state.player.position.x + backward.x * 1.0,
      y: state.player.position.y + backward.y * 1.0,
    },
    radius: OIL_SLICK_RADIUS,
    remaining: OIL_SLICK_DURATION,
    dotTimer: OIL_SLICK_DOT_INTERVAL,
  });
  setMessage(null);
}
