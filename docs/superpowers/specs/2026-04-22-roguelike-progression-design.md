# Roguelike Progression, Enemy Escalation & Map Enrichment — Design Spec

**Date:** 2026-04-22  
**Reference:** Vampire Survivors (primary), 15–20 min shaped run  
**Approach:** Three-pillar integration — progression, escalation, and map enrichment reinforce each other

---

## Overview

This spec covers three interconnected systems that together make FlowForge feel like a satisfying roguelike:

1. **Run Arc** — a shaped 15–20 min session with four distinct phases
2. **Progression & Upgrades** — expand from 12 → 24 upgrades + 5 weapon evolutions
3. **Map Enrichment** — biome-phase-specific obstacles and loot nodes (Meshy.ai 3D models)
4. **Enemy Escalation** — swarms and elite variants that keep pace with player power
5. **Light Meta** — localStorage leaderboard on the existing Game Over screen

Everything builds on existing systems (`runClock`, `spawnIntensity`, `GameSnapshot`, `upgradeStats`, harvestable spawner). No new screens are required.

---

## 1. Run Arc

The biome is no longer random — it follows the run clock. `runClock.elapsedTotal` drives both biome transitions and spawn intensity.

| Phase | Time | Biome | Feel |
|---|---|---|---|
| 1 — The Calm | 0–5 min | `open_sea` | Learn controls, build identity |
| 2 — The Grind | 5–12 min | `island_chain` | All enemies introduced, first evolutions |
| 3 — The Chaos | 12–18 min | `deep_waters` | Screen-filling hordes, power fantasy peaks |
| 4 — The Climax | 18–20 min | `boss_storm` (new visual preset) | Mega-boss, no new upgrades |

**Biome transition:** Smooth lerp over 30 seconds when `elapsedTotal` crosses a threshold. The existing `BiomeTheme` lerp in `WaterArena` already supports this.

**Spawn intensity curve:**
```
Phase 1: spawnIntensity = lerp(0.15, 0.35, t/300)
Phase 2: spawnIntensity = lerp(0.35, 0.70, (t-300)/420)
Phase 3: spawnIntensity = lerp(0.70, 0.95, (t-720)/360)
Phase 4: spawnIntensity = 1.0 (fixed, boss active)
```

**`boss_storm` BiomeTheme additions** (new preset, not a full biome):
- Fog near/far tightened significantly
- `waterEmissiveIntensity` raised to 0.28
- `backgroundColor` darkened to near-black
- `waveHeight` 2.0, `waveSpeed` 1.6

---

## 2. Progression & Upgrades

### 2a. Upgrade Pool (24 total)

Existing upgrades reorganised into four archetypes. New upgrades marked ✦.

**Firepower**
| Name | Effect | Rarity | Max Stacks |
|---|---|---|---|
| Powder Frenzy | Fire rate ×1.22 | common | 5 |
| Twin Cannons | +1 forward shot | uncommon | 3 |
| Broadside Volley | Side guns | uncommon | 2 |
| Armor Piercing | Pierce +1 | uncommon | 2 |
| Shrapnel Blast | Cannon salvo +2, wider arc | rare | 2 |
| Grapeshot ✦ | Shots split into 3 on hit | rare | 2 |
| Stern Chaser ✦ | Adds rear-firing auto-shot | uncommon | 2 |
| Explosive Rounds ✦ | Shots detonate on impact (small AoE) | rare | 2 |

**Mobility**
| Name | Effect | Rarity | Max Stacks |
|---|---|---|---|
| Trade Winds | Speed ×1.15 | common | 4 |
| Second Wind | Boost CD −40%, active time +50% | rare | 1 |
| Full Steam Ahead | Auto-fire ×2 while boosting | epic | 1 |
| Ram Prow ✦ | Ramming enemies deals damage (scaling with speed) | uncommon | 2 |
| Ghost Hull ✦ | Brief invuln frame after each boost | uncommon | 1 |
| Afterburner ✦ | Boost leaves a burning damage trail | rare | 2 |

