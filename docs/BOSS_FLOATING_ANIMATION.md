# Boss Floating Animation + Water Wave System

> **Status:** Specification only — not yet implemented  
> **Context:** Storm Leviathan (boss) is currently static. Lukas wants a reference spec for Cursor/medhy.ai, plus basic bob animation implemented as a starter.  
> **Engine:** React Three Fiber / @react-three/fiber, Three.js

---

## 1. Boss Floating Behavior

### 1.1 Y-Axis Bob (Primary)

- **Type:** Sine wave offset applied to the boss group's Y position
- **Amplitude:** `±0.15` world units
- **Period:** `~3.0 seconds` → angular frequency `ω = 2π / 3.0 ≈ 2.094 rad/s`
- **Formula:** `bobY = Math.sin(time * 2.094) * 0.15`
- **Layering:** Bob sits on top of the existing `position` prop — do NOT bake into base position, compose in useFrame so it stays relative

### 1.2 Roll (Z-Axis Rotation)

- **Amplitude:** `±2 degrees` → `±0.0349 radians`
- **Period:** `~4.0 seconds` → `ω = 2π / 4.0 = 1.571 rad/s`
- **Formula:** `rollZ = Math.sin(time * 1.571) * 0.0349`
- **Feel:** Ship rocking side-to-side like it's riding swells

### 1.3 Pitch (X-Axis Rotation)

- **Amplitude:** `±1 degree` → `±0.0175 radians`
- **Period:** `~5.0 seconds` → `ω = 2π / 5.0 = 1.257 rad/s`
- **Formula:** `pitchX = Math.sin(time * 1.257) * 0.0175`
- **Feel:** Slight bow/stern tilt, slower than roll — out of phase to avoid mechanical symmetry

### 1.4 Combined Formula (useFrame)

```ts
// In Enemy.tsx — inside EnemyShip component, applied ONLY when type === "boss"
useFrame((state) => {
  const t = state.clock.elapsedTime;
  // Y bob
  visualGroup.current.position.y = Math.sin(t * 2.094) * 0.15;
  // Roll (Z)
  visualGroup.current.rotation.z = Math.sin(t * 1.571) * 0.0349;
  // Pitch (X) — slightly offset phase so it's not lockstep with roll
  visualGroup.current.rotation.x = Math.sin(t * 1.257 + 0.6) * 0.0175;
});
```

### 1.5 Phase Offset Rationale

The pitch uses `t * 1.257 + 0.6` (0.6 rad offset ≈ 0.1 phase units) so roll and pitch don't peak simultaneously. This prevents the boss from looking like a mechanical apparatus — the offset creates the illusion of natural, asynchronous wave riding.

---

## 2. Water Wave System

### 2.1 Overview

The `WaterArena` component already has a wave system in `useFrame`. Currently it uses:

```ts
const waveA = Math.sin(bx * 0.11 + t * 1.65 * ws + bz * 0.07) * (0.13 * wh);
const waveB = Math.cos(bz * 0.09 - t * 1.25 * ws + bx * 0.04) * (0.10 * wh);
const chop = Math.sin(bx * 0.32 + t * 2.9 * ws) * Math.cos(bz * 0.28 - t * 2.5 * ws) * (0.03 * wh);
verts[i + 2] = (base[i + 2] ?? 0) + waveA + waveB + chop;
```

This is **good** — two overlapping sine waves + chop. The wave system does NOT need to be rebuilt; it already gives a natural look.

### 2.2 Extracting a Shared Wave Function

To make boss bob sync with the water surface, extract the wave Y into a pure function:

**New file: `src/scene/utils/waveHeight.ts`**

```ts
/**
 * Returns the world-space wave height at (worldX, worldZ, time).
 * This is the SAME function used in WaterArena — extracted so boss and
 * props can sample the same wave without duplicating the math.
 *
 * Wave composition:
 *   waveA: slow main swell  (period ~3.8s)
 *   waveB: counter-swell    (period ~5.0s)
 *   chop:  fast small chop   (period ~2.2s)
 */
export function getWaveHeight(worldX: number, worldZ: number, time: number): number {
  const ws = 1.0; // waveSpeed multiplier (match theme.waveSpeed from WaterArena)
  const wh = 1.0; // waveHeight multiplier (match theme.waveHeight)

  const waveA = Math.sin(worldX * 0.11 + time * 1.65 * ws + worldZ * 0.07) * (0.13 * wh);
  const waveB = Math.cos(worldZ * 0.09 - time * 1.25 * ws + worldX * 0.04) * (0.10 * wh);
  const chop =
    Math.sin(worldX * 0.32 + time * 2.9 * ws) *
    Math.cos(worldZ * 0.28 - time * 2.5 * ws) *
    (0.03 * wh);

  return waveA + waveB + chop;
}
```

