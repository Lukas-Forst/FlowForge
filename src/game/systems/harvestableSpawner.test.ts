import { describe, expect, it } from "vitest";
import { updateHarvestableSpawning } from "./harvestableSpawner";
import type { HarvestableState } from "../types";

describe("harvestableSpawner", () => {
  it("spawns harvestables up to the cap", () => {
    const harvestables: HarvestableState[] = [];
    const idRef = { value: 1 };
    const playerPos = { x: 0, y: 0 };
    
    // Call multiple times to fill 
    for (let i = 0; i < 20; i++) {
        updateHarvestableSpawning(harvestables, idRef, playerPos, 100, 1/60);
    }
    
    // It should cap at 8
    expect(harvestables.length).toBe(8);
    // They should have positive HP and position outside camera
    expect(harvestables[0].hp).toBeGreaterThan(0);
    expect(harvestables[0].position.x).not.toBe(0);
  });
});
