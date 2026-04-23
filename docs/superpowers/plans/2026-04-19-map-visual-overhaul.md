# Map Visual Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the ocean visuals and camera up to Shipwracker's standard: isometric orthographic camera, vertex-displaced waves, emissive water depth, and dynamic wake foam particles.

**Architecture:** Four independent layers stacked in order — (A) emissive on water material, (B) orthographic camera replacing perspective, (C) vertex-displaced wave geometry replacing flat tiles, (E) foam particle pool replacing static circle decals. Each layer is self-contained and committed separately so any one can be reverted without breaking the others.

**Tech Stack:** TypeScript, react-three-fiber 9, three.js 0.183, vitest 4. No new npm packages required.

**Source spec:** [`docs/map.md`](../../map.md)

---

## Conventions

- Run unit tests: `npm test` (vitest run)
- Typecheck + build: `npm run build`
- Visual verification: `npm run dev`, open printed URL, click Play
- Commit messages: `feat(map): task N — short summary`

---

## File Map

| File | Change |
|---|---|
| `src/game/types.ts` | Add `waterEmissive`, `waterEmissiveIntensity`, `waveHeight`, `waveSpeed` to `BiomeTheme` |
| `src/scene/biomeThemes.ts` | Add per-biome values for all four new fields |
| `src/scene/biomeThemes.test.ts` | Update validation tests to cover new fields |
| `src/scene/arcade/WaterArena.tsx` | Apply emissive on material; replace 3×3 flat tile stack with single vertex-displaced mesh; pre-alloc foam pool replacing static ShipWake |
| `src/scene/GameScene.tsx` | Switch Canvas to orthographic; update CameraFollow offset; replace `<ShipWake>` with `<ShipWakeFoam>` |

---

## Task 1: Add emissive + wave params to `BiomeTheme`; apply emissive in WaterArena

**Why this task:** Emissive prevents wave troughs from going black once vertex displacement is added. It also gives the water depth without relying entirely on directional light. The `waveHeight`/`waveSpeed` fields are added now so Task 3 can read them from the theme without another types edit.

**Files:**
- Modify: `src/game/types.ts:169-181`
- Modify: `src/scene/biomeThemes.ts`
- Modify: `src/scene/biomeThemes.test.ts`
- Modify: `src/scene/arcade/WaterArena.tsx:203-211`

- [ ] **Step 1.1: Update the failing test in `src/scene/biomeThemes.test.ts`.**

Replace the test file entirely. The `"uses sensible numeric ranges"` test gets four new assertions:

```ts
import { describe, expect, it } from "vitest";
import { BIOME_THEMES } from "./biomeThemes";
import type { BiomeType } from "../game/types";

const ALL_BIOMES: BiomeType[] = ["open_sea", "island_chain", "deep_waters"];
const HEX = /^#[0-9a-fA-F]{6}$/;

describe("BIOME_THEMES", () => {
  it("has an entry for every biome", () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_THEMES[biome]).toBeDefined();
    }
  });

  it("uses #RRGGBB hex strings for all colour fields", () => {
    for (const biome of ALL_BIOMES) {
      const t = BIOME_THEMES[biome];
      expect(t.waterColor).toMatch(HEX);
      expect(t.waterEmissive).toMatch(HEX);
      expect(t.shimmerColor).toMatch(HEX);
      expect(t.backgroundColor).toMatch(HEX);
      expect(t.ambient.color).toMatch(HEX);
      expect(t.directional.color).toMatch(HEX);
      expect(t.rim.color).toMatch(HEX);
      expect(t.fog.color).toMatch(HEX);
    }
  });

  it("uses sensible numeric ranges", () => {
    for (const biome of ALL_BIOMES) {
      const t = BIOME_THEMES[biome];
      expect(t.waterRoughness).toBeGreaterThanOrEqual(0);
      expect(t.waterRoughness).toBeLessThanOrEqual(1);
      expect(t.waterClearcoat).toBeGreaterThanOrEqual(0);
      expect(t.waterClearcoat).toBeLessThanOrEqual(1);
      expect(t.bumpScale).toBeGreaterThanOrEqual(0);
      expect(t.shimmerOpacity).toBeGreaterThanOrEqual(0);
      expect(t.shimmerOpacity).toBeLessThanOrEqual(1);
      expect(t.waterEmissiveIntensity).toBeGreaterThanOrEqual(0);
      expect(t.waterEmissiveIntensity).toBeLessThanOrEqual(1);
      expect(t.waveHeight).toBeGreaterThan(0);
      expect(t.waveSpeed).toBeGreaterThan(0);
      expect(t.ambient.intensity).toBeGreaterThanOrEqual(0);
      expect(t.directional.intensity).toBeGreaterThanOrEqual(0);
      expect(t.rim.intensity).toBeGreaterThanOrEqual(0);
      expect(t.fog.near).toBeGreaterThan(0);
      expect(t.fog.far).toBeGreaterThan(t.fog.near);
    }
  });
});
```

