# FlowForge — Abilities, Ships & Boss Gates Design

**Date:** 2026-04-23  
**Scope:** Three interlinked features — swappable active ability slots, multiple playable ship hulls, and boss-gated biome transitions.

---

## 1. Overview

This spec covers three features that are designed to work together but are architecturally independent:

1. **Ability Slot System** — three active ability slots (SPACE, SHIFT, E). Each can hold one of nine swappable abilities. Abilities surface in the existing upgrade modal. Hard cap: 3 abilities max, no more once all slots are filled.
2. **Ship Hull System** — six playable ships with distinct stat profiles. Two are offered after each of the first three biome boss kills. Ships change base stats only (not starting abilities).
3. **Boss-Gated Biome Transitions** — biomes no longer transition on a timer. Instead each phase ends with a named boss fight; killing it triggers the transition and offers a hull upgrade.

All three follow Approach A: extend the existing upgrade pool and `GameSnapshot` rather than introducing parallel systems.

---

## 2. Redesigned Run Arc

### Current (time-based)
Biomes transition at fixed times: 5 min → 12 min → 18 min. No player agency.

### New (boss-kill-gated)
Each biome has a phase boss that spawns at a set time within that phase. The biome does **not** transition until the boss is killed. Killing the boss immediately:
1. Clears all remaining enemies.
2. Triggers the biome transition (with the existing 30s lerp).
3. Offers a hull upgrade modal (2 ship choices + "keep current").
4. Starts the next phase with a short lull.

| Phase | Biome | Boss spawns at | Boss | Hull reward |
|---|---|---|---|---|
| 1 | open_sea | ~5 min into phase | Reef Warden | ✅ Yes |
| 2 | island_chain | ~7 min into phase | Storm Caller | ✅ Yes |
| 3 | deep_waters | ~6 min into phase | Abyss Dreadnought | ✅ Yes |
| 4 | boss_storm | Immediately on entry | Forsaken Leviathan | ❌ Final boss |

### Run clock changes
- `RUN_ARC_P1_END`, `P2_END`, `P3_END` become **per-phase timers** (time elapsed *within* the current phase), not absolute elapsed time.
- `runClock` gains a `phaseElapsed` counter that resets to 0 on each biome transition.
- `getRunRegionBiome()` derives biome from `runBiome` state field (set on boss kill) rather than absolute elapsed time.
- The wave/elite/lull sub-cycle continues unchanged within each phase.

### New `GameSnapshot` fields
```ts
runBossState: {
  phase1BossSpawned: boolean;
  phase1BossKilled: boolean;
  phase2BossSpawned: boolean;
  phase2BossKilled: boolean;
  phase3BossSpawned: boolean;
  phase3BossKilled: boolean;
}
```

---

## 3. Biome Bosses

### 3.1 Reef Warden (Phase 1 boss)
- **HP:** 400
- **Speed:** 5.5
- **Touch damage:** 30
- **Attack pattern:** Fires targeted 3-shot volleys every 2.5s. At 50% HP spawns 2 swarmer escorts.
- **Visual identity:** Heavy armoured warship, barnacled hull, twin side cannons.
- **Telegraph:** 1.0s ring before each volley.

### 3.2 Storm Caller (Phase 2 boss)
- **HP:** 700
- **Speed:** 7.0
- **Touch damage:** 40
- **Attack pattern:** Fires a 6-shot spread volley every 3s. Every 15s summons 3 elite corsairs. At 30% HP movement speed increases by 50%.
- **Visual identity:** Sleek fast frigate, crackling lightning-rod mast, storm-grey sails.
- **Telegraph:** 0.8s ring before volley.

### 3.3 Abyss Dreadnought (Phase 3 boss)
- **HP:** 1200
- **Speed:** 4.5
- **Touch damage:** 55
- **Attack pattern:** Alternates between two modes every 8s — (a) 12-way spiral barrage, (b) charge ram that leaves a burning projectile trail for 3s.
- **Visual identity:** Massive black iron hull, glowing abyssal runes, broken masts trailing seaweed.
- **Telegraph:** 1.5s ring for spiral; no telegraph on charge (telegraphed by speed burst instead).

### 3.4 Forsaken Leviathan (Phase 4 mega-boss — existing)
- Existing implementation unchanged.
- HP: 600 + (elapsedTotal / 60) × 350.
- 16-way 360° spread every 4.5s.
- No biome reward on kill — run continues in boss_storm until player dies.

