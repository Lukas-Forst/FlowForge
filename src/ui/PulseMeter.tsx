import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface PulseMeterProps {
  value: number;
  color: string;
  ready?: boolean;
  damageSignal?: number;
}

export function PulseMeter({ value, color, ready, damageSignal }: PulseMeterProps): ReactElement {
  const [flashing, setFlashing] = useState(false);
  const lastSignal = useRef(damageSignal ?? 0);

  useEffect(() => {
    if (damageSignal === undefined) return;
    if (damageSignal !== lastSignal.current) {
      lastSignal.current = damageSignal;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 180);
      return () => clearTimeout(t);
    }
  }, [damageSignal]);

  const classes = `pulse-meter ${ready ? "ready" : ""} ${flashing ? "damage-flash" : ""}`;
  return (
    <div className={classes} style={{ color }}>
      <div className="pulse-meter-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}
