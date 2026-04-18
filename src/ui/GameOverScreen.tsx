import type { ReactElement } from "react";
import type { GameSnapshot } from "../game/types";

interface GameOverScreenProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
}

export function GameOverScreen({ snapshot, onRestart }: GameOverScreenProps): ReactElement {
  const best = Number(localStorage.getItem("flowforge.best") || 0);
  const isNewRecord = snapshot.stats.score >= best && snapshot.stats.score > 0;

  return (
    <div className="overlay center">
      <div className="panel" style={{ textAlign: "center", minWidth: "360px" }}>
        <h2>{isNewRecord ? "🎉 NEW RECORD! 🎉" : "Ship Sunk"}</h2>
        <div style={{ background: "rgba(0,0,0,0.1)", padding: "12px", borderRadius: "8px", margin: "12px 0" }}>
          <p style={{ margin: "4px 0" }}>Final Score: <strong style={{ fontSize: "1.2em" }}>{snapshot.stats.score}</strong></p>
          <p style={{ margin: "4px 0", fontSize: "0.9em", color: "#ddd" }}>(Floor Time) + (10 × Kills) + (2 × Coins)</p>
        </div>

        <div style={{ textAlign: "left", fontSize: "0.95em", margin: "16px 0", lineHeight: "1.6" }}>
          <p style={{ margin: "4px 0" }}>⏱️ Time Survived: <strong>{snapshot.stats.timeSurvived.toFixed(1)}s</strong></p>
          <p style={{ margin: "4px 0" }}>☠️ Enemies Sunk: <strong>{snapshot.stats.enemiesKilled}</strong></p>
          <p style={{ margin: "4px 0" }}>💎 Loot Collected: <strong>{snapshot.stats.collectedCoins}</strong></p>
          <p style={{ margin: "4px 0", color: "#fbbf24" }}>🛡️ Unscathed Streak: <strong>{snapshot.stats.longestUnscathedStreak.toFixed(1)}s</strong></p>
          <p style={{ margin: "4px 0", color: "#ef4444" }}>💥 Biggest Hit Dealt: <strong>{snapshot.stats.biggestHit.toFixed(0)}</strong></p>
        </div>
        <button type="button" onClick={onRestart}>
          Restart Run
        </button>
      </div>
    </div>
  );
}
