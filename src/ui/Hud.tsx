import type { ReactElement } from "react";
import { useRef } from "react";
import type { GameSnapshot } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { BiomeBadge } from "./BiomeBadge";
import { BossFrame } from "./BossFrame";
import { KillStreakHud } from "./KillStreakHud";
import { LevelPill } from "./LevelPill";
import { PulseMeter } from "./PulseMeter";
import { getRunPhaseHudLabels } from "./runPhaseHud";
import { XPBar } from "./XPBar";

interface HudProps {
  snapshot: GameSnapshot;
}

function cooldownPercent(remaining: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remaining / duration));
}

export function Hud({ snapshot }: HudProps): ReactElement {
  const prevHp = useRef(snapshot.player.hp);
  const damageSignal = useRef(0);
  if (snapshot.player.hp < prevHp.current - 1) damageSignal.current += 1;
  prevHp.current = snapshot.player.hp;

  const hpRatio = snapshot.player.maxHp > 0 ? Math.max(0, Math.min(1, snapshot.player.hp / snapshot.player.maxHp)) : 0;
  const cannonReady = snapshot.cooldowns.cannonRemaining <= 0;
  const boostReady = snapshot.cooldowns.boostRemaining <= 0;
  const extraReady = snapshot.cooldowns.extraRemaining <= 0;
  const extraLabel =
    (snapshot.upgrades.stacks.extraTorpedo ?? 0) > 0
      ? "E TORPEDO"
      : (snapshot.upgrades.stacks.extraDepthCharge ?? 0) > 0
        ? "E DEPTH CHARGE"
        : (snapshot.upgrades.stacks.extraOilSlick ?? 0) > 0
          ? "E OIL SLICK"
        : "E SPECIAL";
  const extraNeedsUnlock = !snapshot.upgrades.activeExtraAbility;
  const safeTime = Math.max(0, snapshot.stats.timeSurvived);
  const xpProgress = snapshot.upgrades.nextThreshold > 0 ? Math.min(1, Math.max(0, snapshot.stats.collectedCoins / snapshot.upgrades.nextThreshold)) : 0;
  const boss = snapshot.enemies.find((e) => e.type === "boss");
  const eliteOnField =
    snapshot.runClock.phase === "elite"
      ? snapshot.enemies.reduce((n, e) => n + (e.isElite ? 1 : 0), 0)
      : undefined;
  const runPhase = getRunPhaseHudLabels(snapshot.runClock, eliteOnField);

  return (
    <>
      <XPBar progress={xpProgress} level={snapshot.upgrades.level} />
      <LevelPill level={snapshot.upgrades.level} />
      <div className={`hud-wave-clock hud-wave-clock--${snapshot.runClock.phase}`} aria-live="polite">
        <span className="hud-wave-phase">{runPhase.phase}</span>
        <span className="hud-wave-detail">{runPhase.detail}</span>
      </div>

      <div className="hud-v2">
        <div className="hud-v2-corner top-right">
          <BiomeBadge biome={snapshot.runBiome} />
          <div className="hud-v2-row hud-v2-big">
            <AnimatedNumber value={snapshot.stats.score} />
          </div>
          <div className="hud-v2-row">
            <span>TIME {safeTime.toFixed(1)}s</span>
            <span>KILLS <AnimatedNumber value={snapshot.stats.enemiesKilled} /></span>
            <span>COINS <AnimatedNumber value={snapshot.stats.collectedCoins} /></span>
          </div>
        </div>

        <div className="hud-v2-corner bottom-left">
          <div className="hud-v2-row">
            <span>HP {Math.ceil(snapshot.player.hp)}</span>
            <div className="hud-v2-hp-bar">
              <PulseMeter value={hpRatio} color={hpRatio > 0.3 ? "#4ade80" : "#ff6060"} damageSignal={damageSignal.current} />
            </div>
          </div>
          <div className="hud-v2-row">
            <span>SPACE CANNON</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.cannonRemaining, snapshot.cooldowns.cannonDuration)} color="#ffcc66" ready={cannonReady} />
            </div>
          </div>
          <div className="hud-v2-row">
            <span>SHIFT BOOST</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.boostRemaining, snapshot.cooldowns.boostDuration)} color="#88ddff" ready={boostReady} />
            </div>
          </div>
          <div className={`hud-v2-row ${extraNeedsUnlock ? "hud-v2-row--extra-empty" : ""}`}>
            <span>{extraNeedsUnlock ? "E SPECIAL (LOCKED)" : extraLabel}</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter
                value={cooldownPercent(snapshot.cooldowns.extraRemaining, snapshot.cooldowns.extraDuration)}
                color="#b8a2ff"
                ready={extraReady}
                variant="special"
              />
            </div>
          </div>
        </div>
      </div>

      <BossFrame
        megaBoss={snapshot.megaBoss}
        bossHp={boss?.hp ?? 0}
        bossMaxHp={boss?.maxHp ?? 1}
      />
      <KillStreakHud snapshot={snapshot} />
      {snapshot.vibePortal.visible && snapshot.vibePortal.near ? (
        <div className="portal-tooltip">Sail through to visit another Vibe Jam game 🌊</div>
      ) : null}
      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </>
  );
}
