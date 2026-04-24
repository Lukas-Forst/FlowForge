export type AssetTier = "critical" | "biome" | "deferred";

export interface AssetEntry {
  id: string;
  path: string;
  tier: AssetTier;
}

export const MANIFEST: Record<string, AssetEntry> = {
  playerShip: { id: "playerShip", path: "/assets/models/ships/Main_ship.glb", tier: "critical" },
  enemyShipBasic: { id: "enemyShipBasic", path: "/assets/models/ships/Enemy_ship_basic.glb", tier: "biome" },
  enemyShipFast: { id: "enemyShipFast", path: "/assets/models/ships/Enemy_ship_fast.glb", tier: "biome" },
  enemyShipTank: { id: "enemyShipTank", path: "/assets/models/ships/Enemy_ship_tank.glb", tier: "biome" },
  enemyShipBoss: { id: "enemyShipBoss", path: "/assets/models/ships/Enemy_ship_boss.glb", tier: "deferred" },
  propBarrel: { id: "propBarrel", path: "/assets/models/props/prop_barrel.glb", tier: "biome" },
  propBuoy: { id: "propBuoy", path: "/assets/models/props/prop_buoy.glb", tier: "biome" },
  propCrystal: { id: "propCrystal", path: "/assets/models/props/prop_crystal.glb", tier: "deferred" },
  propPalm: { id: "propPalm", path: "/assets/models/props/prop_palm.glb", tier: "deferred" },
  propIsland: { id: "propIsland", path: "/assets/models/props/prop_island.glb", tier: "deferred" },
  propRock: { id: "propRock", path: "/assets/models/props/prop_rock.glb", tier: "biome" },
  propWreck: { id: "propWreck", path: "/assets/models/props/prop_wreck.glb", tier: "deferred" },
};
