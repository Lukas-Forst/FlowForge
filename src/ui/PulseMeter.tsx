import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface PulseMeterProps {
  value: number;
  color: string;
  ready?: boolean;
  damageSignal?: number;
<<<<<<< HEAD
  variant?: "default" | "special";
}

export function PulseMeter({ value, color, ready, damageSignal, variant = "default" }: PulseMeterProps): ReactElement {
=======
}

export function PulseMeter({ value, color, ready, damageSignal }: PulseMeterProps): ReactElement {
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
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

<<<<<<< HEAD
  const classes = `pulse-meter ${variant === "special" ? "special" : ""} ${ready ? "ready" : ""} ${flashing ? "damage-flash" : ""}`;
=======
  const classes = `pulse-meter ${ready ? "ready" : ""} ${flashing ? "damage-flash" : ""}`;
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  return (
    <div className={classes} style={{ color }}>
      <div className="pulse-meter-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}
