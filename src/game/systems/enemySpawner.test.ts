import { describe, expect, it } from "vitest";
import { getEnemyCap } from "./enemySpawner";

describe("getEnemyCap", () => {
  it("starts with higher early pressure and ramps up faster", () => {
    expect(getEnemyCap(0, "wave")).toBe(3);
    expect(getEnemyCap(29, "wave")).toBe(3);
    expect(getEnemyCap(30, "wave")).toBe(4);
    expect(getEnemyCap(60, "wave")).toBe(5);
    expect(getEnemyCap(90, "wave")).toBe(6);
    expect(getEnemyCap(120, "wave")).toBe(8);
    expect(getEnemyCap(240, "wave")).toBe(12);
  });
});