- [ ] **Step 1.2: Run the test to verify it fails.**

Run: `npm test -- biomeThemes.test`
Expected: FAIL — `waterEmissive` is not a property of `BiomeTheme`.

- [ ] **Step 1.3: Add four fields to `BiomeTheme` in `src/game/types.ts`.**

Replace the `BiomeTheme` interface (lines 169–181):

```ts
export interface BiomeTheme {
  waterColor: string;
  waterRoughness: number;
  waterClearcoat: number;
  bumpScale: number;
  waterEmissive: string;
  waterEmissiveIntensity: number;
  waveHeight: number;
  waveSpeed: number;
  shimmerColor: string;
  shimmerOpacity: number;
  backgroundColor: string;
  ambient: { color: string; intensity: number };
  directional: { color: string; intensity: number; position: [number, number, number] };
  rim: { color: string; intensity: number };
  fog: { color: string; near: number; far: number };
}
```

- [ ] **Step 1.4: Add per-biome values in `src/scene/biomeThemes.ts`.**

Replace the file entirely:

```ts
import type { BiomeTheme, BiomeType } from "../game/types";

export const BIOME_THEMES: Record<BiomeType, BiomeTheme> = {
  open_sea: {
    waterColor: "#1f5f7a",
    waterRoughness: 0.55,
    waterClearcoat: 0.10,
    bumpScale: 0.04,
    waterEmissive: "#08223a",
    waterEmissiveIntensity: 0.10,
    waveHeight: 1.0,
    waveSpeed: 1.0,
    shimmerColor: "#2d7a92",
    shimmerOpacity: 0.06,
    backgroundColor: "#6fa8c8",
    ambient: { color: "#a8c8d8", intensity: 0.45 },
    directional: { color: "#fff4d8", intensity: 1.0, position: [18, 26, 14] },
    rim: { color: "#b8d8e8", intensity: 0.25 },
    fog: { color: "#7aa8c0", near: 80, far: 280 },
  },
  island_chain: {
    waterColor: "#2aa3b8",
    waterRoughness: 0.42,
    waterClearcoat: 0.18,
    bumpScale: 0.025,
    waterEmissive: "#0d3040",
    waterEmissiveIntensity: 0.08,
    waveHeight: 0.75,
    waveSpeed: 0.85,
    shimmerColor: "#7fd0db",
    shimmerOpacity: 0.05,
    backgroundColor: "#9fd8e8",
    ambient: { color: "#d8e8d4", intensity: 0.55 },
    directional: { color: "#fff0c4", intensity: 1.15, position: [18, 26, 14] },
    rim: { color: "#c8e0b8", intensity: 0.35 },
    fog: { color: "#a8d8e0", near: 90, far: 300 },
  },
  deep_waters: {
    waterColor: "#0e2c44",
    waterRoughness: 0.65,
    waterClearcoat: 0.22,
    bumpScale: 0.06,
    waterEmissive: "#060d18",
    waterEmissiveIntensity: 0.18,
    waveHeight: 1.4,
    waveSpeed: 1.2,
    shimmerColor: "#3a6a90",
    shimmerOpacity: 0.07,
    backgroundColor: "#3a4a5e",
    ambient: { color: "#6080a0", intensity: 0.85 },
    directional: { color: "#c8d8e8", intensity: 1.4, position: [12, 22, 18] },
    rim: { color: "#a0b8d0", intensity: 0.80 },
    fog: { color: "#1a3048", near: 100, far: 300 },
  },
};
```

