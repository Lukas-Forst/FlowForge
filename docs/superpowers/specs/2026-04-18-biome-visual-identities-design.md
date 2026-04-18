# Biome Visual Identities — Design

**Date:** 2026-04-18
**Status:** Draft for review
**Scope:** Visual-only pass; gameplay mechanics unchanged.

## 1. Goal

Replace today's washed-out, uniform "whitish" ocean with three visually distinct biomes — **Open Sea**, **Island Chain**, **Deep Waters** — one of which is randomly selected at the start of every run and stays fixed for the duration of that run.

The current ocean reads as a single pale wash because every overlay layer pushes toward white (additive blends, white noise speckles, white-edged radial gradient) under near-white ambient + directional lighting. See `change_map.md` Section 1 and the analysis in the previous brainstorm turn for the full diagnosis.

This pass fixes the wash *and* introduces visual variety in one go.

## 2. Decisions locked

These were settled during brainstorming and should not be re-litigated:

| Question | Decision |
|---|---|
| What does this pass change? | Visuals only — no gameplay, no enemy variety, no new mechanics. |
| Which biomes? | **Open Sea**, **Island Chain**, **Deep Waters** (new — replaces the `fog_bank` slot). |
| Do we keep `fog_bank`? | No. `pickRunBiome` rolls only the three above. The `fog_bank` branch in `pickEnemyType` (`enemySpawner.ts:26`) is removed at the same time; `fog_bank` literal is dropped from `BiomeType`. |
| Does biome still affect enemy spawn mix? | **No.** `pickEnemyType` is simplified to ignore biome entirely — every run uses the time-progressed default mix that already exists in `enemySpawner.ts:30–49`. The half-built per-biome enemy filter (lines 19–29) is removed. Rationale: keeps this pass truly visual-only; per-biome rosters can return as a future gameplay spec. (See §10.) |
| Does water itself change per biome? | **Yes** — color, roughness, and shimmer overlay tuning all differ per biome. |
| Are biomes spatially mixed within a run? | **No.** Each run is one biome, full map. No transitions, no chunk-based blending. |
| How is the biome chosen? | **Random uniform** at run start. |
| What's in scope this pass? | Approach 2 ("Full Ambient") — palette + props + lighting + sky/fog per biome. |
| What's deferred? | Approach 3 — vertex-animated waves, hero horizon geometry, particle systems, time-of-day variants. Recorded in §8. |

## 3. Per-biome catalogue

All numbers are **starting values for tuning**. Adjust by eye; commit final values back into this doc once stable.

### 3.1 Open Sea (the baseline)
The "default" ocean — open horizon, midday sun, the player's home water.

