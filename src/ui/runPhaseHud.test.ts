import { describe, expect, it } from "vitest";
import type { GameSnapshot } from "../game/types";
import { getRunPhaseHudLabels } from "./runPhaseHud";

function makeClock(phase: GameSnapshot["runClock"]["phase"], phaseTime: number): GameSnapshot["runClock"] {
  return { phase, phaseTime, elapsedTotal: 0 };
}

describe("getRunPhaseHudLabels", () => {
  it("counts down wave segment", () => {
    const { phase, detail } = getRunPhaseHudLabels(makeClock("wave", 10));
    expect(phase).toBe("WAVE");
    expect(detail).toMatch(/50/);
    expect(detail).toMatch(/elite/i);
  });

  it("counts down elite segment", () => {
    const { phase, detail } = getRunPhaseHudLabels(makeClock("elite", 3));
    expect(phase).toBe("ELITE");
    expect(detail).toMatch(/7/);
    expect(detail).toMatch(/lull/i);
  });

  it("counts down lull segment", () => {
    const { phase, detail } = getRunPhaseHudLabels(makeClock("lull", 5));
    expect(phase).toBe("LULL");
    expect(detail).toMatch(/10/);
    expect(detail).toMatch(/calm/i);
  });

  it("handles boss clock phase", () => {
    const { phase } = getRunPhaseHudLabels(makeClock("boss", 0));
    expect(phase).toBe("BOSS");
  });

  it("appends elite ship count during elite window", () => {
    const { detail } = getRunPhaseHudLabels(makeClock("elite", 2), 4);
    expect(detail).toMatch(/4 gold/);
  });
});