- [ ] **Step 1.5: Apply emissive in `src/scene/arcade/WaterArena.tsx`.**

In the `meshPhysicalMaterial` for the water base tile (around line 203), add `emissive` and `emissiveIntensity`:

```tsx
<meshPhysicalMaterial
  color={theme.waterColor}
  roughness={theme.waterRoughness}
  metalness={0.02}
  bumpMap={bumpMap}
  bumpScale={theme.bumpScale}
  clearcoat={theme.waterClearcoat}
  clearcoatRoughness={0.58}
  emissive={theme.waterEmissive}
  emissiveIntensity={theme.waterEmissiveIntensity}
/>
```

- [ ] **Step 1.6: Run tests to verify they pass.**

Run: `npm test -- biomeThemes.test`
Expected: PASS.

- [ ] **Step 1.7: Run full test suite + typecheck.**

Run: `npm test` → PASS.
Run: `npm run build` → PASS.

- [ ] **Step 1.8: Smoke test.**

Run: `npm run dev`, click Play. Expected: water color unchanged, but if you roll Deep Waters it should look slightly brighter/deeper even without any directional light hitting it. (Subtle at this point — waves in Task 3 will make it obvious.)

- [ ] **Step 1.9: Commit.**

```bash
git add src/game/types.ts src/scene/biomeThemes.ts src/scene/biomeThemes.test.ts src/scene/arcade/WaterArena.tsx
git commit -m "feat(map): task 1 — emissive + waveHeight/waveSpeed on BiomeTheme; apply emissive in WaterArena"
```

---

## Task 2: Switch to isometric orthographic camera

**Why this task:** The perspective camera creates foreshortening — enemies behind the player are visually compressed and harder to read. Shipwracker's equal-offset isometric orthographic camera makes all positions equally legible and gives the game its distinctive aerial look. This is a one-commit visual swap; if it looks wrong, `git revert` undoes it cleanly.

**Files:**
- Modify: `src/scene/GameScene.tsx:13-93`

No unit tests — pure visual change. Build + smoke test are the validation.

- [ ] **Step 2.1: Replace the camera constants and Canvas camera in `src/scene/GameScene.tsx`.**

Delete lines 13–14:
```ts
const CAMERA_HEIGHT = 24;
const CAMERA_DISTANCE = 23;
```

Replace with:
```ts
const ISO_OFFSET = 24;
```

Change the `<Canvas>` opening tag (line 158) from:
```tsx
<Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 52 }}>
```
to:
```tsx
<Canvas shadows dpr={[1, 1.8]} orthographic camera={{ position: [ISO_OFFSET, ISO_OFFSET, ISO_OFFSET], zoom: 22, near: 0.1, far: 600 }}>
```

(`zoom: 22` gives roughly the same world coverage as the previous fov: 52 perspective at height 24. Adjust up to 26 if the view feels too wide, or down to 18 if too narrow.)

- [ ] **Step 2.2: Update `CameraFollow` to use the isometric offset.**

Replace the body of `CameraFollow` (lines 64–93):

