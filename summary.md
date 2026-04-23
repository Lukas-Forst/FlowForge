# FlowForge — Game Summary

## What Is FlowForge?

FlowForge is a browser-based, top-down arcade naval combat game in the roguelite survivor genre (think Vampire Survivors, but on the open sea). The player pilots a single warship on an infinite ocean, fighting off relentless waves of enemy ships, harvesting flotsam for resources, collecting power-ups, and forging a build out of stacking upgrades — all while a timed run arc escalates the pressure until a mega-boss finally arrives. There are no levels to reach; the only goal is to survive as long as possible and maximize score before the hull gives out.

The game runs entirely in the browser as a single-page React application with a 3D scene rendered via Three.js (React Three Fiber). There are no server calls, no accounts, no downloads — just open the page and play. Run records are saved to `localStorage`.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| 3D Renderer | Three.js via `@react-three/fiber` (R3F) |
| Post-processing | `@react-three/postprocessing` / `postprocessing` |
| Build / Dev | Vite 8 + Rolldown bundler |
| Testing | Vitest |
| Audio | Procedural synthesis (`devSynth.ts`) — no audio files |
| 3D assets | GLTF models (Meshy-generated, Draco-compressed) + procedural fallback geometry |

The codebase is entirely TypeScript. The simulation (game logic) is fully separated from the renderer (React Three Fiber scene), communicating only through an immutable `GameSnapshot` object that is deep-copied each tick.

---

## The Arena

The world is an endless ocean with no hard walls. An orthographic isometric camera (positioned at a 45-degree diagonal, zoom level 22) follows the player with smooth exponential-decay lerp. The sea is a 900×900 unit plane mesh with a 64×64 vertex grid that is deformed every frame by layered sine-wave mathematics — three overlapping wave frequencies (low-frequency swell, medium chop, micro-turbulence), all scaled by biome-specific `waveHeight` and `waveSpeed` parameters. The water uses `meshPhysicalMaterial` with clearcoat, roughness, emissive glow, and a procedurally generated canvas bump-map (14 soft radial blobs baked at session start).

World props are scattered using a deterministic integer hash over a 40-unit grid, so the sea looks endless and distinct without any visible arena boundary. Floating props (buoys, barrels) bob with per-item sinusoidal oscillation in all three rotation axes.

---

## The Run Arc — Biomes Over Time

Each run unfolds across four biome regions, automatically transitioning based on elapsed time. Biome blending is smooth: lighting, water color, fog, and shimmer are all lerped over 30-second transition windows.

| Region | Time | Biome | Atmosphere | Props |
|---|---|---|---|---|
| Phase 1 | 0–5 min | **Open Sea** | Bright midday blue, warm sun, gentle waves | Navigation buoys, floating barrels |
| Phase 2 | 5–12 min | **Island Chain** | Tropical teal, lush greens in rim light, calmer water | Tropical islands, rock outcrops, ruined docks |
| Phase 3 | 12–18 min | **Deep Waters** | Dark navy storm, high waves, moody cold light | Crystal spires rising from the depths |
| Phase 4 | 18+ min | **Boss Storm** | Purple-black sky, magenta shimmer, violent seas, near-zero visibility | No props — pure chaos |

Enemy caps rise as the run progresses: 8 in Phase 1 → 18 in Phase 2 → 35 in Phase 3 → 20 + mega-boss in Phase 4. Spawn intervals shrink from 0.82s down to a minimum of 0.2s, and enemies grow stronger (HP scales up to +55%, speed scales up to +160%) the longer the run goes on.

### Wave Clock (Repeating Cycle Within Each Minute)

Within the run, a sub-clock cycles through three phases:
- **Wave (60s):** Normal full-intensity enemy spawning.
- **Elite (10s):** Elite-variant enemies appear; a chest reward drops near the player.
- **Lull (15s):** Enemy cap drops to 2; a supply drop (heal / frenzy / invulnerability) falls nearby.

---

## Player Mechanics

### Movement
WASD controls ship heading and thrust. Speed is governed by a base value (9 units/s) multiplied by any speed upgrades and the boost modifier.

### Auto-Attack
The ship automatically fires forward-facing cannonballs at the nearest enemy every 0.55s (upgradeable). Each shot deals 24 damage at speed 20. The `projectileCount` upgrade adds extra parallel shots; `sternChaser` adds a rear-firing shot; `pierce` lets shots pass through additional enemies.