**Survival**
| Name | Effect | Rarity | Max Stacks |
|---|---|---|---|
| Hull Reinforcement | +25 max HP, full heal | common | 3 |
| Iron Plating | −15% damage taken | uncommon | 3 |
| Swabbed Cannons | Cannon CD −18% | common | 4 |
| Bilge Pump ✦ | Regenerate 1 HP/sec | uncommon | 2 |
| Scavenger ✦ | Enemy kills have 15% chance to drop HP pickup | uncommon | 2 |
| Sacrifice Rig ✦ | Spend 20 HP for an immediate double-resource burst | rare | 1 |

**Scavenging**
| Name | Effect | Rarity | Max Stacks |
|---|---|---|---|
| Salvage Net | Coin pickup radius + | uncommon | 2 |
| Deep Dredge ✦ | Loot nodes drop 2× resources | uncommon | 2 |
| Crow's Nest ✦ | Nearby loot nodes flash a brief gold pulse on screen (no minimap required) | common | 1 |
| Press Gang ✦ | Every 20 kills spawns a chest pickup | rare | 1 |

### 2b. Weapon Evolutions

Evolutions are offered as a gold-bordered "EVOLVED" card in the standard 1-of-3 upgrade modal when both prerequisites are maxed. The player can defer taking an evolution. Implemented by extending `buildUpgradeChoices` to check `upgrades.stacks` against evolution prerequisites.

| Evolution | Prerequisites | Effect |
|---|---|---|
| **Death Blossom** | Powder Frenzy (max) + Twin Cannons (max) | Fires in all 8 directions simultaneously |
| **Ghost Tide** | Trade Winds (max) + Second Wind (max) | Boost recharges instantly; permanent +60% speed |
| **Ironclad** | Iron Plating (max) + Hull Reinforcement (max) | −50% damage taken; ramming enemies reflects their damage |
| **Tidal Sweep** | Salvage Net (max) + Deep Dredge (max) | All on-screen pickups auto-collect every 8 sec |
| **Hellfire Wake** | Explosive Rounds (max) + Afterburner (max) | Boost trail explodes all enemies it passes through |

**Evolution data shape** — add to `UpgradeType`:
```ts
type UpgradeType = ... | "deathBlossom" | "ghostTide" | "ironclad" | "tidalSweep" | "hellfireWake"
```

Each evolution has `maxStacks: 1` and `rarity: "epic"`. The prerequisite check runs in `buildUpgradeChoices` before the normal weighted pool.

---

## 3. Map Enrichment

Two prop categories added per phase:
- **Obstacles** — non-interactive decoration that narrows navigable space. Props themselves have no physics colliders (consistent with existing islands). Their effect is indirect: the spawner places them in dense clusters that force the player to weave through tighter corridors, and enemies spawn around them — creating natural chokepoints. The `SeaVentProp` is the one exception: it applies a soft radial push force on the player (not collision, just a velocity nudge).
- **Loot Nodes** — extend the existing `HarvestableState` system with new `HarvestableType` values

### 3a. Phase-by-phase props

**Phase 1 — Open Sea**

Obstacles: existing `NavBuoyProp`, `IslandProp` — no new geometry  
Loot nodes (new `HarvestableType`):
- `floating_cargo` — 1-hit, low yield (8–12 coins), small radius
- existing `scrap_raft` and `abandoned_boat` remain

**Phase 2 — Island Chain**

Obstacles (new prop components):
- `RockOutcropProp` — Meshy.ai model, 3–4 rock cluster, non-collidable visually but treated as obstacle by spawner margin
- `RuinedDockProp` — Meshy.ai model, broken dock section

Loot nodes (new `HarvestableType`):
- `derelict_steamer` — uses `Meshy_AI_Steamboat_0417111838_texture.glb` (already in `/public/assets/models/`), 2-hit, moderate yield (40–60 coins)
- `anchor_cache` — 2-hit, drops gem pickups