---

## 4. Ability Slot System

### 4.1 Slots

| Slot | Key | Default ability | Can be replaced |
|---|---|---|---|
| Cannon | SPACE | Standard cannon salvo | ✅ Yes |
| Boost | SHIFT | Speed dash | ✅ Yes |
| Extra | E | (empty) | ✅ Yes — fills from empty |

**Hard cap:** Once all three slots hold an ability, ability upgrade cards are removed from the upgrade pool entirely — including same-slot swaps. Your build is locked in. No fourth slot is ever added.

### 4.2 Slot replacement logic
- Each ability card is tagged with its slot type.
- Picking an ability card sets `activeCannonAbility`, `activeBoostAbility`, or `activeExtraAbility` on `UpgradeStats`.
- Abilities within the same slot are mutually exclusive in the pool — only non-held options surface.
- If a slot is already filled and a same-slot ability appears (possible in edge cases), picking it replaces the current and returns the old ability to the pool.

### 4.3 New `UpgradeStats` fields
```ts
activeCannonAbility: "cannon" | "drones" | "flare" | "chainShot";
activeBoostAbility: "boost" | "mines" | "ringBarrage" | "anchorDrop";
activeExtraAbility: null | "torpedo" | "depthCharge" | "oilSlick";
```

### 4.4 New `UpgradeType` entries
Nine new values added to the existing `UpgradeType` union:
`"cannonDrones" | "cannonFlare" | "cannonChainShot" | "boostMines" | "boostRingBarrage" | "boostAnchorDrop" | "extraTorpedo" | "extraDepthCharge" | "extraOilSlick"`

### 4.5 Ability definitions

#### Cannon slot

| Ability | Key | CD | Status | Effect |
|---|---|---|---|---|
| Drone Swarm | SPACE | 8s | **Full** | Deploy 3 orbiting drones for 10s; auto-fire at nearest enemy within 12 units. Upgradeable to 5 drones via `cannonDrones` stack 2. |
| Flare Burst | SPACE | 9s | WIP | Wide 120° cone — stuns all enemies hit for 2s; stunned enemies take +50% damage. |
| Chain Shot | SPACE | 7s | WIP | Single heavy projectile that pierces all enemies in a line, slowing each by 40% for 3s. |

#### Boost slot

| Ability | Key | CD | Status | Effect |
|---|---|---|---|---|
| Sea Mines | SHIFT | 10s | **Full** | Drop 3 drifting mines directly behind the ship. Each mine persists 8s and deals 60 damage on contact. |
| Ring Barrage | SHIFT | 10s | **Full** | Fire 10 mortar shells simultaneously in a full circle at ~15 unit radius. Each shell deals 35 damage. |
| Anchor Drop | SHIFT | 9s | WIP | Stop dead for 0.3s; emit a shockwave that pushes all enemies in a 10-unit radius back and deals 45 damage. |

#### Extra slot (E)

| Ability | Key | CD | Status | Effect |
|---|---|---|---|---|
| Torpedo | E | 12s | **Full** | Fire a slow torpedo (speed 8) straight ahead. Pierces all enemies. Detonates at end of TTL in a 6-unit AoE (80 damage). |
| Depth Charge | E | 14s | WIP | Lob a charge that sinks, waits 1.5s, then erupts in a 9-unit AoE (100 damage). |
| Oil Slick | E | 11s | WIP | Leave a burning oil patch (8-unit radius, 6s duration). Enemies inside take 8 damage/s and move 30% slower. |

### 4.6 HUD changes
- Three slot pips added to the existing HUD alongside the cannon/boost cooldown indicators.
- Empty Extra slot shown with dashed border.
- Each pip shows: ability icon, key label, cooldown fill bar.

---

## 5. Ship Hull System

### 5.1 Presentation
After each of the first three boss kills, the game pauses and shows a **hull upgrade modal** with two ship options plus a "Keep current hull" button. The player picks one; the choice takes effect immediately.

Hull upgrade cards use a gold border and never appear in the normal coin-threshold upgrade pool.

