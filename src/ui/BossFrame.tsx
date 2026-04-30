import type { ReactElement } from "react";
import type { MegaBossState } from "../game/types";

interface BossFrameProps {
  megaBoss: MegaBossState | null;
  bossHp: number;
  bossMaxHp: number;
}

const SEGMENT_COUNT = 20;

export function BossFrame({ megaBoss, bossHp, bossMaxHp }: BossFrameProps): ReactElement | null {
  const hpPct = bossMaxHp > 0 ? Math.max(0, Math.min(1, bossHp / bossMaxHp)) : 0;
  const inIntro = megaBoss && megaBoss.introRemaining > 0;

  return (
    <>
      {/* Intro overlay — screen dim + warning text */}
      {inIntro ? (
        <div className="boss-intro-overlay" aria-live="assertive">
          <div className="boss-intro-warning">
            <span className="boss-intro-icon">⚠</span>
            <span className="boss-intro-label">MEGA BOSS</span>
            <span className="boss-intro-icon">⚠</span>
          </div>
          <div className="boss-intro-name">{megaBoss.name}</div>
        </div>
      ) : null}

      {/* Persistent HP bar — always shown once boss has spawned */}
      {megaBoss ? (
        <div className="boss-frame">
          <div className="boss-title">{megaBoss.name}</div>
          <div className="boss-bar">
            <div className="boss-bar-fill" style={{ width: `${hpPct * 100}%` }}>
              <div className="boss-bar-segments">
                {Array.from({ length: SEGMENT_COUNT - 1 }, (_, i) => (
                  <div
                    key={i}
                    className="boss-bar-segment-divider"
                    style={{ left: `${((i + 1) / SEGMENT_COUNT) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="boss-hp-label">
            {Math.ceil(bossHp)} / {bossMaxHp}
          </div>
        </div>
      ) : null}
    </>
  );
}