**Phase 3 — Deep Waters**

Obstacles (new prop components):
- existing `CrystalSpireProp` — spawn density ×2.5 vs Phase 1
- `SeaVentProp` — Meshy.ai model, slow radial push force on nearby player (not damage)
- `WreckHullProp` — Meshy.ai model, impassable large wreck

Loot nodes (new `HarvestableType`):
- `sunken_galleon` — Meshy.ai model, 3-hit, massive yield (120–180 coins)
- `treasure_chest` — 1-hit, rare spawn, high gem yield (8–12 gems)

**Phase 4 — Boss Storm**

Props cleared. `Meshy_AI_boss_0417133833_texture.glb` (already in `/public/assets/models/`) used as the mega-boss model via `bossSpawner`.

### 3b. Meshy.ai Model Generation Prompts

Generate these at [meshy.ai](https://meshy.ai) using the **Text to 3D** mode. Export as `.glb` with textures baked. Target polygon count: 2,000–8,000 tris per model. Place outputs in `/public/assets/models/props/`.

---

**Priority 1 — Sunken Galleon**
```
A weathered 17th-century wooden sailing galleon, half-submerged at a 30-degree list to starboard. 
The hull is broken amidships, barnacles and seaweed covering the lower hull. Masts are snapped and 
trailing in the water. Cannon ports visible on the exposed side. Stylised low-poly aesthetic with 
hand-painted textures. Top-down isometric view friendly. Ambient occlusion baked.
```

---

**Priority 2 — Rock Outcrop Cluster**
```
A cluster of 3 to 4 jagged volcanic sea rocks emerging from the ocean surface. The largest rock 
is about 4 metres tall, the others smaller and staggered around it. Wet dark basalt texture with 
white foam at the waterline. Stylised low-poly, suitable for an isometric ocean game. Compact 
footprint, roughly 6 metres diameter total. Ambient occlusion baked.
```

---

**Priority 3 — Treasure Chest**
```
A small barnacle-encrusted wooden treasure chest, closed and padlocked, sitting slightly tilted on 
the ocean floor or floating at the surface. Iron reinforced corners, aged wood with green patina. 
Stylised low-poly aesthetic with vibrant hand-painted textures. About 1 metre wide. Suitable for 
an isometric ocean game. Ambient occlusion baked.
```

---

**Priority 4 — Ruined Dock Section**
```
A section of a ruined wooden dock or pier, roughly 8 metres long. Several planks are broken or 
missing, two of the supporting piles are snapped at different heights, the whole structure leans 
slightly. Weathered grey driftwood texture with seaweed and barnacles at the base. Low-poly 
stylised, isometric ocean game aesthetic. Ambient occlusion baked.
```

---

**Priority 5 — Sea Vent / Bubble Column**
```
An underwater geothermal sea vent — a squat wide base of dark porous volcanic rock about 3 metres 
in diameter, from which streams of bubbles and white smoke emerge upward. The rock glows faintly 
orange at the cracks. Stylised low-poly aesthetic, bright and readable from a top-down isometric 
angle. Ambient occlusion baked.
```

---

**Priority 6 — Cargo Crate Stack**
```
A stack of 3 to 4 weathered shipping crates loosely bound together, floating at the ocean surface. 
Crates are slightly different sizes and colours — faded red, blue, and grey. Ropes and netting 
visible between them. Stylised low-poly isometric game aesthetic. About 3 metres wide total. 
Ambient occlusion baked.
```

---

## 4. Enemy Escalation

### 4a. On-screen enemy cap

Replace the current fixed cap with a phase-driven value in `enemySpawner`:

| Phase | Max simultaneous enemies |
|---|---|
| 1 (0–5 min) | 8 |
| 2 (5–12 min) | 18 |
| 3 (12–18 min) | 35 |
| 4 (18–20 min) | 20 + boss |

### 4b. Per-minute stat scaling

Applied in `enemySpawner` when constructing new `EnemyState`:
```ts
const minutesSurvived = snapshot.runClock.elapsedTotal / 60;
hp    *= Math.pow(1.06, minutesSurvived);
speed *= Math.pow(1.03, minutesSurvived);
touchDamage *= Math.pow(1.04, minutesSurvived);
```

### 4c. Elite variants (new `EnemyType` flag)

Rather than new enemy types, elites are existing types with an `isElite: boolean` flag added to `EnemyState`. Elites appear from Phase 2 onward at ~20% of spawns, rising to ~40% in Phase 3.

Visual distinction: gold outline (×1.3 scale, emissive gold tint on ship mesh).

| Elite type | Behaviour addition |
|---|---|
| Elite Corsair | Fires 3-way spread instead of single shot |
| Elite Brute | Explodes on death (small AoE damage) |
| Elite Swarmer | Spawns 3 normal swarmers on death |

### 4d. Mini-boss (Phase 3)

Every 2 minutes in Phase 3, one additional boss-tier enemy spawns (using existing `bossSpawner` at ~40% normal boss HP). On death it drops a guaranteed `instant_levelup` pickup — a new `PickupKind` that triggers the upgrade modal immediately without requiring resource threshold.

---

## 5. Light Meta — Leaderboard

### 5a. Score formula

```ts
score = timeSurvived * 100
      + enemiesKilled * 25
      + collectedCoins * 2
      + evolutionsUnlocked * 500
```

`evolutionsUnlocked` = count of evolution-type upgrades in `upgrades.stacks` with value ≥ 1.

### 5b. Persistence

Stored in `localStorage` as `flowforge_runs` — a JSON array of up to 10 run records:
```ts
interface RunRecord {
  score: number;
  timeSurvived: number;
  enemiesKilled: number;
  collectedCoins: number;
  evolutionsUnlocked: number;
  topUpgrade: string;   // label of highest-rarity upgrade taken
  date: string;         // ISO date string
}
```

### 5c. Game Over screen additions

Extend `GameOverScreen.tsx`:
- Show current run score, formatted with commas
- "NEW BEST!" banner if score beats previous top
- List top 5 previous runs (score + time + date) below the current run stats
- No new screen component needed — extend existing

---

## 6. What Stays Unchanged

- Resource-collection leveling system (coins → threshold → upgrade modal)
- Pick-1-of-3 upgrade modal UI
- All 7 existing enemy types
- Boost + cannon abilities and their cooldown system
- Supply pickups (supply_heal, supply_frenzy, supply_invuln)
- All 3 biome visual themes (open_sea, island_chain, deep_waters) — same water/lighting params
- Harvestable spawner structure (extended, not replaced)
- Endless world coordinate system

---

## Implementation Scope

This spec introduces changes across these layers:

| Layer | Changes |
|---|---|
| `types.ts` | New `UpgradeType` values, `isElite` on `EnemyState`, new `HarvestableType` values, new `PickupKind`, `RunRecord` interface, add `"boss_storm"` to `BiomeType` |
| `constants.ts` | New `UPGRADE_OPTIONS` entries, enemy cap table, Meshy model paths |
| `upgrades.ts` | Evolution prerequisite check in `buildUpgradeChoices`, evolution `applyUpgrade` effects |
| `enemySpawner.ts` | Phase-driven cap, per-minute stat scaling, elite flag logic |
| `harvestableSpawner.ts` | New harvestable types, phase-driven spawn pools |
| `useGameState.ts` | `runBiome` driven by `elapsedTotal` not random, `boss_storm` handling, mini-boss timer |
| `pickups.ts` | `instant_levelup` pickup kind |
| `biomeThemes.ts` | `boss_storm` theme preset |
| `scene/arcade/props/` | New prop components: `RockOutcropProp`, `RuinedDockProp`, `SeaVentProp`, `WreckHullProp` |
| `GameOverScreen.tsx` | Score display, leaderboard, localStorage persistence |
| `GameScene.tsx` | Phase-aware prop spawning dispatch |