### 5.2 New types
```ts
export type ShipHullType =
  | "sloop"       // default
  | "frigate"
  | "galleon"
  | "brigantine"
  | "bombardier"
  | "man_o_war"
  | "phantom";

export interface ShipHullStats {
  hpMult: number;
  speedMult: number;
  fireRateMult: number;
  armorMult: number;
  abilityCdMult: number;       // multiplier on all ability cooldowns
  boostCdMult: number;         // extra multiplier on boost specifically
  passiveBroadsideIntervalMult: number;
  rearCritMult: number;        // 1.0 = normal, 2.0 = double rear damage (Phantom)
  aoeRadiusMult: number;       // multiplier on AoE ability radii (Bombardier)
}
```

### 5.3 Hull stat table

| Ship | HP | Speed | Fire Rate | Armor | Notes |
|---|---|---|---|---|---|
| Sloop | 1.0× | 1.0× | 1.0× | 1.0× | Balanced default |
| Frigate | 0.6× | 1.4× | 1.8× | 0.7× | Glass cannon |
| Galleon | 2.0× | 0.6× | 0.7× | 1.5× | Tank |
| Brigantine | 0.75× | 1.3× | 1.0× | 1.0× | Boost CD −50% |
| Bombardier | 1.0× | 0.8× | 1.0× | 1.0× | Ability CD −45%, AoE +30% |
| Man O' War | 2.2× | 0.5× | 1.6× | 1.6× | Broadside every 2s |
| Phantom | 0.65× | 1.9× | 1.0× | 0.8× | 2× damage on rearward-firing projectiles (Stern Chaser, auto-shots that hit enemies behind) |

### 5.4 Unlock schedule

| Boss killed | Ships offered |
|---|---|
| Reef Warden (Phase 1) | Frigate, Galleon |
| Storm Caller (Phase 2) | Brigantine, Bombardier |
| Abyss Dreadnought (Phase 3) | Man O' War, Phantom |

### 5.5 `GameSnapshot` changes
```ts
activeHull: ShipHullType;  // default "sloop"
pendingHullOptions: ShipHullType[] | null;  // set after boss kill, cleared on pick
```

---

## 6. Meshy.ai Generation Prompts

### Boss Models

#### Reef Warden
```
A heavily armoured 17th-century warship boss, top-down isometric view, low-poly game asset. 
Barnacle-encrusted dark oak hull with iron plating bolted over the sides. Twin massive 
side cannons visible. Tattered battle-worn sails in deep navy and rust red. Glowing 
amber lanterns along the hull. Neutral pose facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Storm Caller
```
A sleek fast frigate boss ship, top-down isometric view, low-poly game asset. 
Storm-grey angular hull with crackling electric-blue lightning arcing along a tall 
iron mast. Shredded dark sails with lightning-bolt insignia. Sparking rigging lines. 
Aggressive forward-leaning silhouette. Neutral pose facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Abyss Dreadnought
```
A massive black iron dreadnought boss ship, top-down isometric view, low-poly game asset. 
Enormous hull plated in dark obsidian metal with glowing teal abyssal runes etched along 
the sides. Broken masts trailing ghostly seaweed and bioluminescent tendrils. 
Deep purple glow emanating from cannon ports. Oppressive and hulking silhouette. 
Neutral pose facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Forsaken Leviathan (Mega-Boss)
```
A colossal ancient warship mega-boss, top-down isometric view, low-poly game asset. 
Three broken masts wrapped in storm clouds and purple crackling energy. Skull-and-bones 
figurehead at the bow. Hull covered in barnacles, cannon holes, and glowing violet sigils. 
Torn black sails with a ghostly aura. Massive and imposing, twice the size of normal ships. 
Neutral pose facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

---

### Ship Hull Models

