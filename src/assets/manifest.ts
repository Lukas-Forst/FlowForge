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
  propBarrel: {
    id: "propBarrel",
    path: "/assets/models/props/Meshy_AI_Weathered_wooden_barr_0423095209_texture.glb",
    tier: "biome",
  },
  propBuoy: {
    id: "propBuoy",
    path: "/assets/models/props/Meshy_AI_Stylized_ocean_naviga_0423095217_texture.glb",
    tier: "biome",
  },
  propCrystal: {
    id: "propCrystal",
    path: "/assets/models/props/Meshy_AI_Mysterious_crystal_fo_0423094924_texture.glb",
    tier: "deferred",
  },
  propPalm: {
    id: "propPalm",
    path: "/assets/models/props/Meshy_AI_Single_stylized_palm__0423095118_texture.glb",
    tier: "deferred",
  },
  propIsland: {
    id: "propIsland",
    path: "/assets/models/props/Meshy_AI_Small_stylized_tropic_0423095130_texture.glb",
    tier: "deferred",
  },
};
