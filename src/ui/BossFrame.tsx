import type { ReactElement } from "react";
import type { EnemyState } from "../game/types";

interface BossFrameProps {
  boss: EnemyState;
}

export function BossFrame({ boss }: BossFrameProps): ReactElement {
  const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  return (
    <div className="boss-frame">
      <div className="boss-title">PIRATE LORD</div>
      <div className="boss-bar">
        <div className="boss-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