### 2.3 Syncing Boss to Water

Once `getWaveHeight` exists, the boss bob can optionally sample the wave beneath it:

```ts
// Inside boss useFrame — sample wave at boss world position
const waveY = getWaveHeight(enemy.position.x, enemy.position.y, t);
visualGroup.current.position.y = waveY + Math.sin(t * 2.094) * 0.15; // wave offset + extra bob
```

This makes the boss appear to genuinely float on the water rather than bob independently.

### 2.4 Boss-Specific Wave Amplitude

The boss should slightly amplify local waves around it. Add a ripple function:

```ts
function getBossWaveDisturbance(worldX: number, worldZ: number, bossX: number, bossZ: number, time: number): number {
  const dx = worldX - bossX;
  const dz = worldZ - bossZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 8) return 0; // only within ~8 units of boss
  const falloff = 1 - dist / 8;
  return Math.sin(time * 2.5 + dist * 0.4) * 0.06 * falloff;
}
```

Call this in `WaterArena.tsx` when computing vertex heights, add the result on top of the base waves. This creates a "hull pushing water" effect around the boss.

---

## 3. Boss Damage States

Visual progression tied to HP percentage. Add a `damageState` prop to `EnemyShip` (derived from `enemy.currentHp / enemy.maxHp` in `GameScene.tsx`).

| HP Range | State Name | Visual Effects |
|---|---|---|
| `100% – 76%` | **Healthy** | Normal floating. Aura active. |
| `75% – 51%` | **Smoking** | Smoke particle intensity increases 2×. Subtle darkening of ship materials (tint toward `#2a1a12`). Occasional spark emission from mast top. |
| `50% – 26%` | **On Fire** | Orange glow point light at mast tip (`#ff6600`, intensity 1.5). Emissive orange patches on deck (`#ff4400`, emissiveIntensity 1.2). Smoke shifts from gray to black. Fire particles (small orange spheres) drift upward from 2–3 stack tops. |
| `25% – 0%` | **Sinking** | Ship Y position gradually sinks below waterline: `sinkOffset = (1 - hpRatio) * 0.8` (max 0.8 units below surface). Rotation increases: roll `±5°`, pitch `±3°` (more chaotic rocking). Aura flickers and dims. Surface bubble particles around hull base. |

### 3.1 Implementation Notes

- **Damage state calculation** happens in `GameScene.tsx` before passing to `EnemyShip`:
  ```ts
  const hpPercent = enemy.currentHp / enemy.maxHp;
  const damageState = hpPercent > 0.75 ? "healthy" : hpPercent > 0.50 ? "smoking" : hpPercent > 0.25 ? "on_fire" : "sinking";
  ```
- **Prop:** Add `damageState?: "healthy" | "smoking" | "on_fire" | "sinking"` to `EnemyShipProps`
- **Smoke component:** Existing `ShipSmoke` already has `intensity` prop — increase it for smoking/on_fire states
- **Fire particles:** New component `ShipFireParticles` (similar to `ShipSmoke` but orange upward drift, shorter lifetime `0.4s`, smaller particles `0.05–0.08` radius)
- **Sinking:** In `EnemyShip` useFrame, when `damageState === "sinking"`, lerp Y down and increase rotation amplitudes
- **Material tint:** Add `emissive`/`emissiveIntensity` overrides to the ship meshes when in `on_fire` state

---

## 4. File References & Changes Required

### 4.1 New Files

| File | Purpose |
|---|---|
| `src/scene/utils/waveHeight.ts` | Pure function: `getWaveHeight(x, z, time)` + `getBossWaveDisturbance(...)` |
| `src/scene/effects/ShipFireParticles.tsx` | Fire particle system for boss 50–25% HP state |
| `docs/BOSS_FLOATING_ANIMATION.md` | This document |

### 4.2 Files to Modify

| File | Changes |
|---|---|
| `src/scene/entities/Enemy.tsx` | 1. Add `damageState` prop to `EnemyShipProps`  
2. In `EnemyShip`, add `bossGroupRef` ref wrapping the ship  
3. Add `useFrame` for boss bob (Y + roll + pitch)  
4. Apply damage state visual changes (smoke intensity, fire particles, sink offset)  
5. Pass `damageState` down to `ShipSmoke` |
| `src/scene/GameScene.tsx` | 1. Compute `damageState` per enemy in the enemies map render  
2. Pass `damageState` to `<EnemyShip>` |
| `src/scene/arcade/WaterArena.tsx` | 1. Import `getBossWaveDisturbance` from `waveHeight.ts`  
2. In the wave `useFrame` loop, check if a boss entity exists near this area and add disturbance  
3. **OR:** Handle this via a separate `BossWaterRipple` component that renders expanding ring meshes around the boss |
| `src/scene/effects/ShipSmoke.tsx` | Add `color` and `particleSize` props so fire state can pass dark/black smoke parameters |

