import type { GameSnapshot } from "../game/types";

const WAVE_PHASE_DURATION: Record<"wave" | "elite" | "lull", number> = {
  wave: 60,
  elite: 10,
  lull: 15,
};

/** HUD copy for the repeating wave / elite / lull cycle within each minute of a run. */
export function getRunPhaseHudLabels(
  rc: GameSnapshot["runClock"],
  eliteShipsOnField?: number,
): { phase: string; detail: string } {
  if (rc.phase === "boss") {
    return { phase: "BOSS", detail: "Encounter" };
  }
  const total = WAVE_PHASE_DURATION[rc.phase];
  const remaining = Math.max(0, total - rc.phaseTime);
  if (rc.phase === "wave") {
    return { phase: "WAVE", detail: `${remaining.toFixed(0)}s → elite` };
  }
  if (rc.phase === "elite") {
    let detail = `${remaining.toFixed(0)}s → lull`;
    if (typeof eliteShipsOnField === "number" && eliteShipsOnField > 0) {
      detail += ` · ${eliteShipsOnField} gold`;
    }
    return { phase: "ELITE", detail };
  }
  return { phase: "LULL", detail: `${remaining.toFixed(0)}s calm` };
}
