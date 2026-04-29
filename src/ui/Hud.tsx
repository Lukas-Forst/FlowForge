import type { ReactElement } from "react";
import { useRef } from "react";
import type { MinimapEnemyState, UiSnapshot } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { BiomeBadge } from "./BiomeBadge";
import { BossFrame } from "./BossFrame";
import { KillStreakHud } from "./KillStreakHud";
import { LevelPill } from "./LevelPill";
import { BoostArc } from "./BoostArc";
import { PulseMeter } from "./PulseMeter";
import { getRunPhaseHudLabels } from "./runPhaseHud";
import { XPBar } from "./XPBar";

interface HudProps {
  snapshot: UiSnapshot;
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
  const eliteOnField =
    snapshot.runClock.phase === "elite"
      ? snapshot.eliteCount
      : undefined;
  const runPhase = getRunPhaseHudLabels(snapshot.runClock, eliteOnField);

  // Ghost Hull indicator
  const isGhosted = snapshot.cooldowns.invulnRemaining > 0;

  return (
    <>
      <XPBar progress={xpProgress} level={snapshot.upgrades.level} />
      <LevelPill level={snapshot.upgrades.level} />
      <div className={`hud-wave-clock hud-wave-clock--${snapshot.runClock.phase}`} aria-live="polite">
        <span className="hud-wave-phase">{runPhase.phase}</span>
        <span className="hud-wave-detail">{runPhase.detail}</span>
      </div>

      {/* Ghost Hull badge */}
      {isGhosted && (
        <div className="ghost-badge">{`GHOST ${snapshot.cooldowns.invulnRemaining.toFixed(1)}s`}</div>
      )}

      {/* Mini-map */}
      <MiniMap
        playerPosition={snapshot.player.position}
        enemies={snapshot.minimapEnemies}
        worldHalf={135}
      />

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
            <BoostArc
              value={cooldownPercent(snapshot.cooldowns.boostRemaining, snapshot.cooldowns.boostDuration)}
              ready={boostReady}
              active={snapshot.cooldowns.boostActiveRemaining > 0}
            />
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
        bossHp={snapshot.bossState?.hp ?? 0}
        bossMaxHp={snapshot.bossState?.maxHp ?? 1}
      />
      <KillStreakHud snapshot={snapshot} />
      {snapshot.stats.combatLog.length > 0 ? (
        <div className="combat-log" aria-live="polite">
          {snapshot.stats.combatLog.map((entry, i) => (
            <span key={i} className="combat-log__entry">{entry}</span>
          ))}
        </div>
      ) : null}
      {snapshot.vibePortal.visible && snapshot.vibePortal.near ? (
        <div className="portal-tooltip">Sail through to visit another Vibe Jam game 🌊</div>
      ) : null}
      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </>
  );
}

interface MiniMapProps {
  playerPosition: { x: number; y: number };
  enemies: MinimapEnemyState[];
  worldHalf: number;
}

function MiniMap({ playerPosition, enemies, worldHalf }: MiniMapProps): ReactElement {
  const mapSize = 120;
  const scale = mapSize / (worldHalf * 2);

  return (
    <div
      className="mini-map"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        width: mapSize,
        height: mapSize,
        background: "rgba(10, 25, 45, 0.72)",
        borderRadius: 8,
        border: "1px solid rgba(100, 180, 255, 0.25)",
        overflow: "hidden",
        zIndex: 41,
        pointerEvents: "none",
      }}
    >
      {/* Player dot — always centered */}
      <div
        style={{
          position: "absolute",
          left: mapSize / 2 - 3,
          top: mapSize / 2 - 3,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 0 4px #fff",
        }}
      />
      {/* Enemy dots */}
      {enemies.map((e) => {
        const mx = (e.x - playerPosition.x) * scale + mapSize / 2;
        const my = (e.y - playerPosition.y) * scale + mapSize / 2;
        if (mx < -4 || mx > mapSize + 4 || my < -4 || my > mapSize + 4) return null;
        const isBoss = e.type === "boss";
        const isShore = e.type === "shore_battery";
        return (
          <div
            key={e.id}
            style={{
              position: "absolute",
              left: mx - (isBoss ? 4 : 2.5),
              top: my - (isBoss ? 4 : 2.5),
              width: isBoss ? 8 : 5,
              height: isBoss ? 8 : 5,
              borderRadius: "50%",
              background: isShore ? "#ff9f43" : isBoss ? "#ff4444" : "#ff7070",
              boxShadow: isBoss ? "0 0 5px #ff0000" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
