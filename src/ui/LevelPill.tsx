import type { ReactElement } from "react";
import { useEffect, useState } from "react";

interface LevelPillProps {
  level: number;
}

export function LevelPill({ level }: LevelPillProps): ReactElement {
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (level === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 360);
    return () => clearTimeout(t);
  }, [level]);
  return <div className={`level-pill ${bump ? "bump" : ""}`}>LV {level}</div>;
}