```tsx
function CameraFollow({ snapshot }: { snapshot: GameSnapshot }): null {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    let shakeOffset = 0;
    for (const effect of snapshot.visualEffects) {
      if (effect.kind === "screenShake") {
        shakeOffset += Math.max(0, effect.remaining) * 1.5;
      }
    }

    target.set(snapshot.player.position.x, 0, snapshot.player.position.y);
    desired.set(
      target.x + ISO_OFFSET,
      ISO_OFFSET,
      target.z + ISO_OFFSET,
    );

    const alpha = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, alpha);

    if (shakeOffset > 0) {
      camera.position.x += (Math.random() - 0.5) * shakeOffset;
      camera.position.z += (Math.random() - 0.5) * shakeOffset;
    }

    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}
```

- [ ] **Step 2.3: Run typecheck.**

Run: `npm run build` → PASS.

- [ ] **Step 2.4: Smoke test the camera.**

Run: `npm run dev`. Click Play. Expected:
- The ocean now fills the screen at a true isometric angle (45° from corner, not behind-above).
- Player is visible roughly in the center. All four directions should show roughly equal depth.
- Ship and enemies should be clearly readable.
- If the zoom level is wrong (too zoomed in or out), adjust `zoom: 22` in the Canvas tag: higher = more zoomed in, lower = more zoomed out.

- [ ] **Step 2.5: Commit.**

```bash
git add src/scene/GameScene.tsx
git commit -m "feat(map): task 2 — orthographic isometric camera (zoom 22, offset [24,24,24])"
```

---

## Task 3: Vertex-displaced waves — replace flat tile stack with single animated mesh

**Why this task:** The 3×3 flat tile stack is the biggest reason the ocean looks "proto." A single subdivided mesh with three-layer sine displacement produces the visible ocean movement. The shimmer overlay plane is removed (it would clip through wave crests) — the bump map + emissive from Task 1 carry the visual detail.

**Files:**
- Modify: `src/scene/arcade/WaterArena.tsx` (full rewrite of the water rendering section)

No unit tests — pure geometry/visual change. Build + smoke test validate.

- [ ] **Step 3.1: Replace the water rendering in `src/scene/arcade/WaterArena.tsx`.**

Replace the entire `WaterArena` function and the `createShimmerNoiseTexture` helper with the new implementation below. Keep `createCalmBumpTexture`, `hash2`, `BobbingProp`, and `ScatteredSeaProps` unchanged.

Delete `createShimmerNoiseTexture` (lines 52–75) entirely.

Replace `WaterArena` (lines 176–230) with:

```tsx
export function WaterArena({ playerX, playerZ, theme, biome }: WaterArenaProps): ReactElement {
  const bumpMap = useMemo(() => createCalmBumpTexture(), []);
  const meshRef = useRef<THREE.Mesh>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const normalTimer = useRef(0);
  const playerRef = useRef({ x: playerX, z: playerZ });
  playerRef.current = { x: playerX, z: playerZ };

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;

    // Copy base positions on first frame.
    if (!basePositions.current) {
      basePositions.current = new Float32Array(pos.array as Float32Array);
    }

    const verts = pos.array as Float32Array;
    const base = basePositions.current;
    const t = _state.clock.elapsedTime;
    const ws = theme.waveSpeed;
    const wh = theme.waveHeight;
    const px = playerRef.current.x;
    const pz = playerRef.current.z;

    for (let i = 0; i < verts.length; i += 3) {
      // base[i]   = local X → world X
      // base[i+1] = local Y → world -Z (after plane rotation), used as wave Z input
      const bx = (base[i] ?? 0) + px;
      const bz = (base[i + 1] ?? 0) + pz;

      const waveA = Math.sin(bx * 0.11 + t * 1.65 * ws + bz * 0.07) * (0.13 * wh);
      const waveB = Math.cos(bz * 0.09 - t * 1.25 * ws + bx * 0.04) * (0.10 * wh);
      const chop =
        Math.sin(bx * 0.32 + t * 2.9 * ws) *
        Math.cos(bz * 0.28 - t * 2.5 * ws) *
        (0.03 * wh);

      // local Z = world Y (up/down) after rotation={[-Math.PI/2, 0, 0]}
      verts[i + 2] = (base[i + 2] ?? 0) + waveA + waveB + chop;
    }

    pos.needsUpdate = true;

    // Throttle normal recompute — expensive to run every frame.
    normalTimer.current += delta;
    if (normalTimer.current >= 0.12) {
      normalTimer.current = 0;
      geo.computeVertexNormals();
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[playerX, -0.02, playerZ]}
        receiveShadow
      >
        <planeGeometry args={[900, 900, 64, 64]} />
        <meshPhysicalMaterial
          color={theme.waterColor}
          roughness={theme.waterRoughness}
          metalness={0.02}
          bumpMap={bumpMap}
          bumpScale={theme.bumpScale}
          clearcoat={theme.waterClearcoat}
          clearcoatRoughness={0.58}
          emissive={theme.waterEmissive}
          emissiveIntensity={theme.waterEmissiveIntensity}
        />
      </mesh>
      <ScatteredSeaProps centerX={playerX} centerZ={playerZ} biome={biome} />
    </group>
  );
}
```

