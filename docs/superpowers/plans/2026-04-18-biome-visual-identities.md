# Biome Visual Identities — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's washed-out white ocean with three distinct visual biomes (Open Sea, Island Chain, Deep Waters), one randomly chosen per run.

**Architecture:** Run-scoped biome (rolled at start, fixed for the run) drives a single `BiomeTheme` lookup that controls water material, scene lighting, background, distance fog, and which prop set scatters around the player. The previous chunk-based `biomeAt(x, y)` and the half-built per-biome enemy filter are removed.

**Tech Stack:** TypeScript 6, React 19, react-three-fiber 9, three.js 0.183, vitest 4.

**Source spec:** [`docs/superpowers/specs/2026-04-18-biome-visual-identities-design.md`](../specs/2026-04-18-biome-visual-identities-design.md)

---

## Conventions

- Run unit tests with: `npm test` (executes `vitest run`).
- Run typecheck + build with: `npm run build`.
- Visual verification: `npm run dev`, open the printed URL, hit "Play" several times to roll different biomes.
- Commit messages should reference the task number (`feat(biome): task N — short summary`).
- All new files use the same code style as existing siblings (no semicolons inside JSX expressions, double quotes for strings, single-quote-free).

---

## Task 1: Add BiomeType to types.ts (additively); add BiomeTheme; add runBiome to GameSnapshot

**Why this task:** Lock in the type plumbing first so every downstream task can rely on it. Move `BiomeType` from `systems/biome.ts` to `types.ts` to avoid creating a `types.ts → systems/` import (the existing convention is one-way: `systems/* → types.ts`). This task is **purely additive**: `fog_bank` stays in the union for now so old callers (`WaterArena.tsx:255`'s `=== "fog_bank"` comparison; `enemySpawner.ts:26`'s `fog_bank` branch) continue to typecheck. Task 3 narrows the union and removes the dead branches together.

**Files:**
- Modify: `src/game/types.ts` (add `BiomeType`, `BiomeTheme`, extend `GameSnapshot`)
- Modify: `src/game/systems/biome.ts:4` (re-export `BiomeType` from types instead of defining locally)
- Modify: `src/game/useGameState.ts:22-72` (default `runBiome` in `createInitialSnapshot`)
- Modify: `src/game/useGameState.ts:74-96` (no code change — note that the snapshot spread copies `runBiome`)

- [ ] **Step 1.1: Edit `src/game/types.ts` — add the new types.**

Append at the end of the file:

```ts
export type BiomeType = "open_sea" | "island_chain" | "fog_bank" | "deep_waters";

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

(Note: `fog_bank` stays in the union for now — Task 3 removes it once all callers are gone. `deep_waters` is added now so Task 2's `pickRunBiome` can return it.)

Then, inside the `GameSnapshot` interface, add `runBiome: BiomeType;` as the last field, after the existing `runClock` block. The end of the interface now reads:

```ts
export interface GameSnapshot {
  // ... existing fields unchanged ...
  runClock: {
    phase: "wave" | "elite" | "lull" | "boss";
    phaseTime: number;
    elapsedTotal: number;
  };
  runBiome: BiomeType;
}
```

- [ ] **Step 1.2: Edit `src/game/systems/biome.ts` — re-export `BiomeType` from types.**

Replace the existing `export type BiomeType = ...` line (line 4) with a re-export from types.ts. Leave everything else in the file (`biomeAt`, `isIslandAt`) untouched — Task 3 cleans them up.

```ts
// biome.ts
import { hash2 } from "../utils";
import type { BiomeType } from "../types";

export type { BiomeType };

/**
 * Returns a stable biome for a given world coordinate.
 * Resolves into large ~80-unit patches.
 */
export function biomeAt(x: number, y: number): BiomeType {
  const chunkSize = 80;
  const cx = Math.floor(x / chunkSize);
  const cy = Math.floor(y / chunkSize);

  const hash = hash2(cx, cy);

  if (hash < 0.25) {
    return "island_chain";
  } else if (hash > 0.85) {
    return "fog_bank";
  }

  return "open_sea";
}

/**
 * Returns true if a given sub-coordinate within a generic island chain biome
 * should *actually* spawn an island (for scattering).
 */
export function isIslandAt(x: number, y: number): boolean {
  if (biomeAt(x, y) !== "island_chain") {
    return false;
  }
  const chunkX = Math.floor(x / 8);
  const chunkY = Math.floor(y / 8);

  const hash = hash2(chunkX, chunkY);
  return hash < 0.3;
}
```

(The only change is the type definition becoming a re-export; the function bodies are untouched.)

- [ ] **Step 1.3: Edit `src/game/useGameState.ts:22-72` — add `runBiome` to `createInitialSnapshot`.**

Inside `createInitialSnapshot`, add `runBiome: "open_sea"` as the last field of the returned object (literal default; Task 2 replaces with `pickRunBiome()`):

```ts
function createInitialSnapshot(phase: GameSnapshot["phase"] = "start"): GameSnapshot {
  return {
    phase,
    // ... all existing fields unchanged ...
    runClock: {
      phase: "wave",
      phaseTime: 0,
      elapsedTotal: 0,
    },
    runBiome: "open_sea",
  };
}
```

- [ ] **Step 1.4: No code change to `copySnapshot` — verify the spread covers `runBiome`.**

`runBiome` is a primitive string, so `...snapshot` on line 76 already copies it. No edit needed; Task 2's `pickRunBiome()` switch happens at init time, not in `copySnapshot`.

- [ ] **Step 1.5: Run typecheck.**

Run: `npm run build`
Expected: PASS — no type errors. The additive type change should not break anything; if it does, double-check that Step 1.2 only changed the type declaration line (not function bodies) and that `runBiome` was added to `GameSnapshot`.

- [ ] **Step 1.6: Run unit tests.**

Run: `npm test`
Expected: PASS — all existing tests still green.

- [ ] **Step 1.7: Smoke-test the game.**

Run: `npm run dev`, open the URL, click Play. Expected: game runs unchanged (visuals same as before).

- [ ] **Step 1.8: Commit.**

```bash
git add src/game/types.ts src/game/systems/biome.ts src/game/useGameState.ts
git commit -m "feat(biome): task 1 — add BiomeType/BiomeTheme to types.ts; add runBiome to snapshot"
```

---

## Task 2: Add `pickRunBiome` and a deterministic-distribution unit test; wire it into `createInitialSnapshot`

**Why this task:** Replace the literal `"open_sea"` default with an actual run-time roll. Validates that the three biomes appear roughly uniformly.

**Files:**
- Modify: `src/game/systems/biome.ts` (add `pickRunBiome`)
- Create: `src/game/systems/biome.test.ts`
- Modify: `src/game/useGameState.ts:22-72` (replace literal default with `pickRunBiome()`)

- [ ] **Step 2.1: Write the failing test.**

Create `src/game/systems/biome.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pickRunBiome } from "./biome";
import type { BiomeType } from "../types";

