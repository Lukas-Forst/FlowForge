import type { ReactElement } from "react";
import type { LoadingState } from "../game/types";

interface SplashScreenProps {
  loading: LoadingState;
}

export function SplashScreen({ loading }: SplashScreenProps): ReactElement {
  const pct = Math.round(Math.max(0, Math.min(1, loading.progress)) * 100);
  return (
    <div className="overlay center">
      <div className="panel">
        <h1>FlowForge</h1>
        <p className="hint">Preparing the seas...</p>
        <div className="meter" style={{ width: "100%", height: 14 }}>
          <div className="meter-fill boost" style={{ width: `${pct}%` }} />
        </div>
        <p className="hint">{loading.label || `${pct}%`}</p>
      </div>
    </div>
  );
}
