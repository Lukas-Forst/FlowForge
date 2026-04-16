import type { ReactElement } from "react";
import type { GameSnapshot } from "../game/types";

interface HudProps {
  snapshot: GameSnapshot;
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
      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </div>
  );
}