describe("pickRunBiome", () => {
  it("returns one of the three valid biome ids", () => {
    const valid: BiomeType[] = ["open_sea", "island_chain", "deep_waters"];
    for (let i = 0; i < 50; i += 1) {
      expect(valid).toContain(pickRunBiome());
    }
  });

  it("distributes roughly uniformly over many samples", () => {
    const counts: Record<BiomeType, number> = {
      open_sea: 0,
      island_chain: 0,
      deep_waters: 0,
    };
    const N = 30_000;
    for (let i = 0; i < N; i += 1) {
      counts[pickRunBiome()] += 1;
    }
    // Each bucket should be within ±15% of N/3 (loose bound — Math.random is uniform enough).
    const expected = N / 3;
    const tolerance = expected * 0.15;
    expect(counts.open_sea).toBeGreaterThan(expected - tolerance);
    expect(counts.open_sea).toBeLessThan(expected + tolerance);
    expect(counts.island_chain).toBeGreaterThan(expected - tolerance);
    expect(counts.island_chain).toBeLessThan(expected + tolerance);
    expect(counts.deep_waters).toBeGreaterThan(expected - tolerance);
    expect(counts.deep_waters).toBeLessThan(expected + tolerance);
  });
});
```

- [ ] **Step 2.2: Run the test to verify it fails.**

Run: `npm test -- biome.test`
Expected: FAIL — `pickRunBiome` is not exported from `./biome`.

- [ ] **Step 2.3: Implement `pickRunBiome` in `src/game/systems/biome.ts`.**

Append to the file:

```ts
const RUN_BIOMES: readonly BiomeType[] = ["open_sea", "island_chain", "deep_waters"];

export function pickRunBiome(): BiomeType {
  const index = Math.floor(Math.random() * RUN_BIOMES.length);
  // Math.random() in [0, 1) so index is in [0, RUN_BIOMES.length); the clamp guards against the
  // theoretical edge case where Math.random() returns exactly 1 (it doesn't, but defence-in-depth).
  return RUN_BIOMES[Math.min(RUN_BIOMES.length - 1, index)];
}
```

- [ ] **Step 2.4: Run the test to verify it passes.**

Run: `npm test -- biome.test`
Expected: PASS.

- [ ] **Step 2.5: Wire `pickRunBiome` into `createInitialSnapshot`.**

Edit `src/game/useGameState.ts`:

Add to the imports at the top:

```ts
import { pickRunBiome } from "./systems/biome";
```

Replace `runBiome: "open_sea"` (added in Task 1) with `runBiome: pickRunBiome()` inside `createInitialSnapshot`.

- [ ] **Step 2.6: Verify whole suite + smoke test.**

Run: `npm test` → all green.
Run: `npm run dev`, click Play several times. The game still runs (you can't see the biome change yet — Task 5+6 wire that visually).

- [ ] **Step 2.7: Commit.**

```bash
git add src/game/systems/biome.ts src/game/systems/biome.test.ts src/game/useGameState.ts
git commit -m "feat(biome): task 2 — pickRunBiome + uniform-distribution test, wired to snapshot init"
```

---

## Task 3: Strip `biomeAt`, `isIslandAt`, and the `biome` parameter from `pickEnemyType`

**Why this task:** Spec §10 Option C — `pickEnemyType` becomes purely time-based; the per-chunk biome lookup is removed entirely. After this task, `BiomeType` is consumed only by run-scoped code.

**Files:**
- Modify: `src/game/systems/biome.ts` (remove `biomeAt`, `isIslandAt`)
- Modify: `src/game/systems/enemySpawner.ts` (drop `biome` param from `pickEnemyType`; drop the two `biomeAt` callsites)
- Modify: `src/scene/arcade/WaterArena.tsx` (drop `biomeAt` import and uses; remove `FogLayer`)

- [ ] **Step 3.1: Edit `src/game/systems/biome.ts` — remove dead helpers.**

The file should end with the type re-export and `pickRunBiome` from Tasks 1–2. Final state:

```ts
// biome.ts
import type { BiomeType } from "../types";

export type { BiomeType };

const RUN_BIOMES: readonly BiomeType[] = ["open_sea", "island_chain", "deep_waters"];

