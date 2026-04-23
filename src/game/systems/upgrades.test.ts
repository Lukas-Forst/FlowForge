import { describe, expect, it } from "vitest";
import type { AudioEvent, VisualEffect } from "../types";
import { emitLevelUpEvents } from "./upgrades";

describe("emitLevelUpEvents", () => {
  it("pushes an upgrade_sting audio event", () => {
    const audio: AudioEvent[] = [];
    const vfx: VisualEffect[] = [];
    const idRef = { value: 1 };
    emitLevelUpEvents({ x: 1, y: 2 }, audio, vfx, idRef);
    expect(audio).toHaveLength(1);
    expect(audio[0].sfx).toBe("upgrade_sting");
  });

  it("returns a chromaticAb postFxPulse", () => {
    const pulse = emitLevelUpEvents({ x: 0, y: 0 }, [], [], { value: 1 });
    expect(pulse.effect).toBe("chromaticAb");
    expect(pulse.remaining).toBeCloseTo(0.2, 3);
  });

  it("pushes screen-shake and hit-burst visual effects", () => {
    const vfx: VisualEffect[] = [];
    emitLevelUpEvents({ x: 4, y: 5 }, [], vfx, { value: 1 });
    const kinds = vfx.map((e) => e.kind).sort();
    expect(kinds).toContain("screenShake");
    expect(kinds).toContain("hitBurst");
  });
});
