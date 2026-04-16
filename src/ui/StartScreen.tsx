import type { ReactElement } from "react";

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps): ReactElement {
  return (
    <div className="overlay center">
      <div className="panel">
        <h1>FlowForge</h1>
        <p>Sail the storm. Sink raiders. Upgrade your ship.</p>
        <p className="hint">Move with WASD. Fire cannon salvo with Q.</p>
        <button type="button" onClick={onStart}>
          Start Run
        </button>
      </div>
    </div>
  );
}
