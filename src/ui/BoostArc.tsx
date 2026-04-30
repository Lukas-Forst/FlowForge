import type { ReactElement } from "react";

interface BoostArcProps {
  /** 0 = empty, 1 = full */
  value: number;
  ready: boolean;
  active: boolean; // boost is actively draining
}

export function BoostArc({ value, ready, active }: BoostArcProps): ReactElement {
  const color = ready ? "#ffc040" : "#88ddff";
  return (
    <div className={`boost-arc ${ready ? "ready" : ""} ${active ? "active" : ""}`}>
      <svg viewBox="0 0 48 48" className="boost-arc-svg">
        {/* Track ring */}
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="4" />
        {/* Fill arc — stroke-dasharray approach */}
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${Math.max(0, Math.min(1, value)) * 125.66} 125.66`}
          strokeDashoffset="31.415"
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
          style={{ filter: ready ? "drop-shadow(0 0 4px #ffc040)" : "none", transition: "stroke-dasharray 120ms ease-out" }}
        />
        {/* Center dark circle for ring effect */}
        <circle cx="24" cy="24" r="14" fill="rgba(0,0,0,0.6)" />
        {/* Small tick marks */}
        <circle cx="24" cy="8" r="1.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="24" cy="40" r="1.5" fill="rgba(255,255,255,0.15)" />
        <circle cx="8" cy="24" r="1.5" fill="rgba(255,255,255,0.15)" />
        <circle cx="40" cy="24" r="1.5" fill="rgba(255,255,255,0.15)" />
      </svg>
    </div>
  );
}