| Aspect | Value |
|---|---|
| Water base color | `#1f5f7a` (deep teal — much darker than today's `#5cb0cf`) |
| Water roughness | 0.55 |
| Water clearcoat | 0.10 |
| Shimmer overlay color | `#2d7a92` at opacity 0.06 (NormalBlending — not additive) |
| Bump scale | 0.04 |
| Background color | `#6fa8c8` |
| Ambient light | `#a8c8d8` intensity 0.45 |
| Directional light | `#fff4d8` intensity 1.0, position [18, 26, 14] |
| Rim light | `#b8d8e8` intensity 0.25 |
| Distance fog | `#7aa8c0` near 80, far 280 |
| Signature props | Navigation buoys (red `#d24230` cap, white pole), barrel debris, crate flotsam. Medium density. |

### 3.2 Island Chain (warm tropical shallows)
Bright, calm, warm. Player feels they're in a postcard — but enemy density still pressures movement.

| Aspect | Value |
|---|---|
| Water base color | `#2aa3b8` (turquoise — lighter, more saturated) |
| Water roughness | 0.42 (calmer / more reflective) |
| Water clearcoat | 0.18 |
| Shimmer overlay color | `#7fd0db` at opacity 0.05 |
| Bump scale | 0.025 (calmer surface) |
| Background color | `#9fd8e8` |
| Ambient light | `#d8e8d4` intensity 0.55 |
| Directional light | `#fff0c4` intensity 1.15, position [18, 26, 14] (warm tropical sun) |
| Rim light | `#c8e0b8` intensity 0.35 |
| Distance fog | `#a8d8e0` near 90, far 300 |
| Signature props | Flat rock + sand-ring islands (3-6 per ~150u cluster), with 1–3 palm-shape props per island; small floating bamboo rafts. |

### 3.3 Deep Waters (cold, ominous, vast)
Dark navy, dim cool light, sparse but dramatic props. Visibility is *not* reduced (we said no fog mechanics) — but the *mood* is heavier.

| Aspect | Value |
|---|---|
| Water base color | `#0e2c44` (deep navy) |
| Water roughness | 0.65 (rougher, less reflective) |
| Water clearcoat | 0.22 (sharper specular highlights against dark base) |
| Shimmer overlay color | `#3a6a90` at opacity 0.07 (slightly stronger than Open Sea, bluer) |
| Bump scale | 0.06 (bigger surface variation) |
| Background color | `#3a4a5e` (overcast slate) |
| Ambient light | `#6080a0` intensity 0.35 |
| Directional light | `#c8d8e8` intensity 0.85, position [12, 22, 18] (lower, cooler) |
| Rim light | `#a0b8d0` intensity 0.40 (stronger rim → silhouettes pop) |
| Distance fog | `#1a3048` near 60, far 240 (horizon closes in slightly) |
| Signature props | Kelp fronds rising from below the surface (dark green), tall jagged rock spires breaking the surface, rising bubble streams (small white dots over dark water). Sparse — each prop is an event. |

## 4. Architecture

### 4.1 Run-scoped biome selection
- New: `pickRunBiome(): BiomeType` in `src/game/systems/biome.ts` — uniform random over `["open_sea", "island_chain", "deep_waters"]`.
- `BiomeType` becomes `"open_sea" | "island_chain" | "deep_waters"` (drop `fog_bank`).
- `GameSnapshot` (in `src/game/types.ts`) gains `runBiome: BiomeType`.
- `useGameState` initializes `runBiome` via `pickRunBiome()` at run start; re-rolls on restart.
- Chunk-based `biomeAt(x, y)` is removed. Dead helper `isIslandAt(x, y)` (defined in `biome.ts:30` but never imported) is removed at the same time.
- `enemySpawner.ts` callers of `biomeAt(x, y)` (lines 102, 129) are removed entirely along with the per-biome filter branch in `pickEnemyType` (lines 19–29). `pickEnemyType` becomes a pure function of `elapsedTimeSec`. See §10 for rationale.

### 4.2 Theme descriptors
- New file `src/scene/biomeThemes.ts` exports a `BIOME_THEMES: Record<BiomeType, BiomeTheme>` map.
- `BiomeTheme` shape (defined in `src/game/types.ts` so both scene and game layers can read it):

  ```ts
  export interface BiomeTheme {
    waterColor: string;
    waterRoughness: number;
    waterClearcoat: number;
    bumpScale: number;
    shimmerColor: string;
    shimmerOpacity: number;
    backgroundColor: string;
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; position: [number, number, number] };
    rim: { color: string; intensity: number };
    fog: { color: string; near: number; far: number };
  }
  ```

### 4.3 Scene wiring
- `GameScene.tsx` reads `snapshot.runBiome`, looks up the theme, and:
  - Sets `<color attach="background" args={[theme.backgroundColor]} />`
  - Sets `<fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />`
  - Drives the `<ambientLight />` / `<directionalLight />` / rim `<directionalLight />` from the theme
  - Passes `theme` down to `WaterArena`
- `WaterArena.tsx`:
  - **Removes** the four-overlay stack (radial shade, micro noise, axis flow, white-tinted bump). The radial-shade-toward-white and the additive axis flow are the two biggest wash sources.
  - **Keeps** one tile mesh per cell using `meshPhysicalMaterial` with `color`/`roughness`/`clearcoat`/`bumpScale` from the theme.
  - **Adds** one slim shimmer overlay plane: a low-opacity, biome-tinted (not white) noise texture scrolled by player position + time. NormalBlending, not Additive.
  - Removes `<FogLayer>` (the dim plane above the player) — distance fog handles atmosphere now.

### 4.4 Per-biome props
`ScatteredSeaProps` keeps its deterministic cell loop (the `hash2(i, j)` grid that scatters stable world-anchored props around the player) — what changes is the **dispatch inside the loop**: instead of `biomeAt(wx, wz)` determining the prop set per cell, the run's `runBiome` determines the prop set for every cell.

New prop components live alongside `WaterArena.tsx`:
- `src/scene/arcade/props/NavBuoyProp.tsx` — Open Sea
- `src/scene/arcade/props/BarrelDebrisProp.tsx` — Open Sea
- `src/scene/arcade/props/IslandProp.tsx` — Island Chain (flat rock disk + sand ring + 1–3 palm placeholders)
- `src/scene/arcade/props/PalmProp.tsx` — Island Chain helper
- `src/scene/arcade/props/KelpProp.tsx` — Deep Waters
- `src/scene/arcade/props/RockSpireProp.tsx` — Deep Waters
- `src/scene/arcade/props/BubbleStreamProp.tsx` — Deep Waters

Density is biome-tuned: Island Chain spawns props in clusters; Deep Waters spaces them sparsely; Open Sea uses today's density. Placement still uses the deterministic `hash2(i, j)` grid so props are stable as the player moves.

### 4.5 HUD
- `src/ui/Hud.tsx` adds a small "**Region:** Open Sea / Island Chain / Deep Waters" label in a corner so the player knows what they got. Static for the whole run. Tiny — does not dominate the UI.

## 5. File-level change list

| File | Change |
|---|---|
| `src/game/systems/biome.ts` | Add `pickRunBiome()`. Add `"deep_waters"` to `BiomeType`. Remove `biomeAt(x,y)` (or stub it to return run biome) and `isIslandAt(x,y)`. |
| `src/game/types.ts` | Add `runBiome: BiomeType` to `GameSnapshot`. Add `BiomeTheme` interface. |
| `src/game/useGameState.ts` | Initialize `runBiome` via `pickRunBiome()` at run start; re-roll on restart. |
| `src/scene/biomeThemes.ts` | NEW. Export `BIOME_THEMES: Record<BiomeType, BiomeTheme>` with the three catalogues from §3. |
| `src/scene/GameScene.tsx` | Look up theme; drive background, fog, ambient, directional, rim from it; pass to `WaterArena`. |
| `src/scene/arcade/WaterArena.tsx` | Accept `theme` prop. Strip the 4-overlay stack down to 1 themed shimmer overlay. Remove `FogLayer`. Make `ScatteredSeaProps` biome-aware. |
| `src/scene/arcade/props/*.tsx` | NEW — seven prop components (§4.4). |
| `src/ui/Hud.tsx` | Add "Region:" label. |
| `src/game/systems/enemySpawner.ts` | Strip the per-biome filter in `pickEnemyType` (`:19–29`) entirely; signature drops the `biome` parameter. Remove the two `biomeAt(x, y)` calls at `:102` and `:129`. The function becomes purely time-based. |
| `src/game/systems/enemySpawner.test.ts` | Update fixtures to the new `BiomeType` union and the new `pickEnemyType` signature. |

## 6. Tests

- Add `src/game/systems/biome.test.ts`:
  - `pickRunBiome` returns one of the three new biome ids.
  - Over 10k samples, distribution is roughly uniform (within ±5%).
- Add `src/scene/biomeThemes.test.ts`:
  - Each theme has all required fields populated.
  - Color strings parse as valid hex.
- **No** snapshot/visual regression tests. Visual quality is judged by eye on each biome.
- Manual verification checklist (run before merging Phase 1):
  - [ ] Restart 10× and confirm all three biomes appear.
  - [ ] Player ship reads cleanly under each biome's lighting.
  - [ ] Enemy ships read cleanly under each biome's lighting (especially Deep Waters' dim setup — adjust enemy emissive if needed).
  - [ ] No biome looks "whitish" anymore.
  - [ ] HUD `Region:` label updates per run.
  - [ ] FPS does not regress on the prop-heaviest biome (Island Chain clusters).

