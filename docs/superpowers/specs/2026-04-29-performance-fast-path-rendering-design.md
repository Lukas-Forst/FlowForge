# Performance: Fast-Path Rendering Decoupled from React State

**Date:** 2026-04-29  
**Status:** Approved  
**Problem:** Game drops to ~20 FPS once 3–5 enemies are on screen, unplayable with sniper or multi-shot enemies present.

---

## Root Cause

Every game tick, `syncState()` → `copySnapshot()` → `setSnapshot()` deep-copies the entire game state (all enemy, projectile, and VFX arrays) and triggers a full React reconciliation of every entity component. With 5 enemies and 20 projectiles on screen, this means React is reconciling 25+ components and allocating 10+ new arrays every frame at 60 Hz. The simulation itself is fast; the React bridge is the bottleneck.

---

## Approach: Decouple Fast-Path Entities from React State

Split game state into two tiers:

**Tier 1 — Simulation refs** (unchanged): `stateRef.current` holds all simulation state including `enemies[]`, `projectiles[]`, `visualEffects[]`. The simulation reads/writes these as-is.

**Tier 2 — React UI snapshot** (trimmed): `setSnapshot` is called with a small `UiSnapshot` containing only scalar/UI fields. No entity arrays.

Fast-path rendering reads `stateRef.current` directly from a R3F `useFrame` callback, mutating Three.js object refs in place. Zero React re-renders per frame for simulation entities.

---

## Component Design

### 1. `UiSnapshot` type (`useGameState.ts`)

Replace the current `GameSnapshot` (which includes full entity arrays) with a trimmed `UiSnapshot` interface. `copySnapshot()` becomes cheap — copies ~10 scalars and small objects, no array slicing. The 32 `syncState()` call sites stay unchanged; they just become fast.

`UiSnapshot` fields:
- `phase`, `loading`
- `player` (hp, maxHp, baseSpeed, position, facing — position/facing kept for player ship rendering and camera)
- `upgrades` (full object — needed by HUD, upgrade screen, PlayerShip visual)
- `cooldowns` (full object — needed by HUD)
- `stats` (full object — needed by HUD, GameOver, KillStreakHud)
- `message`, `runBiome`, `runClock`, `megaBoss`
- `pendingUpgradeOptions`, `pendingUpgradeContext`
- `vibePortal`
- `bossState` — derived field: `{ hp, maxHp, type } | null` extracted from `stateRef.current.enemies` at sync time, replaces raw enemy scan in HUD
- `eliteCount` — derived scalar: count of `isElite` enemies at sync time, replaces `snapshot.enemies.reduce` in HUD
- `minimapEnemies` — derived array: `{ x, y, type }[]` (position + type only, no full EnemyState), capped at 40 entries (nearest 40 by squared distance), extracted at sync time for minimap rendering

Removed from snapshot: `enemies[]`, `projectiles[]`, `visualEffects[]`, `audioEvents[]`, `delayedAoEs[]`, `mines[]`, `oilSlicks[]`, `harvestables[]`, `pickups[]`, `postFxPulse`.

### 2. Sync boundary semantics

`syncState()` is called at the end of each `tick()` invocation. The rule: **scene rendering and UI always reflect the same simulation tick N**. `stateRef.current` and `UiSnapshot` are both written in the same synchronous call stack before the browser paints — no async gap between them.

Pause / gameover guard: when `phase` is `"paused"`, `"upgrade"`, or `"gameover"`, the RAF loop skips calling `tick()` entirely (existing behavior). The pool `useFrame` callbacks must check `phase` and skip position writes when paused — pool objects remain frozen at their last positions. This prevents stateRef from advancing while React UI shows a pause/gameover overlay.

### 3. Enemy rendering — object pool (`GameScene.tsx`)

Create a fixed-size pool of 64 `<group>` refs at scene mount. A `useFrame` callback iterates `stateRef.current.enemies`:

- Active enemy `i < enemies.length`: set `pool[i].position`, `pool[i].rotation.y`, `pool[i].visible = true`
- Unused slots: `pool[i].visible = false`

Each pool slot renders the same ship mesh geometry as today. HP bars and boss UI remain as React components driven by `UiSnapshot.bossState` and `UiSnapshot.eliteCount` — no per-frame reconciliation.

**Overflow policy (enemies):** Pool cap is 64. If `enemies.length > 64`, the excess enemies are invisible. Prioritization: partial top-k selection by squared distance (no full sort) — iterate enemies once, maintain a 64-slot min-heap or simple linear pass to keep the 64 nearest. This avoids introducing an O(n log n) sort on the hot path. A dev-mode counter `window.__dbg.droppedEnemies` increments when overflow occurs. In practice, max spawned enemies per wave is well below 64.

### 4. Projectile rendering — `InstancedMesh` (`CombatVfx.tsx`)

One `InstancedMesh` per projectile shape replaces all individual `<mesh>` components:

