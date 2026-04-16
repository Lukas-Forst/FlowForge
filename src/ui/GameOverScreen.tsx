import type { ReactElement } from "react";
import type { GameSnapshot } from "../game/types";

interface GameOverScreenProps {
  snapshot: GameSnapshot;
  onRestart: () => void;
}

export function GameOverScreen({ snapshot, onRestart }: GameOverScreenProps): ReactElement {
  return (
    <div className="overlay center">
      <div className="panel">
        <h2>Ship Sunk</h2>
        <p>
          Time survived: <strong>{snapshot.stats.timeSurvived.toFixed(1)}s</strong>
        </p>
        <p>
          Enemies sunk: <strong>{snapshot.stats.enemiesKilled}</strong>
        </p>
        <p>
          Final score: <strong>{snapshot.stats.score}</strong>
        </p>
        <p className="hint">Score = floor(time) + (10 x kills)</p>
        <button type="button" onClick={onRestart}>
          Restart Run
        </button>
      </div>
    </div>
  );
}