### Cannon Ability (Manual, Space/Click)
Fires a 5-projectile salvo in a spread arc. Each ball deals 42 damage at speed 22. Default 5s cooldown. The salvo size and arc can be widened with `cannonSpread`.

### Boost (Manual, Shift/Right-Click)
A 0.22s burst of 3.1× speed, on a 4.5s cooldown. Used for repositioning and escape. Synergizes with several upgrade paths.

### Hit Pause
On impactful events (player taking damage, cannon salvo connecting), the simulation freezes for 60ms — a classic game-feel technique that makes hits land with weight.

---

## Enemy Roster

| Enemy | Role | Ranged Behavior |
|---|---|---|
| **Swarmer** | Rush fodder | Melee only — no ranged. Fast, cheap, appears en masse early. |
| **Corsair** | Balanced skirmisher | Fires every 2.35s; moderate speed/damage (speed 13, dmg 4). |
| **Bomber** | Fragile glass cannon | Fast projectiles (speed 21), fires every 1.65s, tiny hitbox. |
| **Brute** | Tank brawler | Slow heavy projectiles (speed 10, dmg 7), fires every 3.1s; high HP. |
| **Sniper** | Long-range threat | High-velocity precision shots (speed 28, dmg 9), fires every 5.5s. |
| **Shore Battery** | Stationary turret | Medium-speed shots (speed 15, dmg 8), fires every 4s. |
| **Boss** | Mega-boss (18+ min) | Fires a 16-way 360° spread every 4.5s with a 1.2s telegraph ring; 600+ HP; 50 touch damage. |

**Elites:** From Phase 2 onward, 20–40% of spawns become elite variants — gold-tinted, stronger versions of any regular type.

Enemy type distribution evolves: early runs see mostly swarmers and corsairs; late runs are a full mix of all types including snipers and brutes.

---

## Harvestables (Loot Nodes)

Drifting derelict objects litter the sea and can be destroyed by shooting them. They drop coins, gems, or HP pickups. Types by rarity/value tier:

- scrap_raft, abandoned_boat, floating_cargo *(common)*
- derelict_steamer, anchor_cache *(mid)*
- sunken_galleon, treasure_chest *(high value)*

---

## Pickups

| Pickup | Appearance | Effect |
|---|---|---|
| Coin | Gold spinning torus | Adds to XP/upgrade currency |
| Gem | Purple octahedron | Higher coin value |
| HP | Green glowing cube | Restores health |
| Chest | Brown box | Multi-coin burst (end of wave reward) |
| Supply Heal | Green cube (diagonal) | Instant heal |
| Supply Frenzy | Red cube | Doubles fire rate for a duration |
| Supply Invuln | Yellow cube | Temporary invulnerability |
| Instant Level-Up | Special | Immediately triggers an upgrade choice |

Coins are the primary progression driver — collecting them fills the XP threshold, which triggers the upgrade modal.

---

## Upgrade System (The Roguelite Core)

When the coin threshold is reached, the simulation pauses and three upgrade cards are presented. The player picks one, then combat resumes instantly. The threshold grows with each level, so later upgrades require progressively more coins.

### Rarity and Weighting
- **Common (10×):** base stats — fire rate, speed, cooldown, max HP
- **Uncommon (5×):** tactical modifiers — extra shots, pierce, coin magnet, armor, Stern Chaser
- **Rare (2×):** strong synergistic upgrades — Shrapnel Blast, Full Steam Ahead, Grapeshot, Explosive Rounds, Afterburner
- **Epic (1×):** powerful evolved upgrades, always gated behind prerequisites

The selection is weighted-random from a pool (e.g. a "common" option fills 10 slots vs. an "epic" filling 1). If any commons are available, at least one common is guaranteed in every offer.

### Evolution Upgrades (Epic-Tier)
Each evolution unlocks only when specific prerequisite upgrades are fully stacked. They are transformative rather than incremental:

| Evolution | What It Does | Requirements |
|---|---|---|
| **Death Blossom** | Fires in all 8 directions simultaneously | Max Fire Rate + Max Twin Cannons |
| **Ghost Tide** | Boost recharges almost instantly; +60% speed | Max Trade Winds + Second Wind |
| **Ironclad** | −50% all damage taken; ramming reflects damage | Max Iron Plating + Max Hull Reinforcement |
| **Tidal Sweep** | All on-screen pickups auto-collect every 8s | Max Salvage Net + Deep Dredge |
| **Hellfire Wake** | Boost trail detonates enemies it passes through | Max Explosive Rounds + Max Afterburner |