export function pickRunBiome(): BiomeType {
  const index = Math.floor(Math.random() * RUN_BIOMES.length);
  return RUN_BIOMES[Math.min(RUN_BIOMES.length - 1, index)];
}
```

Delete `biomeAt`, `isIslandAt`, and the `hash2` import (now unused).

- [ ] **Step 3.2: Edit `src/game/systems/enemySpawner.ts` — simplify `pickEnemyType`.**

Replace the function entirely. New signature drops the `biome` parameter:

```ts
function pickEnemyType(elapsedTimeSec: number): EnemyType {
  const roll = Math.random();

  if (elapsedTimeSec < 30) {
    if (roll < 0.6) return "swarmer";
    return "corsair";
  }
  if (elapsedTimeSec < 60) {
    if (roll < 0.3) return "swarmer";
    if (roll < 0.7) return "corsair";
    return "brute";
  }
  if (elapsedTimeSec < 150) {
    if (roll < 0.25) return "swarmer";
    if (roll < 0.5) return "corsair";
    if (roll < 0.8) return "bomber";
    return "brute";
  }
  if (roll < 0.2) return "swarmer";
  if (roll < 0.45) return "corsair";
  if (roll < 0.7) return "bomber";
  if (roll < 0.85) return "sniper";
  return "brute";
}
```

In the same file, remove the two `biomeAt(x, y)` callsites and the `BiomeType` / `biomeAt` imports:

- Replace the import on line 14 (`import { biomeAt, type BiomeType } from "./biome";`) with just removing the line.
- In `spawnEnemyOutsideCamera`, locate `const biome = biomeAt(x, y);` followed by `type: pickEnemyType(elapsedTime, biome),` (lines ~102–105 and ~129–132). Replace each pair:

  ```ts
  // Before:
  const biome = biomeAt(x, y);
  enemies.push({
    id: enemyIdRef.value++,
    type: pickEnemyType(elapsedTime, biome),
    // ...
  });

  // After:
  enemies.push({
    id: enemyIdRef.value++,
    type: pickEnemyType(elapsedTime),
    // ...
  });
  ```

Do this in both the primary loop and the fallback loop.

- [ ] **Step 3.3: Edit `src/scene/arcade/WaterArena.tsx` — remove `biomeAt` and `FogLayer`.**

Remove the import on line 5: `import { biomeAt } from "../../game/systems/biome";`

Inside `ScatteredSeaProps` (lines 217–248), the per-cell loop calls `biomeAt(wx, wz)`. Replace the body of the inner loop with a single uniform spawn so the file still renders something (Task 7 makes this biome-aware). Replace lines 226–246 with:

```ts
  for (let i = i0; i <= i1; i += 1) {
    for (let j = j0; j <= j1; j += 1) {
      const h = hash2(i, j);
      const wx = i * CELL + ((h % 100) / 100 - 0.5) * CELL * 0.8;
      const wz = j * CELL + (((h >> 8) % 100) / 100 - 0.5) * CELL * 0.8;

      // Temporary uniform scatter — Task 7 reintroduces per-biome dispatch.
      if (h % 6 === 0) {
        const scale = 0.85 + ((h >> 16) % 100) / 250;
        const variant = (h >> 17) % 3;
        items.push(<BobbingSeaProp key={`buoy-${i}-${j}`} wx={wx} wz={wz} scale={scale} seed={h} variant={variant} />);
      }
    }
  }
```

Delete `FogLayer` (lines 250–266) — the entire function. Also delete `<FogLayer playerX={playerX} playerZ={playerZ} />` from the JSX returned by `WaterArena` (line 340).

- [ ] **Step 3.4: Run typecheck and tests.**

Run: `npm run build`
Expected: PASS.

Run: `npm test`
Expected: PASS — `biome.test.ts` and existing tests still green. (Note: `enemySpawner.test.ts` only imports `getEnemyCap`, which is unchanged, so no test edit needed.)

- [ ] **Step 3.5: Smoke-test the game.**

Run: `npm run dev`, click Play. Expected: game runs; water still looks like before today; no fog plane (the dim layer that occasionally appeared is gone). No console errors.

- [ ] **Step 3.6: Commit.**

```bash
git add src/game/systems/biome.ts src/game/systems/enemySpawner.ts src/scene/arcade/WaterArena.tsx
git commit -m "feat(biome): task 3 — strip biomeAt + per-biome enemy filter; remove FogLayer"
```

---

## Task 4: Create `biomeThemes.ts` with the catalogue and tests

**Why this task:** Centralise the per-biome visual values from spec §3 in one typed lookup. Tests guard against missing fields and bad hex strings.

**Files:**
- Create: `src/scene/biomeThemes.ts`
- Create: `src/scene/biomeThemes.test.ts`

- [ ] **Step 4.1: Write the failing test.**

Create `src/scene/biomeThemes.test.ts`:

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
      expect(t.ambient.intensity).toBeGreaterThanOrEqual(0);
      expect(t.directional.intensity).toBeGreaterThanOrEqual(0);
      expect(t.rim.intensity).toBeGreaterThanOrEqual(0);
      expect(t.fog.near).toBeGreaterThan(0);
      expect(t.fog.far).toBeGreaterThan(t.fog.near);
    }
  });
});
```

- [ ] **Step 4.2: Run the test to verify it fails.**

Run: `npm test -- biomeThemes.test`
Expected: FAIL — `BIOME_THEMES` is not exported.

- [ ] **Step 4.3: Implement `src/scene/biomeThemes.ts`.**

```ts
import type { BiomeTheme, BiomeType } from "../game/types";

export const BIOME_THEMES: Record<BiomeType, BiomeTheme> = {
  open_sea: {
    waterColor: "#1f5f7a",
    waterRoughness: 0.55,
    waterClearcoat: 0.10,
    bumpScale: 0.04,
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
    shimmerColor: "#3a6a90",
    shimmerOpacity: 0.07,
    backgroundColor: "#3a4a5e",
    ambient: { color: "#6080a0", intensity: 0.35 },
    directional: { color: "#c8d8e8", intensity: 0.85, position: [12, 22, 18] },
    rim: { color: "#a0b8d0", intensity: 0.40 },
    fog: { color: "#1a3048", near: 60, far: 240 },
  },
};
```

- [ ] **Step 4.4: Run the test to verify it passes.**

Run: `npm test -- biomeThemes.test`
Expected: PASS.