## 7. Non-goals (explicit)

- **No** spatial biome transitions or per-chunk biome variation within a run.
- **No** player biome selection on the start screen.
- **No** fog_bank visual rework (it's removed from rotation).
- **No** new enemy types or per-biome enemy filtering.
- **No** new gameplay mechanics tied to biome (no shore batteries, no fog vision reduction, no kelp slowdown).
- **No** custom GLSL shaders. `meshPhysicalMaterial` only.
- **No** vertex-displaced waves (deferred to Phase 2).
- **No** particles beyond the existing smoke + bubble-stream prop.
- **No** audio changes per biome.
- **No** time-of-day variation within a biome.

## 8. Phase 2 — recorded for later

Do not implement now. Recorded so the next session has the plan when Phase 1 ships.

1. **Vertex-animated waves** — segment water plane (`64×64`); displace Y by sum of 2–3 sines; per-biome amplitude/frequency. Replaces the current bump-only fakery.
2. **Signature hero geometry per biome:**
   - Open Sea: distant sailing-ship silhouette anchored at world spawn point.
   - Island Chain: one large hero island visible at run start, slightly off-center.
   - Deep Waters: row of distant tall rock spires on the horizon.
3. **Particles:**
   - Open Sea: drifting embers / pollen flecks at sunset variant.
   - Island Chain: dust motes under the sun cones.
   - Deep Waters: rising bubble streams (richer than the Phase 1 prop).
4. **Time-of-day variants per biome** — Open Sea midday vs sunset vs storm; Island Chain noon vs golden hour. Adds variety without adding biomes.
5. **Per-biome ship wake tinting** — wake foam tinted to match biome shimmer color.

Phase 2 gets its own spec when Phase 1 is in `main` and you have a felt sense of which biome needs more depth.

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Three lighting setups → player ship looks bad in one of them | Test ship visibility in all three before merging. Adjust the ambient floor first; do not change ship materials. |
| Deep Waters too dim to read enemies | Bump enemy emissive intensity in Deep Waters only (cheap conditional in Enemy.tsx). Decide by eye after first build. |
| Removing the overlay stack exposes the flat water plane (no waves) | Expected — that's the bridge to Phase 2. The biome lighting + props compensate enough that flatness reads as "calm" rather than "broken." |
| Distance fog hides too many enemies in Deep Waters | If an issue, raise fog `near` to 80 and `far` to 280 for Deep Waters. Tune by eye. |
| `runBiome` not threaded through every consumer (enemy spawner especially) | Grep for `biomeAt` before merging; update every callsite. |

## 10. Resolved — biome ↔ enemy-spawn coupling

**Decision (2026-04-18): Option C — drop the per-biome enemy filter.**

`pickEnemyType` becomes purely time-based; every run uses the existing time-progressed mix at `enemySpawner.ts:30–49`. The half-built per-biome filter at lines 19–29 is removed along with `fog_bank` from `BiomeType`.

Rationale: the per-chunk filter was built for a spatially-mixed biome model that this spec abandons. Keeping it would either (a) require a parallel "visual-biome vs spawn-biome" concept (Option A — confusing), or (b) silently lock each run to a fixed enemy roster (Option B — a gameplay change disguised as a visual fix). Option C honours the "visual only" scope. Per-biome enemy rosters can return as a future *gameplay* spec, built on top of the run-fixed `runBiome` model this spec establishes.

Considered and rejected:

- **Option A — Decouple.** Keep per-chunk `biomeAt(x, y)` alive only for `pickEnemyType`. Rejected: introduces two same-named biome concepts (visual vs spawn), confusing to reason about.
- **Option B — Unify and keep filter.** Use `runBiome` for both visuals and enemy roster. Rejected: changes gameplay (Island Chain runs lose brute/sniper; Open Sea loses shore_battery) without a gameplay-design pass.

## 11. Out of scope but worth knowing

- The previous brainstorm pass (`change_map.md`) had biome work as P0 item 3.4 with **gameplay** hooks (shore batteries in Island Chain, fog vision in Fog Bank). That whole gameplay-coupled biome plan is **superseded** by this visual-only pass. When gameplay biome work returns, it should build on the run-fixed biome model established here, not re-introduce per-chunk biome assignment.
- The MVP-state memory note (2026-04-10) said rocks were removed pending a "proper design pass." This spec is *not* that pass — these props are cheap stylized stand-ins, not a full rock/island art pipeline.
