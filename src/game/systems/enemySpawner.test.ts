import { describe, expect, it } from "vitest";
import { getEnemyCap } from "./enemySpawner";

describe("getEnemyCap", () => {
  it("starts with higher early pressure and ramps up faster", () => {
    expect(getEnemyCap(0)).toBe(3);
    expect(getEnemyCap(29)).toBe(3);
    expect(getEnemyCap(30)).toBe(4);
    expect(getEnemyCap(60)).toBe(5);
    expect(getEnemyCap(90)).toBe(6);
    expect(getEnemyCap(120)).toBe(8);
    expect(getEnemyCap(240)).toBe(12);
  });
});