- [ ] **Step 4.5: Commit.**

```bash
git add src/scene/biomeThemes.ts src/scene/biomeThemes.test.ts
git commit -m "feat(biome): task 4 — biome theme catalogue + validation tests"
```

---

## Task 5: Wire `WaterArena.tsx` to consume `BiomeTheme` (water material from theme; strip overlay stack)

**Why this task:** This is the single biggest visual change. Replace the four white-tinted overlay planes with one biome-tinted shimmer overlay; drive water material colour, roughness, clearcoat, and bump scale from the passed-in theme.

**Files:**
- Modify: `src/scene/arcade/WaterArena.tsx` (props signature + overlay strip + material wiring)

- [ ] **Step 5.1: Edit `WaterArena.tsx` — change `WaterArenaProps` to accept theme.**

At the top of the file, add the import:

```ts
import type { BiomeTheme } from "../../game/types";
```

Replace `interface WaterArenaProps` (line 268) with:

```ts
interface WaterArenaProps {
  playerX: number;
  playerZ: number;
  theme: BiomeTheme;
}
```

Update the function signature on line 273:

```ts
export function WaterArena({ playerX, playerZ, theme }: WaterArenaProps): ReactElement {
```

- [ ] **Step 5.2: Strip the overlay-creating helpers.**

Delete the entire bodies of `createMicroNoiseTexture`, `createAxisFlowTexture`, `createWaterRadialShadeTexture` (lines 13–92). Keep `createCalmBumpTexture` (lines 95–127) — the bump map stays but its scale comes from the theme.

Also delete the corresponding `useMemo` calls at the top of `WaterArena` (lines 274–276): `microNoiseMap`, `axisFlowMap`, `radialShadeMap`. Keep `bumpMap` only.

- [ ] **Step 5.3: Add a single themed shimmer texture helper.**

After `createCalmBumpTexture` add:

```ts
/** Tinted noise overlay scrolled by player movement; replaces the multi-layer white wash. */
function createShimmerNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 720; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = 0.10 + Math.random() * 0.25;
    // White grayscale; the material's `color` tints it to the biome shimmer hue.
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
```

Add the corresponding `useMemo` inside `WaterArena` (replacing the deleted overlay maps):

```ts
  const bumpMap = useMemo(() => createCalmBumpTexture(), []);
  const shimmerMap = useMemo(() => createShimmerNoiseTexture(), []);
```

- [ ] **Step 5.4: Replace the per-frame UV scroll for the deleted overlays.**

Replace the `useFrame` body (lines 282–297) with:

```ts
  useFrame((_state, delta) => {
    const time = _state.clock.elapsedTime;
    const { x: px, z: pz } = playerRef.current;

    bumpMap.offset.x = px * 0.003 + time * 0.0006;
    bumpMap.offset.y = pz * 0.003 - time * 0.00045;

    shimmerMap.offset.x = px * 0.012 + time * 0.0042;
    shimmerMap.offset.y = pz * 0.012 + time * 0.0021;
    void delta;
  });
```

(`void delta;` keeps the param signature for parity with the previous version without TypeScript complaining about an unused arg.)

- [ ] **Step 5.5: Replace the JSX returned by `WaterArena`.**

Replace the `return (...)` block (lines 299–343) with:

```tsx
  return (
    <group>
      <group position={[playerX, 0, playerZ]}>
        {TILE_OFFSETS.flatMap((ox) =>
          TILE_OFFSETS.map((oz) => (
            <group key={`${ox}-${oz}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, -0.02, oz]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshPhysicalMaterial
                  color={theme.waterColor}
                  roughness={theme.waterRoughness}
                  metalness={0.02}
                  bumpMap={bumpMap}
                  bumpScale={theme.bumpScale}
                  clearcoat={theme.waterClearcoat}
                  clearcoatRoughness={0.58}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.012, oz]}>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshBasicMaterial
                  map={shimmerMap}
                  color={theme.shimmerColor}
                  transparent
                  opacity={theme.shimmerOpacity}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))
        )}
      </group>
      <ScatteredSeaProps centerX={playerX} centerZ={playerZ} />
    </group>
  );
```

Note: the `WATER_BASE` constant (line 11) is now unused — delete it.

- [ ] **Step 5.6: Update the parent caller to pass `theme`.**

`GameScene.tsx` currently calls `<WaterArena playerX={...} playerZ={...} />`. Add a placeholder pass for now so the type checks; the proper wiring is Task 6.

In `src/scene/GameScene.tsx`, add at the top:

```ts
import { BIOME_THEMES } from "./biomeThemes";
```

Change the `<WaterArena ...>` line (around line 169) to:

```tsx
<WaterArena
  playerX={snapshot.player.position.x}
  playerZ={snapshot.player.position.y}
  theme={BIOME_THEMES[snapshot.runBiome]}
/>
```

- [ ] **Step 5.7: Run typecheck and tests.**

Run: `npm run build` → PASS.
Run: `npm test` → all green.

- [ ] **Step 5.8: Smoke-test the game and confirm visual change.**

Run: `npm run dev`. Click Play several times. Expected:
- Water now changes colour run-to-run (deep teal / turquoise / dark navy).
- The white wash is gone.
- Lighting, sky, and props are still the old uniform setup (Task 6 + 7+ fix that).

- [ ] **Step 5.9: Commit.**

```bash
git add src/scene/arcade/WaterArena.tsx src/scene/GameScene.tsx
git commit -m "feat(biome): task 5 — themed water material; strip white-wash overlay stack"
```

---

## Task 6: Wire scene lighting, background, and distance fog from the theme in `GameScene.tsx`

**Why this task:** Water colour change alone isn't enough — the bright, near-white lighting plus mismatched background still wash the scene. This task pushes the theme into the canvas lights, sky, and `<fog>`.

**Files:**
- Modify: `src/scene/GameScene.tsx` (background, fog, ambient, directional, rim)

- [ ] **Step 6.1: Replace the lights + background in `GameScene` with theme-driven values.**

Inside `GameScene`, look up the theme once near the top of the function body, then drive the JSX lights from it.

Add at the top of the `GameScene` function (above the `return`):

```tsx
const theme = BIOME_THEMES[snapshot.runBiome];
```

Replace lines 156–166 (the current `<color>`, `<ambientLight>`, two `<directionalLight>`s) with:

```tsx
<color attach="background" args={[theme.backgroundColor]} />
<fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
<ambientLight intensity={theme.ambient.intensity} color={theme.ambient.color} />
<directionalLight
  castShadow
  intensity={theme.directional.intensity}
  color={theme.directional.color}
  position={theme.directional.position}
  shadow-mapSize-width={1024}
  shadow-mapSize-height={1024}
