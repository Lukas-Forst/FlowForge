import { describe, expect, it } from "vitest";
import { stepTween } from "./useTweenedValue";

describe("stepTween", () => {
  it("returns target when delta equals or exceeds duration", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0.2, duration: 0.15 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(true);
  });

  it("eases out toward target", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0.075, duration: 0.15 });
    expect(next.value).toBeGreaterThan(50);
    expect(next.value).toBeLessThan(100);
    expect(next.done).toBe(false);
  });

  it("handles zero duration", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0, duration: 0 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(true);
  });

  it("works with negative deltas", () => {
    const next = stepTween({ current: 100, target: 0, elapsed: -1, duration: 0.15 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(false);
  });
});
