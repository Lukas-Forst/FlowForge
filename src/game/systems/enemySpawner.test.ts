<<<<<<< HEAD
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEnemyCap, rollSpawnIsElite } from "./enemySpawner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rollSpawnIsElite", () => {
  it("forces elites during the elite clock phase", () => {
    expect(rollSpawnIsElite(999, "elite")).toBe(true);
  });

  it("never rolls elites during lull", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollSpawnIsElite(999, "lull")).toBe(false);
  });

  it("early wave has no random elites (region 1 spawn chance is 0)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollSpawnIsElite(30, "wave")).toBe(false);
  });

  it("later wave can spawn elites when roll succeeds", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    expect(rollSpawnIsElite(400, "wave")).toBe(true);
  });

  it("later wave respects failed elite roll", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.95);
    expect(rollSpawnIsElite(400, "wave")).toBe(false);
  });
});
=======
import { describe, expect, it } from "vitest";
import { getEnemyCap } from "./enemySpawner";
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo

describe("getEnemyCap", () => {
  it("starts with higher early pressure and ramps up faster", () => {
    expect(getEnemyCap(0, "wave")).toBe(6);
    expect(getEnemyCap(29, "wave")).toBe(6);
    expect(getEnemyCap(30, "wave")).toBe(8);
    expect(getEnemyCap(60, "wave")).toBe(10);
    expect(getEnemyCap(90, "wave")).toBe(10);
    expect(getEnemyCap(120, "wave")).toBe(12);
    expect(getEnemyCap(240, "wave")).toBe(16);
  });
});