| Group | InstancedMesh instances |
|---|---|
| `playerCannon`, `enemyCannon` (sphere) | 256 |
| `torpedo` (elongated capsule) | 32 |
| `sniperBeam` (thin cylinder) | 16 |

In `useFrame`, active projectiles set instance matrices; inactive instances are scaled to `(0,0,0)`. One draw call per group.

**Overflow policy (projectiles):** If `projectiles.length > instance count`, excess projectiles are not rendered. Prioritization: player projectiles first, then enemy projectiles sorted by distance. `window.__dbg.droppedProjectiles` counter in dev mode.

### 5. VFX rendering — pool per effect type (`CombatVfx.tsx`)

**Opaque/additive effects — `InstancedMesh` safe:**

| Effect kind | Slots | Rendering |
|---|---|---|
| `muzzleFlash` | 32 | `InstancedMesh`, additive blend |
| `broadsideCharge` | 32 | `InstancedMesh`, additive blend |

**Transparent/sorted effects — individual pooled meshes:**

| Effect kind | Slots | Rendering | Reason |
|---|---|---|---|
| `explosion` | 16 | Pooled `<mesh>` refs | Depth-sorted transparency; instancing causes z-fighting |
| `ringBarrage` | 8 | Pooled `<mesh>` refs | Expanding ring needs per-instance scale animation |
| `shockwave` | 8 | Pooled `<mesh>` refs | Same — radial scale animation |

`useFrame` drives opacity and scale directly on material/object refs using the `remaining` timer from simulation state.

**Overflow policy (VFX):** Excess effects are silently dropped (VFX are cosmetic). Prioritization: LRU — the oldest active slot is reused. `window.__dbg.droppedVfx` counter in dev mode.

`postFxPulse` (screen flash on damage): read from `stateRef.current.postFxPulse` in `useFrame`, drives a fullscreen quad opacity — no React state needed.

### 6. Damage numbers — DOM overlay

Replace `drei Text` with absolute-positioned `<span>` elements in a `<div>` overlay outside the R3F canvas.

**Projection:** Each active damage number's world position is projected to screen space once per frame using Three.js `Vector3.project(camera)`. Result is converted to CSS `left`/`top` with DPR applied: `left = (ndc.x + 1) / 2 * canvas.clientWidth`, `top = (-ndc.y + 1) / 2 * canvas.clientHeight`. DPR is not applied to CSS pixels — `canvas.clientWidth` already accounts for it.

**Resize handling:** The overlay `<div>` is `position: absolute; inset: 0; pointer-events: none` over the canvas. It resizes automatically with the canvas container. No explicit resize listener needed.

**Offscreen culling:** Skip rendering numbers whose projected NDC coordinates fall outside `[-1.1, 1.1]` on either axis.

**Z-order:** Overlay sits above the canvas via `z-index`. Pointer events are disabled (`pointer-events: none`).

**Max node fallback:** Cap at 20 simultaneous damage numbers. If exceeded, oldest numbers are evicted. In practice peak is ~8 (broadside volley hits).

**React is appropriate here** since damage numbers are sparse (<20), short-lived (~0.5s), and not created every frame — only on hit events which are infrequent relative to frame rate.

---

## Compatibility / Migration Matrix

Every current `snapshot.*` consumer and its new data source after this change:

| Consumer | Field(s) | Old source | New source |
|---|---|---|---|
| `App.tsx` | `phase`, `loading`, `vibePortal`, `upgrades`, `cooldowns`, `pendingUpgradeOptions/Context` | `snapshot` | `UiSnapshot` (unchanged) |
| `App.tsx` | `player.position/facing/hp` (multiplayer sync) | `snapshot.player` | `UiSnapshot.player` (unchanged) |
| `GameScene.tsx` | `player.position/facing` (camera, PlayerShip, wake foam) | `snapshot.player` | `UiSnapshot.player` (unchanged — player is slow enough for React) |
| `GameScene.tsx` | `upgrades.level`, `cooldowns.invulnRemaining` | `snapshot` | `UiSnapshot` (unchanged) |
| `GameScene.tsx` | `vibePortal` | `snapshot.vibePortal` | `UiSnapshot.vibePortal` (unchanged) |
| `GameScene.tsx` | `runBiome`, `runClock` | `snapshot` | `UiSnapshot` (unchanged) |
| `GameScene.tsx` | `enemies[]` (enemy ship components) | `snapshot.enemies` | **`stateRef` via pool + `useFrame`** |
| `GameScene.tsx` | `projectiles[]` | `snapshot.projectiles` | **`stateRef` via `InstancedMesh` + `useFrame`** |
| `GameScene.tsx` | `visualEffects[]` | `snapshot.visualEffects` | **`stateRef` via pool + `useFrame`** |
| `GameScene.tsx` | `postFxPulse` | `snapshot.postFxPulse` | **`stateRef` via `useFrame`** |
| `GameScene.tsx` | `delayedAoEs[]`, `mines[]`, `oilSlicks[]` | `snapshot.*` | **`stateRef` via pool + `useFrame`** |
| `Hud.tsx` | `enemies.find(boss)` (boss HP bar) | `snapshot.enemies` | **`UiSnapshot.bossState`** (derived at sync time) |
| `Hud.tsx` | `enemies.reduce(eliteCount)` | `snapshot.enemies` | **`UiSnapshot.eliteCount`** (derived at sync time) |
| `Hud.tsx` | `enemies[]` (minimap) | `snapshot.enemies` | **`UiSnapshot.minimapEnemies`** (position+type only, derived at sync time) |
| `Hud.tsx` | `player`, `upgrades`, `cooldowns`, `stats`, `runClock`, `message`, `vibePortal`, `megaBoss`, `runBiome` | `snapshot` | `UiSnapshot` (unchanged) |
| `GameOverScreen.tsx` | `stats`, `upgrades`, `runBiome` | `snapshot` | `UiSnapshot` (unchanged) |
| `PauseScreen.tsx` | `stats` | `snapshot` | `UiSnapshot` (unchanged) |
| `KillStreakHud.tsx` | `stats.killStreak*` | `snapshot.stats` | `UiSnapshot.stats` (unchanged) |