/>
<directionalLight
  intensity={theme.rim.intensity}
  color={theme.rim.color}
  position={[-16, 14, -12]}
/>
```

Update the `<WaterArena ...>` invocation to use the same `theme` variable instead of looking it up again:

```tsx
<WaterArena
  playerX={snapshot.player.position.x}
  playerZ={snapshot.player.position.y}
  theme={theme}
/>
```

- [ ] **Step 6.2: Run typecheck and tests.**

Run: `npm run build` → PASS.
Run: `npm test` → PASS.

- [ ] **Step 6.3: Smoke-test all three biomes visually.**

Run: `npm run dev`. Restart the run (Quit → Play, or hit Restart from the death screen) until you've seen all three biomes:
- **Open Sea**: deep teal water, mid-blue sky, warm sun, fog horizon at ~280u.
- **Island Chain**: bright turquoise, light tropical sky, bright warm sun, fog horizon at ~300u.
- **Deep Waters**: dark navy water, slate sky, dim cool light, fog horizon at ~240u.

If the player ship looks too dark in Deep Waters or too washed in Island Chain, **note** which biome and roughly how bad — but do not change values yet (manual tuning happens in Task 11).

- [ ] **Step 6.4: Commit.**

```bash
git add src/scene/GameScene.tsx
git commit -m "feat(biome): task 6 — scene lighting/background/fog driven by run biome theme"
```

---

## Task 7: Add Open Sea props (NavBuoy, BarrelDebris) and rebuild `ScatteredSeaProps` with biome dispatch

**Why this task:** The current uniform "buoy" props are pale and read poorly against the new biome backgrounds. Replace them with biome-specific props. Open Sea gets visible orange navigation buoys and dark wooden barrel debris.

**Files:**
- Create: `src/scene/arcade/props/NavBuoyProp.tsx`
- Create: `src/scene/arcade/props/BarrelDebrisProp.tsx`
- Modify: `src/scene/arcade/WaterArena.tsx` (thread `runBiome` into `ScatteredSeaProps`; dispatch by biome)

- [ ] **Step 7.1: Create `src/scene/arcade/props/NavBuoyProp.tsx`.**

```tsx
import type { ReactElement } from "react";

interface NavBuoyPropProps {
  variant: number;
}

const POLE_COLOR = "#2d2520";
const CAP_COLORS = ["#d24230", "#e8a020", "#1f6fa8"] as const;

export function NavBuoyProp({ variant }: NavBuoyPropProps): ReactElement {
  const capColor = CAP_COLORS[variant % CAP_COLORS.length];
  return (
    <group>
      <mesh castShadow position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.6, 10]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={capColor} emissive={capColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.36, 0.5, 16]} />
        <meshBasicMaterial color="#dceaf2" transparent opacity={0.10} depthWrite={false} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 7.2: Create `src/scene/arcade/props/BarrelDebrisProp.tsx`.**

```tsx
import type { ReactElement } from "react";

interface BarrelDebrisPropProps {
  variant: number;
}

export function BarrelDebrisProp({ variant }: BarrelDebrisPropProps): ReactElement {
  const tilt = ((variant % 7) - 3) * 0.08;
  return (
    <group rotation={[tilt, 0, tilt * 0.6]}>
      <mesh castShadow position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.55, 12]} />
        <meshStandardMaterial color="#6b3a18" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.225, 0.225, 0.06, 12]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.225, 0.225, 0.06, 12]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 7.3: Refactor `ScatteredSeaProps` in `WaterArena.tsx` for biome dispatch.**

In `WaterArena.tsx`, add the imports near the top:

```ts
import { NavBuoyProp } from "./props/NavBuoyProp";
import { BarrelDebrisProp } from "./props/BarrelDebrisProp";
import type { BiomeType } from "../../game/types";
```

Delete the `BobbingSeaProp` and `CalmSeaProp` helpers (lines 133–214) — they're replaced by the new prop set.

Add a generic bobbing wrapper that any prop can ride on:

```tsx
function BobbingProp({
  wx,
  wz,
  scale,
  seed,
  child,
}: {
  wx: number;
  wz: number;
  scale: number;
  seed: number;
  child: ReactElement;
}): ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state) => {
    if (!groupRef.current) return;
    const time = _state.clock.elapsedTime;
    const bob = Math.sin(time * 1.5 + seed * 10 + wx * 0.1) * 0.08 + Math.cos(time * 0.8 + wz * 0.1) * 0.04;
    groupRef.current.position.y = 0.04 + bob;
    groupRef.current.rotation.z = Math.sin(time * 1.2 + seed * 5) * 0.10;
    groupRef.current.rotation.x = Math.cos(time * 1.1 + seed * 5) * 0.10;
  });

  return (
    <group ref={groupRef} position={[wx, 0.04, wz]} scale={scale}>
      {child}
    </group>
  );
}
```

Replace `ScatteredSeaProps` entirely with a biome-aware version (note the new `biome` prop and the per-biome dispatch — Tasks 8 and 9 fill in the other two branches):

```tsx
function ScatteredSeaProps({
  centerX,
  centerZ,
  biome,
}: {
  centerX: number;
  centerZ: number;
  biome: BiomeType;
}): ReactElement {
  const CELL = 40;
  const viewHalf = 180;
  const i0 = Math.floor((centerX - viewHalf) / CELL);
  const i1 = Math.floor((centerX + viewHalf) / CELL);
  const j0 = Math.floor((centerZ - viewHalf) / CELL);
  const j1 = Math.floor((centerZ + viewHalf) / CELL);

  const items: ReactElement[] = [];
  for (let i = i0; i <= i1; i += 1) {
    for (let j = j0; j <= j1; j += 1) {
      const h = hash2(i, j);
      const wx = i * CELL + ((h % 100) / 100 - 0.5) * CELL * 0.8;
      const wz = j * CELL + (((h >> 8) % 100) / 100 - 0.5) * CELL * 0.8;

      if (biome === "open_sea") {
        if (h % 5 === 0) {
          const variant = (h >> 17) % 3;
          const child = h % 2 === 0
            ? <NavBuoyProp variant={variant} />
            : <BarrelDebrisProp variant={variant} />;
          items.push(<BobbingProp key={`os-${i}-${j}`} wx={wx} wz={wz} scale={0.9} seed={h} child={child} />);
        }
      }
      // island_chain branch added in Task 8
      // deep_waters branch added in Task 9
    }
  }
  return <group>{items}</group>;
}
```

In the `WaterArena` JSX, update the call site:

```tsx
<ScatteredSeaProps centerX={playerX} centerZ={playerZ} biome={biome} />
```

…where `biome` is read from the theme call site. To get it there, add a `biome: BiomeType` field to `WaterArenaProps`:

```ts
interface WaterArenaProps {
  playerX: number;
  playerZ: number;
  theme: BiomeTheme;
  biome: BiomeType;
}
```

…and pass it down in `GameScene.tsx`:

```tsx
<WaterArena
  playerX={snapshot.player.position.x}
  playerZ={snapshot.player.position.y}
  theme={theme}
  biome={snapshot.runBiome}