- [ ] **Step 3.2: Run typecheck.**

Run: `npm run build` → PASS.

If there is a TypeScript error about `pos.array` not being assignable to `Float32Array`, change:
```ts
const verts = pos.array as Float32Array;
const base = basePositions.current;
```
to:
```ts
const verts = pos.array as unknown as Float32Array;
const base = basePositions.current as Float32Array;
```

- [ ] **Step 3.3: Run full test suite.**

Run: `npm test` → PASS.

- [ ] **Step 3.4: Smoke test waves.**

Run: `npm run dev`. Click Play. Expected:
- The ocean is visibly moving — a gentle rolling swell, not flat.
- No tiling seams (the old 9-tile boundaries should be gone).
- Wave amplitude differs between biomes (Island Chain is calm, Deep Waters is choppier).
- FPS should stay above 50 — 65×65 = 4,225 vertices, ~12k float ops per frame in JS is acceptable.

If the waves are invisible (too subtle): increase `waveHeight` values in `biomeThemes.ts`. Start with Open Sea → 1.5.
If FPS drops below 40: reduce subdivision from 64 to 48 (`planeGeometry args={[900, 900, 48, 48]}`).

- [ ] **Step 3.5: Commit.**

```bash
git add src/scene/arcade/WaterArena.tsx
git commit -m "feat(map): task 3 — vertex-displaced wave geometry; single 900x900 mesh replaces 3x3 tile stack"
```

---

## Task 4: Dynamic foam wake particles — replace static `ShipWake` circles

**Why this task:** The current `ShipWake` renders 5 static circle decals at fixed offsets behind the ship. They don't drift, shrink, or expand — they look painted on. A pre-allocated pool of circle meshes updated imperatively each frame produces the V-wake effect where foam expands and fades as it trails behind the ship.

**Files:**
- Modify: `src/scene/GameScene.tsx` (replace `ShipWake` function and usages)

No unit tests — visual change. Smoke test validates.

- [ ] **Step 4.1: Replace `ShipWake` in `src/scene/GameScene.tsx` with `ShipWakeFoam`.**

Delete the entire `ShipWake` function (lines 24–62) and replace with:

```tsx
const MAX_FOAM = 12;

type FoamParticle = { x: number; z: number; age: number; maxAge: number; size: number };

function ShipWakeFoam({
  x,
  z,
  facing,
  sizeScale = 1,
}: {
  x: number;
  z: number;
  facing: number;
  sizeScale?: number;
}): ReactElement {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particles = useRef<FoamParticle[]>([]);
  const emitTimer = useRef(0);
  const xRef = useRef(x);
  const zRef = useRef(z);
  const facingRef = useRef(facing);
  xRef.current = x;
  zRef.current = z;
  facingRef.current = facing;

  useFrame((_state, delta) => {
    emitTimer.current += delta;

    if (emitTimer.current > 0.055) {
      emitTimer.current = 0;
      const f = facingRef.current;
      const bx = -Math.sin(f);
      const bz = -Math.cos(f);
      const sx = Math.cos(f);
      const sz = -Math.sin(f);
      for (const side of [-1, 1] as const) {
        if (particles.current.length < MAX_FOAM) {
          particles.current.push({
            x: xRef.current + bx * 0.75 * sizeScale + sx * side * 0.45 * sizeScale,
            z: zRef.current + bz * 0.75 * sizeScale + sz * side * 0.45 * sizeScale,
            age: 0,
            maxAge: 0.42 + Math.random() * 0.18,
            size: (0.22 + Math.random() * 0.16) * sizeScale,
          });
        }
      }
    }

    // Age and cull dead particles.
    for (let i = particles.current.length - 1; i >= 0; i -= 1) {
      const p = particles.current[i];
      if (!p) continue;
      p.age += delta;
      if (p.age > p.maxAge) {
        particles.current.splice(i, 1);
      }
    }

    // Update pre-allocated meshes.
    for (let i = 0; i < MAX_FOAM; i += 1) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const p = particles.current[i];
      if (!p) {
        mesh.scale.setScalar(0);
        continue;
      }
      const t = p.age / p.maxAge;
      const s = p.size * (0.5 + t * 1.2);
      mesh.position.set(p.x, 0.045, p.z);
      mesh.scale.set(s, s, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - t) * 0.20);
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_FOAM }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.045, 0]}
          scale={[0, 0, 1]}
        >
          <circleGeometry args={[1, 10]} />
          <meshBasicMaterial color="#f0fbff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 4.2: Replace `<ShipWake>` usages in `GameScene`.**

There are two usages in `GameScene`. Replace both.

**Player wake** (around line 189):

Before:
```tsx
<ShipWake x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} size={1.05} intensity={1.15} />
```

After:
```tsx
<ShipWakeFoam x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} sizeScale={1.05} />
```

**Enemy wakes** (inside the `snapshot.enemies.map` block, around line 195–200):

Before:
```tsx
<ShipWake
  x={enemy.position.x}
  z={enemy.position.y}
  facing={enemy.facing}
  size={enemy.type === "brute" ? 1.05 : enemy.type === "bomber" ? 0.86 : 0.78}
  intensity={enemy.type === "brute" ? 0.92 : 0.72}
/>
```

After:
```tsx
<ShipWakeFoam
  x={enemy.position.x}
  z={enemy.position.y}
  facing={enemy.facing}
  sizeScale={enemy.type === "brute" ? 1.05 : enemy.type === "bomber" ? 0.86 : 0.78}
/>
```

- [ ] **Step 4.3: Run typecheck.**

Run: `npm run build` → PASS.

If there's a TypeScript error about `mat.opacity` (read-only on some material types), cast the material:
```ts
const mat = mesh.material as THREE.MeshBasicMaterial;
```
(already in the code above, but double-check the line is there.)

- [ ] **Step 4.4: Run full test suite.**

Run: `npm test` → PASS.

- [ ] **Step 4.5: Smoke test wake foam.**

Run: `npm run dev`. Click Play and move the ship around. Expected:
- A V-shaped spreading wake of white foam circles appears behind the ship.
- Each circle expands as it ages and fades to transparent.
- Enemy ships also leave wakes.
- No leftover `ShipWake` static circles visible.

If the foam is too faint: raise `0.20` in `mat.opacity = Math.max(0, (1 - t) * 0.20)` to `0.28`.
If the foam is too dense: raise the emit interval from `0.055` to `0.08`.

- [ ] **Step 4.6: Commit.**

```bash
git add src/scene/GameScene.tsx
git commit -m "feat(map): task 4 — dynamic foam wake particles replace static ShipWake circles"
```

---

## Done

All four changes are independent commits. Revert any one with `git revert <sha>` without affecting the others.

**Not in this plan (separate spec needed):**
- OutlinePass (`@react-three/postprocessing` install + ref forwarding through all ship meshes)