No existing UI consumer reads raw entity arrays except `Hud.tsx` for boss HP, elite count, and minimap — all three are replaced with derived scalar/lightweight fields in `UiSnapshot`.

---

## Files Changed

| File | Change |
|---|---|
| `src/game/useGameState.ts` | Introduce `UiSnapshot` type; trim `copySnapshot` to scalar + derived fields; expose `stateRef` from hook return |
| `src/scene/arcade/CombatVfx.tsx` | Replace projectile/VFX component maps with `InstancedMesh` + pool + `useFrame` |
| `src/scene/GameScene.tsx` | Replace enemy/aoe/mine/slick component maps with pool + `useFrame`; read `stateRef` for fast-path entities |
| `src/App.tsx` | Accept `stateRef` from `useGameState`; pass to scene components |
| `src/game/types.ts` | Add `UiSnapshot` interface; deprecate raw entity arrays from `GameSnapshot` |

**Simulation math/behavior unchanged.** Only snapshot bridging and data plumbing change in `useGameState.ts` — the tick logic, enemy AI, collision, and all other simulation files are untouched.

---

## Test Plan

**Existing simulation tests:** Stay green — simulation is untouched.

**New rendering layer acceptance criteria:**

| Check | Method |
|---|---|
| Entity count parity | After each tick, `pool.visibleCount === stateRef.current.enemies.length` (assert in dev mode) |
| Projectile count parity | `activeInstanceCount === Math.min(projectiles.length, maxInstances)` — asserted in dev mode after each `useFrame` write |
| No-NaN transforms | `useFrame` asserts `!isNaN(position.x)` before writing; logs warning and skips on violation |
| Pause freeze | When `phase === "paused"`, pool positions must not change between frames — verified by snapshot comparison in test harness |
| Gameover freeze | Same as pause |
| UiSnapshot consistency | `bossState.hp` matches `stateRef.current.enemies.find(boss).hp` at the frame it was derived — checked in dev mode after each `syncState()` |
| Overflow counter | `window.__dbg.droppedEnemies/Projectiles/Vfx` remain 0 in normal play (wave up to wave 5); counters reset to 0 on `startRun`/`restartRun` for clean per-run profiling |
| DPR resize | Resizing the window does not shift damage number positions — manual test |

---

## Rollout Plan

**Feature flag:** `localStorage.getItem("ff_fast_render") === "true"` controls which rendering path is active. Default `false` (current renderer). Setting the flag switches to the new pool/instanced path.

**Fallback:** If the flag is absent or `"false"`, the old render path stays active. Because `UiSnapshot` drops raw entity arrays, the old path cannot read `snapshot.enemies` — instead it reads `stateRef.current.enemies` directly (same data, different source). This means the fallback path is also migrated off `snapshot` entity arrays; the only difference between the two paths is whether rendering uses pools/instancing or individual React components. `stateRef` is exposed from `useGameState` for both paths.

**Graduation:** Once the new path is validated at 60 FPS across wave 1–10, remove the flag and delete the old render path. No backwards-compat shim needed after deletion.

---

## What Stays the Same

- All game simulation logic — no behavioral changes
- Player ship rendering — still driven by `UiSnapshot.player` via React
- Enemy HP bars, boss health UI, score/wave UI — React components driven by derived UiSnapshot fields
- Audio event draining — unchanged
- Upgrade/shop UI — unchanged

---

## Expected Outcome

- Zero React reconciliation per frame for enemies, projectiles, VFX, mines, slicks, AoEs
- Projectiles: N draw calls → 1–3 draw calls (one `InstancedMesh` per shape type)
- `copySnapshot` allocation cost: O(entity count) → O(1)
- Target: stable 60 FPS in heavy combat (sniper + wave enemies + active broadside)