/>
```

- [ ] **Step 7.4: Run typecheck and tests.**

Run: `npm run build` → PASS.
Run: `npm test` → PASS.

- [ ] **Step 7.5: Smoke-test Open Sea biome.**

Run: `npm run dev`. Restart until you roll Open Sea (the deep-teal water). Expected:
- Visible orange/red and amber navigation buoys around the player.
- Wooden barrels floating at random tilts.
- No more pale "buoys" or stones.
- Island Chain and Deep Waters runs should currently look prop-less (props come in Tasks 8 and 9).

- [ ] **Step 7.6: Commit.**

```bash
git add src/scene/arcade/props/NavBuoyProp.tsx src/scene/arcade/props/BarrelDebrisProp.tsx src/scene/arcade/WaterArena.tsx src/scene/GameScene.tsx
git commit -m "feat(biome): task 7 — Open Sea props (NavBuoy, BarrelDebris) + biome-dispatch ScatteredSeaProps"
```

---

## Task 8: Add Island Chain props (IslandProp + PalmProp) and dispatch

**Why this task:** Island Chain runs need actual islands — flat rock disks ringed by sand, with palm-shape vegetation on top. Cluster them so the player feels they're navigating an archipelago.

**Files:**
- Create: `src/scene/arcade/props/PalmProp.tsx`
- Create: `src/scene/arcade/props/IslandProp.tsx`
- Modify: `src/scene/arcade/WaterArena.tsx` (`island_chain` branch in `ScatteredSeaProps`)

- [ ] **Step 8.1: Create `src/scene/arcade/props/PalmProp.tsx`.**

```tsx
import type { ReactElement } from "react";

interface PalmPropProps {
  variant: number;
}

const TRUNK = "#5a3a1a";
const FROND = "#3a8a3a";

