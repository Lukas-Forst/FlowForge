# Map / World Rendering — Shipwracker vs FlowForge

Comparison of Shipwracker's ocean and map approach against FlowForge's current setup, with specific change proposals.

---

## What Shipwracker Does Differently

### 1. Orthographic isometric camera

**Shipwracker:** `OrthographicCamera` at offset `[24, 24, 24]` from the player — a strict isometric angle (equal X/Y/Z offset). View size is fixed at 26 world units, scaled for aspect ratio. No perspective distortion: objects the same distance from the camera appear at the same scale regardless of position.

**FlowForge now:** `PerspectiveCamera` at `[0, 24, 23]` (height 24, 23u behind player), fov 52. Objects near the camera appear larger than objects in the distance. The player ship sits slightly below the viewing angle, and the far end of the arena recedes visually.

**Effect:** Shipwracker's iso view reads like a top-down tactical map. Enemy positions are equally legible anywhere on screen. In FlowForge's perspective view, the rear of the screen (behind the player) is foreshortened and harder to read — enemies sneak up from below the visible zone.

---

### 2. Vertex-displaced wave geometry

**Shipwracker:** `PlaneGeometry(260, 260, 56, 56)` — a single subdivided mesh. Every frame, `updateOcean()` displaces Y on every vertex using three layered sines:

```
waveA = sin(x * 0.11 + t * 1.65 + z * 0.07) * 0.13    // long-period swells
waveB = cos(z * 0.09 - t * 1.25 + x * 0.04) * 0.10    // cross-swells
chop  = sin(x * 0.32 + t * 2.9) * cos(z * 0.28 - t * 2.5) * 0.03  // high-freq chop
```

Vertex normals are recomputed every 0.12s so lighting updates on the moving surface. The `waveHeight` and `waveSpeed` scalars are part of each style preset — biomes can have calm vs stormy water without changing the mesh.

**FlowForge now:** Flat `PlaneGeometry(280, 280, 1, 1)` tiles — 1×1 subdivision. No vertex displacement. Wave suggestion comes only from the bump map (a screen-space illusion, not actual geometry).

**Effect:** Shipwracker's ocean has actual depth movement visible at the isometric angle. FlowForge's ocean is flat and relies entirely on lighting to look wet.

---

### 3. Emissive component on the water material

**Shipwracker:** `MeshStandardMaterial` with both `color` and `emissive`/`emissiveIntensity`:

```
color: "#5daedf", emissive: "#0a2a46", emissiveIntensity: 0.12
```

The emissive fills in the shadowed parts of the wave geometry, preventing them from going pure black and making the water read as self-lit from below.

**FlowForge now:** `meshPhysicalMaterial` with no emissive. Water darkens toward black in shadow — which in the current flat setup is fine, but once waves are added the troughs would go very dark.

**Impact if waves are added:** Without emissive, wave troughs will be near-black against the lit crests. Adding `emissive` to the biome themes prevents this.

---

### 4. OutlinePass post-processing

**Shipwracker:** `EffectComposer` with `OutlinePass`:
- `edgeStrength: 6`, `edgeThickness: 1.7`
- `visibleEdgeColor: "#000000"`, `hiddenEdgeColor: "#111111"`

Every object gets a crisp black outline. Ships, scrap pickups, and projectiles all read clearly against any water color.

**FlowForge now:** No post-processing. Ship and enemy readability depends entirely on material colors vs water color. Deep Waters biome already causes readability complaints in the tuning checklist.

**Effect:** Outlines would solve the enemy readability problem in Deep Waters and make the whole game feel more like a polished arcade game rather than a 3D prototype.

---

### 5. Foam / wake particles

**Shipwracker:** `spawnWaterFoam()` creates actual `SphereGeometry` meshes at the ship's stern. Each particle has:
- A drift velocity (backward + sideways + upward)
- A shrink factor (scale decay per frame)
- Lifetime fade via opacity
- Two foam layers: primary splash and a larger accent blob at higher speeds

The result is a convincing V-shaped wake that visually conveys speed.

**FlowForge now:** `ShipWake` in `GameScene.tsx` renders static circle meshes at fixed offset positions behind the ship. They're positioned correctly but don't move, shrink, or drift — they're decals, not particles.

---

### 6. Camera offset direction

**Shipwracker:** Camera offset `[24, 24, 24]` — isometric, equal in all three axes. Player is always centered on screen. Looking at `ship.position` (not offset).

**FlowForge now:** Desired position `[target.x, 24, target.z + 23]` — camera is only shifted in Z (behind), not in X. At angle this becomes a slightly behind-and-above view, not isometric. The player ship sits in the lower-center of the screen rather than true center.

In Shipwracker the player can always see roughly the same distance in all four directions. In FlowForge the player can see much further in front than behind.

---

## Proposed Changes (from easiest to most impactful)

### Change A — Add emissive to `BiomeTheme`

**Effort:** Very low (1–2 hours). Pure visual win now, required foundation for waves.