Evolutions are scored 500 points each, so chasing them is a viable high-score strategy. The total number unlocked is displayed on the game-over screen.

---

## Scoring Formula

```
score = floor(timeSurvived × 100 + enemiesKilled × 25 + collectedCoins × 2 + evolutionsUnlocked × 500)
```

The top 10 run records are persisted to `localStorage`, each storing: score, time survived, enemies killed, coins collected, evolutions unlocked, top upgrade, and timestamp.

---

## Visual Effects

- **Ship wake foam:** Up to 12 particles per ship (player + all enemies). Each particle spawns at the stern, fades opacity over ~0.5s, and grows slightly as it ages. Pre-allocated THREE.Mesh objects are recycled per-frame.
- **Hit sparks / muzzle flashes:** Point-burst VFX emitted on projectile impact and cannon fire.
- **Screen shake:** Accumulated from active `screenShake` visual effects; camera jitter scales with remaining duration.
- **Chromatic aberration pulse:** Full-screen post-FX triggered on every upgrade pick, decaying over 0.2s.
- **Screen flash:** Post-FX flash for damage or boss events.
- **Telegraph ring:** An expanding ring appears around the boss 1.2s before its 360° salvo fires.
- **Floating damage numbers:** Damage values rise from hit positions as text VFX.
- **Level-up ribbon / radial burst:** 2D UI effects overlaid on upgrade events.

Post-processing quality auto-degrades to "lite" mode if the rolling average FPS drops below a target, and can be forced via `?fx=lite` or `?fx=full` URL params.

---

## Audio

All audio is synthesized procedurally at runtime by `devSynth.ts` — no audio files are shipped or loaded. Sound events are queued in the `GameSnapshot` as `AudioEvent` structs and consumed by an `AudioManager` that maps SFX IDs to synthesis recipes. This keeps the bundle lean and avoids asset loading delays.

SFX: `cannon_fire`, `hit`, `pickup`, `upgrade_sting`, `boss_cue`, `damage_taken`, `ship_destroyed`, `harvestable_destroyed`  
Ambient beds: `sea_bed` (gameplay), `boss_bed` (boss encounter)

---

## Architecture Overview

### State Machine
The game has six phases: `loading → start → playing ↔ paused → upgrade → gameover`. The simulation only advances during `playing` and `upgrade` phases.

### Simulation Loop
`useGameState` (a React hook) owns the canonical `GameSnapshot`. Each animation frame, `tick(delta)` is called, which:
1. Advances the run clock and transitions biome/wave phases.
2. Updates player movement (from `inputRef`, not React state, to avoid re-renders).
3. Runs auto-attack and passive broadside timers.
4. Spawns and updates enemies, harvestables.
5. Moves all projectiles; resolves collisions (projectile-enemy, projectile-player, enemy-player, player-harvestable).
6. Processes pickup collection.
7. Applies damage mitigation (armor) and invulnerability.
8. Checks win/loss conditions; triggers upgrade modal if coin threshold crossed.
9. Deep-copies the state into a new snapshot and calls `setSnapshot` to trigger a React re-render.

### Render Pipeline
The `GameScene` R3F canvas reads from the latest `GameSnapshot` and renders:
- Animated water plane + scattered props (hash-grid, view-frustum culled)
- Player ship + enemy ships (GLTF or procedural geometry) with per-ship wake foam
- Projectiles (instanced geometry), pickups (procedural shapes), harvestable entities
- Post-FX pass (chromatic aberration, screen flash)
- 2D HUD overlay (HP bar, XP bar, cooldown pips, biome badge, boss health bar, flash messages) rendered in HTML on top of the canvas

### Input Handling
Keyboard events write directly into `inputRef.current` (bypassing React state). Movement is processed inside `tick`, so there is zero input latency from React's state update cycle.

---

## Current State (as of April 2026)

- Full playable MVP with all core systems operational.
- All 5 evolution upgrades defined; 13 upgrades fully implemented (rest are tracked but WIP effects).
- 4 biomes with distinct lighting, water, props, and atmosphere.
- Procedural audio (no asset loading required).
- Visual polish pass complete: animated water, ship wake foam, post-FX, biome lerp.
- Score leaderboard (top 10) in localStorage.
- No multiplayer, no metagame progression, no unlockables between runs — each run is self-contained.
