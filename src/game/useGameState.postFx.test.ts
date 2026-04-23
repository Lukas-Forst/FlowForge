import { describe, expect, it } from "vitest";
import { decayPostFxPulse } from "./useGameState";
import type { PostFxPulse } from "./types";

describe("decayPostFxPulse", () => {
  it("returns null when input is null", () => {
    expect(decayPostFxPulse(null, 0.016)).toBeNull();
  });

  it("decrements remaining", () => {
    const pulse: PostFxPulse = { effect: "chromaticAb", remaining: 0.2, duration: 0.2 };
    const next = decayPostFxPulse(pulse, 0.05);
    expect(next?.remaining).toBeCloseTo(0.15, 3);
  });

  it("returns null when pulse expires", () => {
    const pulse: PostFxPulse = { effect: "chromaticAb", remaining: 0.04, duration: 0.2 };
    expect(decayPostFxPulse(pulse, 0.05)).toBeNull();
  });
});