Add `waterEmissive: string` and `waterEmissiveIntensity: number` to `BiomeTheme` in `types.ts` and update `biomeThemes.ts`. Change `WaterArena`'s `meshPhysicalMaterial` to include `emissive` and `emissiveIntensity` from the theme. Suggested values:

| Biome | emissive | intensity |
|---|---|---|
| open_sea | `#08223a` | 0.10 |
| island_chain | `#0d3040` | 0.08 |
| deep_waters | `#060d18` | 0.18 |

Deep Waters gets the strongest emissive to fill wave troughs when waves arrive.

---

### Change B — Switch to isometric orthographic camera

**Effort:** Low (2–4 hours). Big visual shift.

Replace the `PerspectiveCamera` (fov 52) in the `<Canvas>` with an `OrthographicCamera`. Mirror Shipwracker's approach: camera positioned at `[target.x + 24, 24, target.z + 24]`, looking at `[target.x, 0, target.z]`. Use a view size of ~28 world units (adjust for aspect ratio).

Key changes:
- In `GameScene.tsx`, change `<Canvas camera={{ ... }}>` to use `orthographic` prop: `<Canvas orthographic camera={{ position: [24, 24, 24], zoom: 28, near: 0.1, far: 500 }}>`.
- In `CameraFollow`, change desired position to `target + [24, 24, 24]` instead of `[target.x, 24, target.z + 23]`.
- Remove `fov: 52` — not used in orthographic mode.

Side effects: perspective depth cues disappear. Props and enemies all appear at the same visual scale regardless of distance. This is the correct look for an arcade game; it is a tradeoff, not a bug.

---

### Change C — Vertex-displaced waves (Phase 2 spec item 1)

**Effort:** Medium (4–6 hours). Biggest single visual upgrade.

This is already planned in the spec §8 Phase 2, item 1. The Shipwracker implementation is the reference.

Replace the `PlaneGeometry(280, 280, 1, 1)` tiles with a single `PlaneGeometry(900, 900, 64, 64)` (or `72, 72` for a bit more resolution) centered on the player. In a `useFrame`, iterate all vertices and apply:

```ts
const waveA = Math.sin(bx * 0.11 + t * 1.65 * waveSpeed + bz * 0.07) * (0.13 * waveHeight);
const waveB = Math.cos(bz * 0.09 - t * 1.25 * waveSpeed + bx * 0.04) * (0.10 * waveHeight);
const chop  = Math.sin(bx * 0.32 + t * 2.9 * waveSpeed)
            * Math.cos(bz * 0.28 - t * 2.5 * waveSpeed)
            * (0.03 * waveHeight);
vertices[i + 2] = baseY + waveA + waveB + chop;  // plane is rotated -90°X, so Y is axis index 2
```

Add `waveHeight: number` and `waveSpeed: number` to `BiomeTheme`:

| Biome | waveHeight | waveSpeed |
|---|---|---|
| open_sea | 1.0 | 1.0 |
| island_chain | 0.75 | 0.85 |
| deep_waters | 1.4 | 1.2 |

Throttle `geometry.computeVertexNormals()` to every 0.12s (same as Shipwracker) to avoid the CPU cost every frame.

**Important:** This change requires Change A (emissive) to look good — without it, wave troughs go black.

---

### Change D — OutlinePass post-processing

**Effort:** Medium (3–5 hours). Solves ship readability across biomes.

Add `EffectComposer`, `RenderPass`, and `OutlinePass` from `three/examples/jsm/postprocessing/`. react-three-fiber supports this via `@react-three/postprocessing` or manual setup in an `<Effects>` component.

Simplest approach using `@react-three/postprocessing`:

```tsx
import { EffectComposer, Outline } from "@react-three/postprocessing";
// In GameScene JSX:
<EffectComposer>
  <Outline selection={[...enemyRefs, playerRef]} edgeStrength={6} color="black" />
</EffectComposer>
```

Requires collecting refs to all ship meshes. This is the most invasive change architecturally (need ref forwarding through `PlayerShip` and `EnemyShip`).

---

### Change E — Dynamic foam particles for wake

**Effort:** Medium (3–4 hours). Polish, not critical path.

Replace the static `ShipWake` decals with the Shipwracker pattern: emit `SphereGeometry` particles at the stern on a timer when speed > threshold, with drift + shrink + fade. The existing `ShipWake` component in `GameScene.tsx` could be replaced with a `ShipWakeFoam` that manages a small pool of 10–15 particle meshes reused via object pooling.

---

## Recommended Order

1. **Change A** (emissive on water) — fast, no risk, needed for waves
2. **Change B** (orthographic camera) — try it, see if the game feels better; reversible
3. **Change C** (vertex waves) — Phase 2 spec item, do after B is confirmed
4. **Change D** (outlines) — only if Deep Waters readability is confirmed as a real player problem
5. **Change E** (foam particles) — nice to have, do last
