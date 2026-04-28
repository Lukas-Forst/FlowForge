import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "../game/types";

interface KillStreakHudProps {
  snapshot: GameSnapshot;
}

/** Kills streak HUD — top-right corner, below the existing score block. */
export function KillStreakHud({ snapshot }: KillStreakHudProps): ReactElement {
  const { killStreak, killStreakBest, enemiesKilled } = snapshot.stats;
  const prevFlash = useRef(false);
  const [flashing, setFlashing] = useState(false);

  // Detect rising edge on killStreakFlash — when the streak breaks the HUD flashes red briefly.
  useEffect(() => {
    if (snapshot.stats.killStreakFlash && !prevFlash.current) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 350);
      return () => clearTimeout(t);
    }
    prevFlash.current = snapshot.stats.killStreakFlash;
  }, [snapshot.stats.killStreakFlash]);

  return (
    <div className={`kill-streak-hud ${flashing ? "kill-streak-hud--flash" : ""}`}>
      <span className="kill-streak-hud__line">
        <span className="kill-streak-hud__icon">⚔</span>
        <span className="kill-streak-hud__label">Kills</span>
        <span className="kill-streak-hud__value">{enemiesKilled}</span>
      </span>
      <span className="kill-streak-hud__line">
        <span className="kill-streak-hud__icon">🔥</span>
        <span className="kill-streak-hud__label">Streak</span>
        <span className="kill-streak-hud__value">{killStreak}</span>
      </span>
      <span className="kill-streak-hud__line">
        <span className="kill-streak-hud__icon">💀</span>
        <span className="kill-streak-hud__label">Best</span>
        <span className="kill-streak-hud__value">{killStreakBest}</span>
      </span>
    </div>
  );
}
