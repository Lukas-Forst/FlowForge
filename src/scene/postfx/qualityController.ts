import type { PostFxPulse } from "../../game/types";

export type FxQuality = "full" | "lite";

export function pickFxQuality(current: FxQuality, fps: number): FxQuality {
  if (fps < 45) return "lite";
  if (fps > 56) return "full";
  return current;
}

export function pulseStrength(pulse: PostFxPulse | null): number {
  if (!pulse || pulse.duration <= 0) return 0;
  return Math.max(0, Math.min(1, pulse.remaining / pulse.duration));
}