---

## 5. Technical Approach

### 5.1 Boss Float Implementation (Priority 1 — basic bob only)

In `src/scene/entities/Enemy.tsx`:

```tsx
// Inside EnemyShip function — add these refs
const bossFloatRef = useRef<THREE.Group>(null);
const smokeStacks: Array<[number, number, number]> = [[0, 2.2, 0]]; // already exists

// Add useFrame — only apply to boss type
useFrame((state) => {
  if (type !== "boss") return;
  const t = state.clock.elapsedTime;

  if (bossFloatRef.current) {
    // Y bob (primary)
    bossFloatRef.current.position.y = Math.sin(t * 2.094) * 0.15;
    // Roll (Z)
    bossFloatRef.current.rotation.z = Math.sin(t * 1.571) * 0.0349;
    // Pitch (X) — offset phase
    bossFloatRef.current.rotation.x = Math.sin(t * 1.257 + 0.6) * 0.0175;
  }
});

// Wrap the return value in a ref'd group when type === "boss"
// Otherwise render normally (no ref wrapper for non-boss)
```

### 5.2 Water Wave Extraction

Create `src/scene/utils/waveHeight.ts` with the pure function extracted from WaterArena. The `BobbingProp` component in WaterArena already has a simplified bob — once the full wave function is extracted, `BobbingProp` can be updated to use `getWaveHeight` for accurate water alignment.

### 5.3 Damage State Implementation (Priority 2 — after basic bob)

1. In `GameScene.tsx`, compute `damageState` per enemy:
   ```tsx
   const hpRatio = enemy.currentHp / enemy.maxHp;
   const damageState = hpRatio > 0.75 ? "healthy" : hpRatio > 0.50 ? "smoking" : hpRatio > 0.25 ? "on_fire" : "sinking";
   ```
2. Pass `damageState` to `<EnemyShip>`
3. In `EnemyShip`, apply visual changes per state

### 5.4 Performance Considerations

- **Boss bob:** Runs in `useFrame` (every frame) but only for boss type — minimal cost
- **Damage state particles:** Use `useMemo` for particle pool arrays; cap at 20 particles max
- **WaterArena wave loop:** Already runs per-vertex on CPU — boss disturbance is additive, no new pass needed
- **Frustum culling:** Boss should still respect culling; don't disable it

---

## 6. Animation Parameters Summary

| Animation | Axis | Amplitude | Period | Formula |
|---|---|---|---|---|
| Boss Y Bob | Y (position) | ±0.15 units | 3.0s | `sin(t * 2.094) * 0.15` |
| Boss Roll | Z (rotation) | ±2° (0.035 rad) | 4.0s | `sin(t * 1.571) * 0.0349` |
| Boss Pitch | X (rotation) | ±1° (0.018 rad) | 5.0s | `sin(t * 1.257 + 0.6) * 0.0175` |
| Water Wave A | Y (vertex) | 0.13 * wh | ~3.8s | `sin(bx * 0.11 + t * 1.65 * ws + bz * 0.07)` |
| Water Wave B | Y (vertex) | 0.10 * wh | ~5.0s | `cos(bz * 0.09 - t * 1.25 * ws + bx * 0.04)` |
| Water Chop | Y (vertex) | 0.03 * wh | ~2.2s | `sin(bx * 0.32 + t * 2.9) * cos(bz * 0.28 - t * 2.5)` |
| Boss Sinking | Y (position) | up to −0.8 units | — | `(1 - hpRatio) * 0.8` lerp |
| Boss Damage Roll | Z (rotation) | ±5° (0.087 rad) | — | `sin(t * 2.5) * 0.087` (sinking state only) |

---

## 7. Open Questions / TODOs for Implementation

- [ ] Confirm: does `enemy.maxHp` exist on the snapshot type, or just `enemy.currentHp`? Need to verify `EnemyState` type.
- [ ] Should boss bob use `getWaveHeight` for ground-truth water alignment, or keep independent sine for a slightly stylized float?
- [ ] Should sinking state smoothly lerp or use a single step? (Lerp recommended for smoothness)
- [ ] Fire particles — should they be GPU particles (shader-based) or CPU-managed like `ShipSmoke`? (CPU is fine for <30 particles)
- [ ] Should the boss aura intensity reduce as HP drops? (Yes — aura scale/opacity tied to damage state)