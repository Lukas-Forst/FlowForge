import type { ReactElement } from "react";
import { useRef } from "react";
import type { GameSnapshot } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { BiomeBadge } from "./BiomeBadge";
import { BossFrame } from "./BossFrame";
import { LevelPill } from "./LevelPill";
import { PulseMeter } from "./PulseMeter";
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
  const safeTime = Math.max(0, snapshot.stats.timeSurvived);
  const xpProgress = snapshot.upgrades.nextThreshold > 0 ? Math.min(1, Math.max(0, snapshot.stats.collectedCoins / snapshot.upgrades.nextThreshold)) : 0;
  const boss = snapshot.enemies.find((e) => e.type === "boss");

  return (
    <>
      <XPBar progress={xpProgress} level={snapshot.upgrades.level} />
      <LevelPill level={snapshot.upgrades.level} />

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
            <span>Q CANNON</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.cannonRemaining, snapshot.cooldowns.cannonDuration)} color="#ffcc66" ready={cannonReady} />
            </div>
          </div>
          <div className="hud-v2-row">
            <span>SPACE BOOST</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.boostRemaining, snapshot.cooldowns.boostDuration)} color="#88ddff" ready={boostReady} />
            </div>
          </div>
        </div>
      </div>

      {boss ? <BossFrame boss={boss} /> : null}
      {snapshot.vibePortal.visible && snapshot.vibePortal.near ? (
        <div className="portal-tooltip">Sail through to visit another Vibe Jam game 🌊</div>
      ) : null}
      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </>
  );
}
