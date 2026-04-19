import type { ReactElement } from "react";
import type { GameSnapshot } from "../game/types";

interface HudProps {
  snapshot: GameSnapshot;
}

function formatBiomeName(biome: string): string {
  return biome.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function cooldownPercent(snapshot: GameSnapshot): number {
  if (snapshot.cooldowns.cannonDuration <= 0) {
    return 1;
  }
  const ratio = 1 - snapshot.cooldowns.cannonRemaining / snapshot.cooldowns.cannonDuration;
  return Math.min(1, Math.max(0, ratio));
}

function boostPercent(snapshot: GameSnapshot): number {
  if (snapshot.cooldowns.boostDuration <= 0) {
    return 1;
  }
  const ratio = 1 - snapshot.cooldowns.boostRemaining / snapshot.cooldowns.boostDuration;
  return Math.min(1, Math.max(0, ratio));
}

export function Hud({ snapshot }: HudProps): ReactElement {
  const hpRatio = snapshot.player.hp / snapshot.player.maxHp;
  const cannonReady = snapshot.cooldowns.cannonRemaining <= 0;
  const boostReady = snapshot.cooldowns.boostRemaining <= 0;

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-item" style={{ color: "#a8d8e0", fontWeight: "bold" }}>Region: {formatBiomeName(snapshot.runBiome)}</div>
      </div>
      <div className="hud-row">
        <div className="hud-item">HP: {Math.ceil(snapshot.player.hp)}</div>
        <div className="meter">
          <div className="meter-fill hp" style={{ width: `${Math.max(0, hpRatio * 100)}%` }} />
        </div>
      </div>
      <div className="hud-row">
        <div className="hud-item">Time: {snapshot.stats.timeSurvived.toFixed(1)}s</div>
        <div className="hud-item">Kills: {snapshot.stats.enemiesKilled}</div>
        <div className="hud-item">Coins: {snapshot.stats.collectedCoins}</div>
      </div>
      <div className="hud-row">
        <div className="hud-item">Next Upgrade: {snapshot.upgrades.nextThreshold}</div>
        <div className="hud-item">Score: {snapshot.stats.score}</div>
      </div>
      <div className="hud-row">
        <div className="hud-item phase-info" style={{ color: "#ffcf54", fontWeight: "bold" }}>
          {snapshot.runClock.phase === "wave" ? `Wave ends in: ${Math.max(0, 60 - snapshot.runClock.phaseTime).toFixed(0)}s` :
           snapshot.runClock.phase === "elite" ? `Elite phase: ${Math.max(0, 10 - snapshot.runClock.phaseTime).toFixed(0)}s` :
           snapshot.runClock.phase === "lull" ? `Lull ends in: ${Math.max(0, 15 - snapshot.runClock.phaseTime).toFixed(0)}s` :
           `Boss Phase`}
        </div>
      </div>
      <div className="hud-row">
        <div className="hud-item">Q Cannon: {cannonReady ? "Ready" : `${snapshot.cooldowns.cannonRemaining.toFixed(1)}s`}</div>
        <div className="meter">
          <div className="meter-fill cannon" style={{ width: `${cooldownPercent(snapshot) * 100}%` }} />
        </div>
      </div>
      <div className="hud-row">
        <div className="hud-item">Space Boost: {boostReady ? "Ready" : `${snapshot.cooldowns.boostRemaining.toFixed(1)}s`}</div>
        <div className="meter">
          <div className="meter-fill boost" style={{ width: `${boostPercent(snapshot) * 100}%` }} />
        </div>
      </div>
      {snapshot.enemies.find(e => e.type === "boss") && (
        <div className="boss-hud" style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", width: "400px", textAlign: "center" }}>
          <div style={{ color: "#ff4d4d", fontSize: "24px", fontWeight: "bold", textShadow: "1px 1px 2px black", marginBottom: "5px" }}>PIRATE LORD</div>
          <div className="meter" style={{ height: "24px", border: "2px solid #333", backgroundColor: "#111" }}>
            <div className="meter-fill" style={{ backgroundColor: "#ff2020", height: "100%", width: `${Math.max(0, snapshot.enemies.find(e => e.type === "boss")!.hp / snapshot.enemies.find(e => e.type === "boss")!.maxHp * 100)}%` }} />
          </div>
        </div>
      )}
      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </div>
  );
}
