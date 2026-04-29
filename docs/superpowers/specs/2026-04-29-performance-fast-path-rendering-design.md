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

**Tier 2 — React UI snapshot** (trimmed): `setSnapshot` is called with a small `UiSnapshot` containing only scalar/UI fields — `hp`, `maxHp`, `score`, `phase`, `upgrades`, `wave`, `boss`, `runHistory`, `message`. No entity arrays.

Fast-path rendering reads `stateRef.current` directly from a R3F `useFrame` callback, mutating Three.js object refs in place. Zero React re-renders per frame for simulation entities.

---

## Component Design

### 1. `UiSnapshot` type (`useGameState.ts`)

Replace the current `GameSnapshot` with a trimmed interface containing only UI-relevant fields. Remove `enemies`, `projectiles`, `visualEffects`, `audioEvents` from the snapshot type entirely.

`copySnapshot()` becomes cheap — copies ~10 scalars and small objects, no array slicing. The 32 `syncState()` call sites stay unchanged; they just become fast.

### 2. Enemy rendering — object pool (`GameScene.tsx`)

Create a fixed-size pool of 64 `<group>` refs at scene mount. A `useFrame` callback iterates `stateRef.current.enemies`:

- For each active enemy: set `pool[i].position`, `pool[i].rotation.y`, `pool[i].visible = true`
- For unused slots: `pool[i].visible = false`

Each pool slot renders the same ship mesh geometry as today. HP bars and boss UI remain React components since they update slowly and don't reconcile every frame.

### 3. Projectile rendering — `InstancedMesh` (`CombatVfx.tsx`)

One `InstancedMesh` with 256 instances replaces all individual projectile `<mesh>` components. In `useFrame`, active projectiles set instance matrices; inactive instances are scaled to zero. One GPU draw call regardless of projectile count.

Distinct projectile shapes (torpedoes, sniper beams) each get their own small `InstancedMesh`.

### 4. VFX rendering — pool per effect type (`CombatVfx.tsx`)

Fixed pools per visual effect kind:
- `broadsideCharge`: 32 slots
- `muzzleFlash`: 32 slots
- `explosion`: 16 slots

`useFrame` reads `stateRef.current.visualEffects`, positions active effects, drives opacity/scale directly on material refs using the `remaining` timer from simulation state.

### 5. Damage numbers — DOM overlay

Replace `drei Text` (expensive SDF font rendering) with absolute-positioned `<span>` elements in a `<div>` overlay outside the R3F canvas. World positions are projected to screen space once per frame. Since damage numbers are few (<10 at once) and short-lived (~0.5s), React is appropriate here.

---

## Files Changed

| File | Change |
|---|---|
| `src/game/useGameState.ts` | Introduce `UiSnapshot` type; trim `copySnapshot` to scalar fields only; remove entity arrays from snapshot |
| `src/scene/arcade/CombatVfx.tsx` | Replace projectile/VFX component maps with `InstancedMesh` + pool + `useFrame` |
| `src/scene/GameScene.tsx` | Replace enemy component map with 64-slot object pool + `useFrame` |
| `src/App.tsx` | Pass `stateRef` down to scene components that need it for `useFrame` reads |

**Untouched:** All simulation files (`collision.ts`, `passiveBroadside.ts`, `useGameState.ts` tick logic, enemy AI, etc.)

---

## What Stays the Same

- All game simulation logic — no behavioral changes
- Enemy HP bars, boss health UI, score/wave UI — remain React components
- Audio event draining — unchanged
- Upgrade/shop UI — unchanged
- All existing tests — simulation is untouched, tests stay green

---

## Expected Outcome

- Zero React reconciliation per frame for enemies, projectiles, VFX
- Projectiles: N draw calls → 1–3 draw calls (one `InstancedMesh` per shape type)
- `copySnapshot` allocation cost: O(entity count) → O(1)
- Target: stable 60 FPS in heavy combat (sniper + wave enemies + active broadside)
