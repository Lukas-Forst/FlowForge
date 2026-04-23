import type { ReactElement } from "react";
import { useEffect, useState } from "react";

interface XPBarProps {
  progress: number;
  level: number;
}

export function XPBar({ progress, level }: XPBarProps): ReactElement {
  const [sweeping, setSweeping] = useState(false);
  useEffect(() => {
    if (level === 0) return;
    setSweeping(true);
    const t = setTimeout(() => setSweeping(false), 480);
    return () => clearTimeout(t);
  }, [level]);

  return (
    <div className={`xp-bar ${sweeping ? "level-up" : ""}`}>
      <div className="xp-bar-fill" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
    </div>
  );
}
