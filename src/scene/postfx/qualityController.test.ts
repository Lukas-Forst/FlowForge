import { describe, expect, it } from "vitest";
import { pickFxQuality, pulseStrength } from "./qualityController";

describe("pickFxQuality", () => {
  it("downgrades to lite under low fps", () => {
    expect(pickFxQuality("full", 42)).toBe("lite");
  });

  it("upgrades back to full when fps recovers", () => {
    expect(pickFxQuality("lite", 60)).toBe("full");
  });
});

describe("pulseStrength", () => {
  it("returns 0 for null pulse", () => {
    expect(pulseStrength(null)).toBe(0);
  });

  it("normalizes remaining against duration", () => {
    expect(pulseStrength({ effect: "chromaticAb", duration: 0.2, remaining: 0.1 })).toBeCloseTo(0.5, 3);
  });
});