export function PalmProp({ variant }: PalmPropProps): ReactElement {
  const lean = ((variant % 5) - 2) * 0.06;
  return (
    <group rotation={[lean, 0, lean * 0.4]}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.10, 1.4, 7]} />
        <meshStandardMaterial color={TRUNK} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((n) => {
        const angle = (n / 5) * Math.PI * 2;
        const tilt = -Math.PI / 4 + (n % 2) * 0.1;
        return (
          <mesh
            key={n}
            castShadow
            position={[Math.cos(angle) * 0.3, 1.45, Math.sin(angle) * 0.3]}
            rotation={[tilt, angle, 0]}
          >
            <coneGeometry args={[0.08, 0.65, 5]} />
            <meshStandardMaterial color={FROND} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 8.2: Create `src/scene/arcade/props/IslandProp.tsx`.**

```tsx
import type { ReactElement } from "react";
import { PalmProp } from "./PalmProp";

interface IslandPropProps {
  seed: number;
  size: number;
}

const ROCK = "#7a6a55";
const SAND = "#e0cf95";

export function IslandProp({ seed, size }: IslandPropProps): ReactElement {
  const palmCount = 1 + (seed % 3);
  const palms = Array.from({ length: palmCount }, (_, i) => {
    const angle = ((seed >> (i * 3)) % 360) * (Math.PI / 180);
    const radius = size * (0.15 + ((seed >> i) % 100) / 600);
    return (
      <group key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
        <PalmProp variant={(seed >> (i * 5)) & 0xff} />
      </group>
    );
  });

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[size * 1.2, 24]} />
        <meshStandardMaterial color={SAND} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[size * 0.85, size, 0.35, 12]} />
        <meshStandardMaterial color={ROCK} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[size * 0.55, size * 0.78, 0.35, 10]} />
        <meshStandardMaterial color={ROCK} roughness={0.85} />
      </mesh>
      {palms}
    </group>
  );
}
```

- [ ] **Step 8.3: Add `island_chain` branch to `ScatteredSeaProps` in `WaterArena.tsx`.**

Add the import:

```ts
import { IslandProp } from "./props/IslandProp";
```

In the dispatch loop body, add the branch alongside `open_sea`:

```tsx
      } else if (biome === "island_chain") {
        // Cluster: roll an island in ~1 of every 7 cells. Each cell is 40u, so ~one island per 280u² —
        // enough density that the player sees clusters but not so much that the map clogs.
        if (h % 7 === 0) {
          const islandSize = 1.6 + ((h >> 16) % 100) / 65;
          items.push(
            <group key={`ic-${i}-${j}`} position={[wx, 0, wz]}>
              <IslandProp seed={h} size={islandSize} />
            </group>
          );
        } else if (h % 11 === 0) {
          // Sparser nav buoys for navigation between islands.
          const variant = (h >> 17) % 3;
          items.push(
            <BobbingProp key={`ic-buoy-${i}-${j}`} wx={wx} wz={wz} scale={0.85} seed={h} child={<NavBuoyProp variant={variant} />} />
          );
        }
      }
```

(Islands themselves use a static `<group>` rather than `BobbingProp` — they sit on the surface, they don't bob.)

- [ ] **Step 8.4: Run typecheck.**

Run: `npm run build` → PASS.

- [ ] **Step 8.5: Smoke-test Island Chain biome.**

Run: `npm run dev`. Restart until you roll Island Chain (the bright turquoise water). Expected:
- Sand-rim flat islands with 1–3 palm-shape props on each, scattered around the player.
- Occasional navigation buoy between islands.
- Open Sea biome unchanged from Task 7.
- Deep Waters biome still prop-less (Task 9 fills it).

- [ ] **Step 8.6: Commit.**

```bash
git add src/scene/arcade/props/PalmProp.tsx src/scene/arcade/props/IslandProp.tsx src/scene/arcade/WaterArena.tsx
git commit -m "feat(biome): task 8 — Island Chain props (Island, Palm) + cluster dispatch"
```

---

## Task 9: Add Deep Waters props (KelpProp, RockSpireProp, BubbleStreamProp) and dispatch

**Why this task:** Deep Waters needs sparse but dramatic props — rising kelp fronds, jagged rock spires breaking the surface, and small rising bubble streams. Sparse density so each prop is an "event."

**Files:**
- Create: `src/scene/arcade/props/KelpProp.tsx`
- Create: `src/scene/arcade/props/RockSpireProp.tsx`
- Create: `src/scene/arcade/props/BubbleStreamProp.tsx`
- Modify: `src/scene/arcade/WaterArena.tsx` (`deep_waters` branch in `ScatteredSeaProps`)

- [ ] **Step 9.1: Create `src/scene/arcade/props/KelpProp.tsx`.**

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactElement } from "react";
import * as THREE from "three";

interface KelpPropProps {
  seed: number;
}

const KELP = "#1f4a30";

export function KelpProp({ seed }: KelpPropProps): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const phase = (seed % 1000) / 1000;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x = Math.sin(t * 0.6 + phase * 6) * 0.15;
    groupRef.current.rotation.z = Math.cos(t * 0.45 + phase * 6) * 0.12;
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {[0, 1, 2].map((n) => (
        <mesh key={n} castShadow position={[(n - 1) * 0.18, 0.6, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 1.3, 5]} />
          <meshStandardMaterial color={KELP} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 9.2: Create `src/scene/arcade/props/RockSpireProp.tsx`.**

```tsx
import type { ReactElement } from "react";

interface RockSpirePropProps {
  seed: number;
  height: number;
}

const SPIRE = "#3d3a3a";

export function RockSpireProp({ seed, height }: RockSpirePropProps): ReactElement {
  const tiltA = ((seed % 17) - 8) * 0.012;
  const tiltB = (((seed >> 4) % 17) - 8) * 0.012;
  return (
    <group rotation={[tiltA, 0, tiltB]}>
      <mesh castShadow position={[0, height * 0.4, 0]}>
        <coneGeometry args={[0.7, height, 7]} />
        <meshStandardMaterial color={SPIRE} roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0.45, height * 0.25, 0.2]} rotation={[0, 0, 0.25]}>
        <coneGeometry args={[0.3, height * 0.6, 6]} />
        <meshStandardMaterial color={SPIRE} roughness={0.92} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 9.3: Create `src/scene/arcade/props/BubbleStreamProp.tsx`.**

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactElement } from "react";
import * as THREE from "three";

interface BubbleStreamPropProps {
  seed: number;
}

export function BubbleStreamProp({ seed }: BubbleStreamPropProps): ReactElement {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phase = (seed % 1000) / 1000;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < meshRefs.current.length; i += 1) {
      const m = meshRefs.current[i];
      if (!m) continue;
      const local = (t * 0.4 + phase + i * 0.25) % 1;
      m.position.y = local * 0.8;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * (1 - local);
    }
  });

  return (
    <group>
      {[0, 1, 2, 3].map((n) => (
        <mesh
          key={n}
          ref={(m) => { meshRefs.current[n] = m; }}
          position={[((seed >> (n * 2)) % 5 - 2) * 0.05, 0.05, ((seed >> (n * 3)) % 5 - 2) * 0.05]}
        >
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshBasicMaterial color="#cfe8f4" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 9.4: Add `deep_waters` branch to `ScatteredSeaProps` in `WaterArena.tsx`.**

Add the imports:

```ts
import { KelpProp } from "./props/KelpProp";
import { RockSpireProp } from "./props/RockSpireProp";
import { BubbleStreamProp } from "./props/BubbleStreamProp";
```

Add the branch alongside the others:

```tsx
      } else if (biome === "deep_waters") {
        // Sparse — each prop is an event. Spire ~1/13 cells, kelp ~1/9, bubbles ~1/7.
        if (h % 13 === 0) {
          const height = 2.2 + ((h >> 16) % 100) / 30;
          items.push(
            <group key={`dw-spire-${i}-${j}`} position={[wx, 0, wz]}>
              <RockSpireProp seed={h} height={height} />
            </group>
          );
        } else if (h % 9 === 0) {
          items.push(
            <group key={`dw-kelp-${i}-${j}`} position={[wx, 0, wz]}>
              <KelpProp seed={h} />
            </group>
          );
        } else if (h % 7 === 0) {
          items.push(
            <group key={`dw-bub-${i}-${j}`} position={[wx, 0, wz]}>
              <BubbleStreamProp seed={h} />
            </group>
          );
        }
      }
```

- [ ] **Step 9.5: Run typecheck.**

Run: `npm run build` → PASS.

- [ ] **Step 9.6: Smoke-test Deep Waters biome.**

Run: `npm run dev`. Restart until you roll Deep Waters (the dark navy water). Expected:
- Tall rock spires breaking the surface here and there.
- Kelp fronds swaying.
- Small bubble streams rising from the surface.
- Open Sea and Island Chain unchanged.

- [ ] **Step 9.7: Commit.**

```bash
git add src/scene/arcade/props/KelpProp.tsx src/scene/arcade/props/RockSpireProp.tsx src/scene/arcade/props/BubbleStreamProp.tsx src/scene/arcade/WaterArena.tsx
git commit -m "feat(biome): task 9 — Deep Waters props (Kelp, RockSpire, BubbleStream) + sparse dispatch"
```

---

## Task 10: Add a "Region:" label to the HUD

**Why this task:** Players need a tiny visual confirmation of which biome they rolled. One read-only label, top of HUD.

**Files:**
- Modify: `src/ui/Hud.tsx`

- [ ] **Step 10.1: Edit `src/ui/Hud.tsx` — add the label.**

At the top of the file, add a helper map (above the `Hud` function):

```ts
const BIOME_LABELS: Record<GameSnapshot["runBiome"], string> = {
  open_sea: "Open Sea",
  island_chain: "Island Chain",
  deep_waters: "Deep Waters",
};
```

Inside the returned `<div className="hud">`, **before** the first `<div className="hud-row">`, insert:

```tsx
<div className="hud-row">
  <div className="hud-item" style={{ color: "#cdebf6", fontWeight: "bold", fontSize: "13px", letterSpacing: "0.05em" }}>
    Region: {BIOME_LABELS[snapshot.runBiome]}
  </div>
</div>
```

- [ ] **Step 10.2: Run typecheck and tests.**

Run: `npm run build` → PASS.
Run: `npm test` → PASS.

- [ ] **Step 10.3: Smoke-test the HUD across biomes.**

Run: `npm run dev`. Restart until each biome shows. Expected: the "Region: ..." label updates per run and matches the visible biome.

- [ ] **Step 10.4: Commit.**

```bash
git add src/ui/Hud.tsx
git commit -m "feat(biome): task 10 — HUD region label"
```

---

## Task 11: Manual visual verification + tuning pass

**Why this task:** Spec §6 lists a manual verification checklist that must be cleared before merging. Values in `BIOME_THEMES` are starting values for tuning — adjust by eye, then commit the final values back so the spec stays accurate.

**Files (potentially):**
- Modify: `src/scene/biomeThemes.ts` (any value adjustments found during tuning)
- Modify: `docs/superpowers/specs/2026-04-18-biome-visual-identities-design.md` (sync §3 catalogue with final values)

- [ ] **Step 11.1: Run the spec §6 verification checklist.**

Run: `npm run dev`. Restart 10 times and tick off each item:

- [ ] All three biomes appear at least twice.
- [ ] Player ship is clearly readable in **Open Sea**.
- [ ] Player ship is clearly readable in **Island Chain**.
- [ ] Player ship is clearly readable in **Deep Waters** (most likely problem area — dim lighting).
- [ ] Enemy ships are clearly readable in all three biomes (Deep Waters is the test).
- [ ] No biome reads as "whitish" anymore.
- [ ] HUD `Region:` label updates per run.
- [ ] FPS does not regress on Island Chain (the prop-heaviest biome).

- [ ] **Step 11.2: Apply targeted fixes if any check failed.**

Common adjustments:
- Player ship too dark in Deep Waters → bump `BIOME_THEMES.deep_waters.ambient.intensity` from 0.35 toward 0.45.
- Enemies hard to read in Deep Waters → bump enemy emissive intensity in `src/scene/entities/Enemy.tsx` only when `runBiome === "deep_waters"` (cheap conditional). Keep the change minimal; do not redesign enemies.
- Island Chain clusters cause FPS dip → in `WaterArena.tsx`, raise the island spawn divisor from `h % 7` to `h % 9` (sparser).
- Deep Waters fog hides too many enemies → raise `BIOME_THEMES.deep_waters.fog.near` from 60 to 80, `far` from 240 to 280.

Make any changes and revert if they don't help. Do NOT redesign biomes — only tune values.

- [ ] **Step 11.3: Sync final values back to the spec.**

If any value in `BIOME_THEMES` changed during Step 11.2, update the matching row in spec §3 (`docs/superpowers/specs/2026-04-18-biome-visual-identities-design.md`) so it reflects the shipped values.

- [ ] **Step 11.4: Final commit.**

```bash
git add src/scene/biomeThemes.ts src/scene/entities/Enemy.tsx src/scene/arcade/WaterArena.tsx docs/superpowers/specs/2026-04-18-biome-visual-identities-design.md
git commit -m "feat(biome): task 11 — tuning pass; sync spec catalogue"
```

(Stage only the files you actually changed.)

---

## Done

After Task 11, all spec §2 decisions and §3 catalogue entries are implemented. §8 Phase 2 (vertex waves, hero geometry, particles) is **not** in this plan and gets its own spec when this lands in `main`.