#### Sloop (default)
```
A compact balanced sloop ship, top-down isometric view, low-poly game asset. 
Clean wooden hull in warm brown, single mast with white-and-blue sails. 
Small but well-maintained. Friendly heroic silhouette. Facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Frigate
```
A sleek aggressive frigate ship, top-down isometric view, low-poly game asset. 
Narrow sharp hull in dark steel-blue with red trim. Two raked masts with tattered crimson 
sails. Rows of cannon ports along the sides. Fast predatory silhouette. Facing forward. 
No background. Style: stylised low-poly, strong silhouette, game-ready.
```

#### Galleon
```
A massive heavily armoured galleon ship, top-down isometric view, low-poly game asset. 
Broad oak hull reinforced with iron bands and thick plating. Three tall masts with 
grey-and-gold sails. High stern castle visible from above. Imposing fortress-like silhouette. 
Facing forward. No background. Style: stylised low-poly, strong silhouette, game-ready.
```

#### Brigantine
```
A nimble brigantine ship built for speed, top-down isometric view, low-poly game asset. 
Lightweight pale hull with bright teal accent stripes. Two raked masts with billowing 
teal-and-white sails. Minimal deck clutter — everything stripped for speed. 
Dynamic darting silhouette. Facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Bombardier
```
A stocky bombardier warship loaded with explosives, top-down isometric view, low-poly game asset. 
Squat wide hull in dark iron-grey with yellow-and-black hazard stripes on the hull panels. 
Oversized mortar tubes mounted on the deck. Short reinforced mast with plain grey sails. 
Heavy utilitarian silhouette. Facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Man O' War
```
A colossal man-of-war warship, top-down isometric view, low-poly game asset. 
Enormous broad hull in deep mahogany with gold trim. Four masts with black-and-gold sails. 
Three rows of cannon ports along each side. Ornate gilded figurehead at the bow. 
Overwhelming dominant silhouette. Facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

#### Phantom
```
A ghostly phantom raider ship, top-down isometric view, low-poly game asset. 
Translucent dark hull with ethereal blue-white luminescent edges and faint spectral glow. 
Tattered smoky sails that fade into wisps. Barely-visible silhouette with glowing portholes. 
Eerie, spectral, low-profile. Facing forward. No background. 
Style: stylised low-poly, strong silhouette, game-ready.
```

---

## 7. Architecture Summary

All changes extend existing systems under Approach A:

### Files to create
- `src/game/systems/abilitySlots.ts` — ability dispatch logic for all 9 abilities (replaces cannon/boost inline calls)
- `src/game/systems/biomeBosse.ts` — spawn and attack logic for the 3 new intermediate bosses
- `src/scene/entities/BossShip.tsx` — renders boss models (uses `GltfMeshyProp` pattern)
- `src/ui/HullUpgradeModal.tsx` — hull selection modal shown after boss kills

### Files to modify
- `src/game/types.ts` — add `ShipHullType`, `ShipHullStats`, update `UpgradeStats`, `GameSnapshot`
- `src/game/constants.ts` — add `UPGRADE_OPTIONS` entries for 9 new ability types, `SHIP_HULL_STATS` record
- `src/game/systems/runArc.ts` — replace absolute-time biome transitions with per-phase boss-kill gates
- `src/game/systems/upgrades.ts` — add ability slot logic to `buildUpgradeChoices`, `applyUpgrade`
- `src/game/useGameState.ts` — wire up new ability inputs (E key), hull modal trigger, boss-kill handler
- `src/game/systems/bossSpawner.ts` — add intermediate boss spawning tied to phase elapsed time
- `src/ui/Hud.tsx` — add three ability slot pips with cooldown bars
- `src/scene/GameScene.tsx` — render boss ships, pass hull type to `PlayerShip`
- `src/scene/models/ShipModelVisual.tsx` — support hull type variant for player ship rendering

### No new systems
The wave/elite/lull sub-clock, coin-threshold upgrade trigger, post-FX, audio events, and visual effects systems are all unchanged and reused as-is.

---

## 8. Scope & WIP Boundaries

### Fully implemented (Phase 1 of this work)
- Run arc restructuring (boss-kill-gated transitions)
- Reef Warden, Storm Caller, Abyss Dreadnought bosses (attack patterns)
- Ability slot system infrastructure (slot tracking, upgrade pool filtering, HUD pips, E key input)
- Drone Swarm (cannon slot — full)
- Sea Mines (boost slot — full)
- Ring Barrage (boost slot — full)
- Torpedo (extra slot — full)
- Hull upgrade modal + hull stat application
- Ship models integrated via `GltfMeshyProp` once generated from Meshy.ai

### WIP stubs (tracked, effects not yet implemented)
- Flare Burst, Chain Shot (cannon slot)
- Anchor Drop (boost slot)
- Depth Charge, Oil Slick (extra slot)
- Ships appear as choices but models fall back to placeholder geometry until Meshy.ai assets arrive

### Out of scope for this spec
- Meta-progression between runs (ship unlocks carry over)
- Ability synergy upgrades (e.g. "mines deal +50% damage")
- Multiplayer (partysocket integration is separate work)
