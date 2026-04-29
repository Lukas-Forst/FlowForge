import type { ReactElement } from "react";
import type { UiSnapshot } from "../game/types";

interface PauseScreenProps {
  snapshot: UiSnapshot;
  onResume: () => void;
  onQuit: () => void;
  onShowControls?: () => void;
}

export function PauseScreen({ snapshot, onResume, onQuit, onShowControls }: PauseScreenProps): ReactElement {
  return (
    <div className="overlay center">
      <div className="panel" style={{ textAlign: "center" }}>
        <h2>Paused</h2>
        <p>Take a breath, captain.</p>

        <div style={{ margin: "24px 0", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px" }}>
          <p style={{ margin: "4px 0" }}>Current Score: <strong>{snapshot.stats.score}</strong></p>
          <p style={{ margin: "4px 0" }}>Time Survived: <strong>{snapshot.stats.timeSurvived.toFixed(1)}s</strong></p>
          <p style={{ margin: "4px 0" }}>Collected Loot: <strong>{snapshot.stats.collectedCoins}</strong></p>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={onResume}>
            Resume
          </button>
          {onShowControls ? (
            <button type="button" onClick={onShowControls}>
              Controls (?)
            </button>
          ) : null}
          <button type="button" onClick={onQuit} style={{ background: "#cc4444" }}>
            Quit
          </button>
        </div>
        <p className="hint" style={{ marginTop: "16px" }}>Press ESC or P to resume · ? or F1 for full controls</p>
      </div>
    </div>
  );
}
