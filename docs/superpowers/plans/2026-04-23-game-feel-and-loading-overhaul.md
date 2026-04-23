# Game-Feel & Loading Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a portfolio-ready FlowForge with <20 MB bundled assets, a 0.6 s snap upgrade moment with VFX + audio, and a post-processed Arcade-Pop visual treatment — staged foundation-first so dev-loop and runtime perf improve before visible juice lands.

**Architecture:** Extend the existing snapshot-driven pattern. Assets flow through a new `src/assets/registry` with a three-tier manifest and a splash-backed `loading` phase. Post-processing mounts as a `<PostFX>` composer inside `<Canvas>`. A new `audioEvents` queue mirrors the existing `visualEffects` queue; `AudioManager` (Web Audio direct) drains it per frame, with a `devSynth` placeholder fallback. Game systems only gain emit calls — no logic changes.

**Tech Stack:** React 19, react-three-fiber 9, three.js 0.183, TypeScript 6, Vitest 4, Vite 8. New deps: `@react-three/postprocessing` (runtime, ~20 KB gz) and `@gltf-transform/cli` (dev-only, build-time asset compression). No audio library. No animation library.

**Design source:** `docs/superpowers/specs/2026-04-23-game-feel-and-loading-overhaul-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `scripts/assets/optimize.mjs` | Build-time asset compression CLI — decimate, DRACO, KTX2, trim |
| `scripts/assets/size-check.mjs` | Build gate — fails if `public/assets/**` exceeds 25 MB |
| `src/assets/manifest.ts` | Asset manifest — `id → { path, tier }` for every GLB/audio file |
| `src/assets/registry.ts` | `getAsset(id)` imperative loader with dedup + cache; `useAsset(id)` hook |
| `src/assets/registry.test.ts` | Unit tests for registry |
| `src/assets/AssetPreloader.tsx` | Drives critical/biome/deferred loads; reports progress |
| `src/scene/postfx/PostFX.tsx` | Bloom + vignette + chromatic aberration composer |
| `src/scene/postfx/postFx.test.ts` | Auto-downgrade fps-tracking test |
| `src/scene/fx/ScreenFlash.tsx` | Full-screen UI overlay flash |
| `src/scene/fx/RadialBurst.tsx` | 3D sparkle burst at world position |
| `src/scene/fx/LevelUpRibbon.tsx` | UI ribbon that sweeps across screen |
| `src/scene/fx/HitSparks.tsx` | 3D hit-spark particles (augments current CombatVfx hitBurst) |
| `src/audio/types.ts` | `AudioEvent`, `SfxId`, `AmbientId` |
| `src/audio/AudioManager.ts` | Web Audio wrapper — bank load, queue drain, gain buses |
| `src/audio/AudioManager.test.ts` | Unit tests for manager queue + buses |
| `src/audio/devSynth.ts` | `OscillatorNode` placeholder tones per SFX id |
| `src/ui/SplashScreen.tsx` | `loading` phase UI with progress bar |
| `src/ui/XPBar.tsx` | Top-of-screen gradient XP bar with sparkle-sweep |
| `src/ui/LevelPill.tsx` | Chunky level badge with bump-on-level-up |
| `src/ui/AnimatedNumber.tsx` | Count-up tween wrapper |
| `src/ui/PulseMeter.tsx` | Meter with pulse-when-ready and damage-flash |
| `src/ui/BossFrame.tsx` | Stylized boss HP frame with emblem |
| `src/ui/BiomeBadge.tsx` | Biome label pill with icon |
| `src/ui/useTweenedValue.ts` | 40-line tween hook — replaces any library |
| `src/ui/useTweenedValue.test.ts` | Tween math tests |
| `docs/asset-workflow.md` | How to source, optimize, and commit assets |

### Modified files

| Path | Change |
|---|---|
| `package.json` | New scripts (`assets:optimize`, `assets:size-check`), wire into `build`, new deps |
| `.gitignore` | Add `assets-sources/` |
| `src/game/types.ts` | Add `loading` phase, `AudioEvent`, `PostFxPulse` types |
| `src/game/useGameState.ts` | Initial phase `loading`, remove upgrade sim-pause, `audioEvents` array, `postFxPulse` field |
| `src/game/systems/upgrades.ts` | Export `emitLevelUpEvents(...)` helper for VFX/audio staging |
| `src/game/systems/upgrades.test.ts` | NEW — TDD for emit-level-up sequence |
| `src/game/systems/pickups.ts` | Push `pickup` audio event on coin collection |
| `src/game/systems/collision.ts` | Push `hit`, `damage_taken`, `ship_destroyed`, `harvestable_destroyed` events |
| `src/App.tsx` | Mount `AudioManager`, gate on `loading` phase, render `<SplashScreen>` |
| `src/scene/GameScene.tsx` | Wrap scene in `<PostFX>`; consume `postFxPulse` |
| `src/scene/models/ShipModelVisual.tsx` | Consume `useAsset(id)` instead of inline loader |
| `src/scene/arcade/props/GltfMeshyProp.tsx` | Consume `useAsset(id)` |
| `src/ui/UpgradeModal.tsx` | Snap-in/out CSS keyframes, emit `levelUp` on pick |
| `src/ui/Hud.tsx` | Full rewrite using new primitives |
| `src/styles.css` | Keyframes for flash/ribbon/pulse/snap |

### Untouched

- `src/game/systems/{autoAttack,biome,boostAbility,bossSpawner,cannonAbility,enemyRanged,enemySpawner,harvestableSpawner,playerController,runArc}.ts` — no logic changes. A couple of them (`collision.ts`, `pickups.ts`) gain *emit* calls only.

---

## Conventions for this plan

- **TDD** is applied to pure logic (queues, tween math, auto-downgrade fps tracker, registry tier math). For React components and 3D rendering, we write the component + smoke-test in the dev server; no fragile DOM/renderer tests.
- **Commits** use the existing `feat(area): …` / `fix(area): …` / `chore(area): …` style. Run `npm run test` and `npm run build` before committing feature commits.
- **Each task commits once** when its step marks it complete. Tasks are independently deployable where feasible.

---

# PHASE 1 — Loading Performance

## Task 1: Clean up existing asset cruft and gitignore

**Files:**
- Delete: `public/assets/models/ships/*.Zone.Identifier`
- Delete: `public/assets/models/ships/Enemy_ship_boss.Identifier`
- Delete: `src/scene/arcade/props/*.Zone.Identifier`
- Modify: `.gitignore`
- Create: `assets-sources/README.md`

- [ ] **Step 1: Remove NTFS metadata files**

```bash
find public/assets/models -name '*.Zone.Identifier' -delete
find public/assets/models -name '*.Identifier' -delete
find src/scene/arcade/props -name '*.Zone.Identifier' -delete
```

- [ ] **Step 2: Verify cleanup**

Run: `find public src -name '*.Identifier*' -print`
Expected: no output.

- [ ] **Step 3: Update `.gitignore`**

Add these lines at the end of `.gitignore`:

```
# Raw Meshy / source GLBs — optimize into public/assets/models/ via npm run assets:optimize
assets-sources/
*.Zone.Identifier
```

- [ ] **Step 4: Create `assets-sources/README.md`**

```markdown
# Asset sources

Put raw Meshy GLB exports here. This directory is gitignored.

Run `npm run assets:optimize` to produce compressed outputs in `public/assets/models/`
(the only git-tracked copies).

Tiered loading is declared in `src/assets/manifest.ts`.
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore assets-sources/README.md
git rm --cached -f public/assets/models/ships/*.Zone.Identifier 2>/dev/null || true
git commit -m "chore(assets): drop NTFS Zone.Identifier cruft; gitignore assets-sources/"
```

---

## Task 2: Asset size-check build gate

**Files:**
- Create: `scripts/assets/size-check.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/assets/size-check.mjs`**

```javascript
// Fails the build if public/assets/** exceeds MAX_BYTES.
// Wired into `npm run build` via package.json "prebuild" hook.

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard gate
const ROOT = "public/assets";

async function walkSize(path) {
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      total += await walkSize(full);
    } else if (entry.isFile()) {
      const s = await stat(full);
      total += s.size;
    }
  }
  return total;
}

const total = await walkSize(ROOT);
const mb = (total / 1024 / 1024).toFixed(2);
if (total > MAX_BYTES) {
  console.error(`[size-check] FAIL: public/assets is ${mb} MB (limit ${MAX_BYTES / 1024 / 1024} MB)`);
  process.exit(1);
}
console.log(`[size-check] OK: public/assets is ${mb} MB (limit ${MAX_BYTES / 1024 / 1024} MB)`);
```

- [ ] **Step 2: Wire into `package.json`**

Edit the `"scripts"` block to add these two entries (keep existing entries):

```json
"assets:size-check": "node ./scripts/assets/size-check.mjs",
"prebuild": "node ./scripts/assets/size-check.mjs",
```

- [ ] **Step 3: Verify the gate trips on the current 361 MB tree**

Run: `npm run assets:size-check`
Expected: exit code 1 with "FAIL: public/assets is ~361 MB". **This is the expected state until Task 3 compresses assets.**

- [ ] **Step 4: Commit**

```bash
git add scripts/assets/size-check.mjs package.json
git commit -m "chore(build): add 25 MB size-check gate on public/assets"
```

---

## Task 3: Asset optimization pipeline

**Files:**
- Create: `scripts/assets/optimize.mjs`
- Create: `docs/asset-workflow.md`
- Modify: `package.json` (add `devDependencies` + scripts)

- [ ] **Step 1: Install the build-time toolchain**

```bash
npm install --save-dev @gltf-transform/cli @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp
```

Expected: package.json `devDependencies` gains those entries. `npm install` exits 0.

- [ ] **Step 2: Create `scripts/assets/optimize.mjs`**

```javascript
// Walks assets-sources/ and emits DRACO+KTX2+decimated GLBs into public/assets/models/.
// Run: npm run assets:optimize

import { readdir, mkdir } from "node:fs/promises";
import { join, relative, dirname, basename, extname } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import {
  ALL_EXTENSIONS,
  KHRDracoMeshCompression,
  KHRTextureBasisu,
} from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  simplify,
  textureCompress,
  draco as dracoTransform,
} from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const SRC = "assets-sources";
const DST = "public/assets/models";

// Decimation targets by directory segment.
function targetTrisFor(relPath) {
  if (relPath.includes("ships")) return 6000;
  if (relPath.includes("structures")) return 4000;
  return 2500; // props
}

async function walkGlb(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await walkGlb(full, acc);
    } else if (e.isFile() && extname(e.name).toLowerCase() === ".glb") {
      acc.push(full);
    }
  }
  return acc;
}

async function optimizeOne(srcPath) {
  const rel = relative(SRC, srcPath);
  const dstPath = join(DST, rel);
  await mkdir(dirname(dstPath), { recursive: true });

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": (await import("draco3dgltf")).default.createEncoderModule(),
      "draco3d.decoder": (await import("draco3dgltf")).default.createDecoderModule(),
    });

  const doc = await io.read(srcPath);

  const targetTris = targetTrisFor(rel);
  await doc.transform(
    dedup(),
    prune({ keepLeaves: false }),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.01 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    dracoTransform({ method: "edgebreaker", encodeSpeed: 5, decodeSpeed: 5 })
  );

  await io.write(dstPath, doc);
  console.log(`  ${rel}: ≤${targetTris} tris, DRACO+WebP`);
}

async function main() {
  const sources = await walkGlb(SRC);
  if (sources.length === 0) {
    console.warn(`[optimize] no GLBs found in ${SRC}/`);
    return;
  }
  console.log(`[optimize] ${sources.length} GLB(s) → ${DST}/`);
  for (const src of sources) await optimizeOne(src);
  console.log("[optimize] done");
}

await main();
```

**Note on KTX2 vs WebP:** KTX2/BasisU requires a native toolchain (`toktx` or `basisu` CLI). To keep this cross-platform, the script emits WebP textures (4–8× smaller than PNG, universally supported in browsers). If KTX2 is desired later, swap `textureCompress` for `textureCompress({ encoder: toktx, targetFormat: "ktx2" })` after installing `toktx` locally.

- [ ] **Step 3: Install draco3dgltf for the NodeIO registration**

```bash
npm install --save-dev draco3dgltf
```

- [ ] **Step 4: Add `assets:optimize` to `package.json` scripts**

```json
"assets:optimize": "node ./scripts/assets/optimize.mjs",
```

- [ ] **Step 5: Create `docs/asset-workflow.md`**

```markdown
# Asset workflow

## Sources

Raw Meshy / Blender exports live in `assets-sources/` (gitignored). Mirror the
target directory structure:

    assets-sources/
      ships/Main_ship.glb
      ships/Enemy_ship_basic.glb
      props/crystal.glb

## Optimize

    npm run assets:optimize

Writes compressed outputs to `public/assets/models/` (git-tracked). Typical
reduction: 50–150k tris → 5–8k tris (ships) or 2–3k tris (props), PNG textures
→ WebP at 1024², DRACO mesh compression.

## Size gate

    npm run assets:size-check

Runs automatically before `npm run build`. Fails if `public/assets/**` exceeds
25 MB.

## Tier declaration

Every asset is declared in `src/assets/manifest.ts` with a tier:
`critical` (pre-title), `biome` (title-screen parallel), `deferred` (in-run stream).
```

- [ ] **Step 6: Move source assets out of `public/assets/models/` before running**

The current `public/assets/models/` contains the raw 361 MB sources. Move them:

```bash
mkdir -p assets-sources/ships assets-sources/props
# Move only real GLB files (not markdown, not Zone.Identifier leftovers)
mv public/assets/models/ships/*.glb assets-sources/ships/ 2>/dev/null || true
mv public/assets/models/props/*.glb assets-sources/props/ 2>/dev/null || true
```

- [ ] **Step 7: Run the optimizer**

Run: `npm run assets:optimize`
Expected: outputs compressed GLBs to `public/assets/models/`. Total size should be well under 25 MB. Run `du -sh public/assets` to confirm.

If the optimizer fails on a specific file (some Meshy outputs have quirks), fall back to running `simplify` with a looser ratio (e.g. `ratio: 0.3`) or skip `simplify` for that file — better to ship a slightly larger asset than fail the build.

- [ ] **Step 8: Verify the size gate now passes**

Run: `npm run assets:size-check`
Expected: exit 0, "OK: public/assets is <25 MB".

- [ ] **Step 9: Commit**

```bash
git add scripts/assets/optimize.mjs docs/asset-workflow.md package.json package-lock.json public/assets/
git commit -m "feat(assets): DRACO + WebP optimization pipeline; bundle reduced to <25 MB"
```

---

## Task 4: Extend types — `loading` phase, `AudioEvent`, `PostFxPulse`

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: Add `loading` to `RunPhase` and new types**

In `src/game/types.ts`, edit the `RunPhase` type and add new types near the other exports (above `GameSnapshot`):

```typescript
export type RunPhase = "loading" | "start" | "playing" | "paused" | "upgrade" | "gameover";

export type SfxId =
  | "cannon_fire"
  | "hit"
  | "pickup"
  | "upgrade_sting"
  | "boss_cue"
  | "damage_taken"
  | "ship_destroyed"
  | "harvestable_destroyed";

export type AmbientId = "sea_bed" | "boss_bed";

export interface AudioEvent {
  id: number;
  sfx: SfxId;
  volume?: number;
  pitch?: number;
}

export type PostFxEffect = "chromaticAb" | "flash";

export interface PostFxPulse {
  effect: PostFxEffect;
  remaining: number;
  duration: number;
}

export interface LoadingState {
  progress: number; // 0..1
  label: string;
}
```

- [ ] **Step 2: Add new fields to `GameSnapshot`**

In the same file, extend the `GameSnapshot` interface:

```typescript
export interface GameSnapshot {
  phase: RunPhase;
  loading: LoadingState;
  player: PlayerState;
  enemies: EnemyState[];
  harvestables: HarvestableState[];
  projectiles: ProjectileState[];
  visualEffects: VisualEffect[];
  audioEvents: AudioEvent[];
  postFxPulse: PostFxPulse | null;
  pickups: PickupState[];
  upgrades: UpgradeStats;
  cooldowns: Cooldowns;
  stats: GameStats;
  pendingUpgradeOptions: UpgradeOption[];
  message: FlashMessage | null;
  spawnIntensity: number;
  runClock: {
    phase: "wave" | "elite" | "lull" | "boss";
    phaseTime: number;
    elapsedTotal: number;
  };
  runBiome: BiomeType;
}
```

- [ ] **Step 3: Run type-check**

Run: `npx tsc -b --noEmit`
Expected: failures in `useGameState.ts` (missing `loading`, `audioEvents`, `postFxPulse` on snapshot). This is expected — Task 5 addresses them.

- [ ] **Step 4: Commit (after Task 5 is also done; do not commit in isolation)**

Skip commit here — commit with Task 5 since they produce a compilable state together.

---

## Task 5: Initial snapshot + state plumbing for new fields

**Files:**
- Modify: `src/game/useGameState.ts`

- [ ] **Step 1: Update `createInitialSnapshot` default phase and fields**

Replace the body of `createInitialSnapshot` in `src/game/useGameState.ts` (replace existing `phase` default and add the new fields):

```typescript
function createInitialSnapshot(phase: GameSnapshot["phase"] = "loading"): GameSnapshot {
  return {
    phase,
    loading: { progress: 0, label: "" },
    player: {
      position: { x: 0, y: 0 },
      facing: 0,
      hp: BASE_PLAYER_HP,
      maxHp: BASE_PLAYER_HP,
      baseSpeed: BASE_PLAYER_SPEED,
    },
    enemies: [],
    harvestables: [],
    projectiles: [],
    visualEffects: [],
    audioEvents: [],
    postFxPulse: null,
    pickups: [],
    upgrades: {
      level: 0,
      fireRateMult: 1,
      speedMult: 1,
      cooldownMult: 1,
      nextThreshold: 10,
      stacks: {} as Record<UpgradeType, number>,
    },
    cooldowns: {
      cannonRemaining: 0,
      cannonDuration: BASE_CANNON_COOLDOWN,
      boostRemaining: 0,
      boostDuration: BOOST_COOLDOWN,
      boostActiveRemaining: 0,
      boostActiveDuration: BOOST_ACTIVE_TIME,
      invulnRemaining: 0,
      frenzyRemaining: 0,
    },
    stats: {
      timeSurvived: 0,
      enemiesKilled: 0,
      collectedCoins: 0,
      score: 0,
      longestUnscathedStreak: 0,
      currentUnscathedStreak: 0,
      biggestHit: 0,
      evolutionsUnlocked: 0,
    },
    pendingUpgradeOptions: [],
    message: null,
    spawnIntensity: 0,
    runClock: {
      phase: "wave",
      phaseTime: 0,
      elapsedTotal: 0,
    },
    runBiome: "open_sea",
  };
}
```

- [ ] **Step 2: Update `copySnapshot` to include the new fields**

Replace the body of `copySnapshot`:

```typescript
function copySnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    loading: { ...snapshot.loading },
    player: { ...snapshot.player, position: { ...snapshot.player.position } },
    enemies: snapshot.enemies.map((enemy) => ({ ...enemy, position: { ...enemy.position } })),
    harvestables: snapshot.harvestables.map((h) => ({ ...h, position: { ...h.position } })),
    projectiles: snapshot.projectiles.map((projectile) => ({
      ...projectile,
      position: { ...projectile.position },
      velocity: { ...projectile.velocity },
    })),
    visualEffects: snapshot.visualEffects.map((effect) => ({
      ...effect,
      position: { ...effect.position },
    })),
    audioEvents: snapshot.audioEvents.map((e) => ({ ...e })),
    postFxPulse: snapshot.postFxPulse ? { ...snapshot.postFxPulse } : null,
    pickups: snapshot.pickups.map((pickup) => ({ ...pickup, position: { ...pickup.position } })),
    upgrades: { ...snapshot.upgrades },
    cooldowns: { ...snapshot.cooldowns },
    stats: { ...snapshot.stats },
    pendingUpgradeOptions: snapshot.pendingUpgradeOptions.map((option) => ({ ...option })),
    message: snapshot.message ? { ...snapshot.message } : null,
    runClock: { ...snapshot.runClock },
  };
}
```

- [ ] **Step 3: Default the initial phase to `loading`**

Edit the `useState` initializer at the top of `useGameState`:

```typescript
const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialSnapshot("loading"));
```

- [ ] **Step 4: Add a `finishLoading` transition to the API**

Add inside `useGameState`, near the other callbacks (before `tick`):

```typescript
const finishLoading = useCallback(() => {
  const state = stateRef.current;
  if (state.phase === "loading") {
    state.phase = "start";
    state.loading = { progress: 1, label: "" };
    syncState();
  }
}, [syncState]);

const setLoadingProgress = useCallback((progress: number, label: string) => {
  const state = stateRef.current;
  state.loading = { progress: Math.min(1, Math.max(0, progress)), label };
  syncState();
}, [syncState]);
```

Add both to the `UseGameStateApi` interface and the return object:

```typescript
export interface UseGameStateApi {
  snapshot: GameSnapshot;
  startRun: () => void;
  restartRun: () => void;
  setMovementKey: (key: MovementKey, pressed: boolean) => void;
  triggerCannon: () => void;
  triggerBoost: () => void;
  chooseUpgrade: (type: UpgradeType) => void;
  togglePause: () => void;
  quitRun: () => void;
  tick: (delta: number) => void;
  finishLoading: () => void;
  setLoadingProgress: (progress: number, label: string) => void;
}
```

Return object at the bottom gains:

```typescript
  return {
    snapshot,
    startRun,
    restartRun,
    setMovementKey,
    triggerCannon,
    triggerBoost,
    chooseUpgrade,
    togglePause,
    quitRun,
    tick,
    finishLoading,
    setLoadingProgress,
  };
```

- [ ] **Step 5: Type-check passes**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 6: Existing tests still pass**

Run: `npm run test`
Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/game/types.ts src/game/useGameState.ts
git commit -m "feat(state): add loading phase, audioEvents queue, postFxPulse field"
```

---

## Task 6: Asset manifest + registry (TDD)

**Files:**
- Create: `src/assets/manifest.ts`
- Create: `src/assets/registry.ts`
- Create: `src/assets/registry.test.ts`

- [ ] **Step 1: Write failing test for manifest + registry**

Create `src/assets/registry.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MANIFEST } from "./manifest";
import { __resetRegistryForTests, assetsByTier, getProgress, markLoaded } from "./registry";

describe("manifest", () => {
  it("has every asset tagged with a tier", () => {
    for (const [id, entry] of Object.entries(MANIFEST)) {
      expect(["critical", "biome", "deferred"]).toContain(entry.tier);
      expect(entry.path).toMatch(/^\/assets\//);
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it("has at least one critical asset", () => {
    const critical = Object.values(MANIFEST).filter((a) => a.tier === "critical");
    expect(critical.length).toBeGreaterThan(0);
  });
});

describe("registry tier filtering", () => {
  beforeEach(() => __resetRegistryForTests());

  it("assetsByTier returns only matching-tier entries", () => {
    const critical = assetsByTier("critical");
    const biome = assetsByTier("biome");
    expect(critical.every((e) => e.tier === "critical")).toBe(true);
    expect(biome.every((e) => e.tier === "biome")).toBe(true);
  });
});

describe("registry progress", () => {
  beforeEach(() => __resetRegistryForTests());

  it("reports 0 before any loads in a tier", () => {
    expect(getProgress("critical")).toBe(0);
  });

  it("reports 1 when all assets in a tier are marked loaded", () => {
    const ids = assetsByTier("critical").map((e) => e.id);
    for (const id of ids) markLoaded(id);
    expect(getProgress("critical")).toBe(1);
  });

  it("reports proportional progress for partial loads", () => {
    const ids = assetsByTier("critical").map((e) => e.id);
    if (ids.length < 2) return; // skip if only one critical asset
    markLoaded(ids[0]);
    expect(getProgress("critical")).toBeCloseTo(1 / ids.length, 3);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm run test -- registry`
Expected: FAIL — "Cannot find module './manifest'" or similar.

- [ ] **Step 3: Create `src/assets/manifest.ts`**

```typescript
export type AssetTier = "critical" | "biome" | "deferred";

export interface AssetEntry {
  id: string;
  path: string;
  tier: AssetTier;
}

// Concrete asset ids referenced by runtime code. Add here when a new GLB lands.
// Paths must be under /assets/ and match what lands in public/assets/ after
// npm run assets:optimize.
export const MANIFEST: Record<string, AssetEntry> = {
  // CRITICAL: needed before the title screen renders.
  playerShip:        { id: "playerShip",        path: "/assets/models/ships/Main_ship.glb",          tier: "critical" },

  // BIOME: loaded during title screen, parallel with user reading it.
  enemyShipBasic:    { id: "enemyShipBasic",    path: "/assets/models/ships/Enemy_ship_basic.glb",   tier: "biome" },
  enemyShipFast:     { id: "enemyShipFast",     path: "/assets/models/ships/Enemy_ship_fast.glb",    tier: "biome" },
  enemyShipTank:     { id: "enemyShipTank",     path: "/assets/models/ships/Enemy_ship_tank.glb",    tier: "biome" },
  propBarrel:        { id: "propBarrel",        path: "/assets/models/props/Meshy_AI_Weathered_wooden_barr_0423095209_texture.glb",  tier: "biome" },
  propBuoy:          { id: "propBuoy",          path: "/assets/models/props/Meshy_AI_Stylized_ocean_naviga_0423095217_texture.glb", tier: "biome" },

  // DEFERRED: background-loaded during combat. Primitive-mesh fallback covers gaps.
  enemyShipBoss:     { id: "enemyShipBoss",     path: "/assets/models/ships/Enemy_ship_boss.glb",    tier: "deferred" },
  propCrystal:       { id: "propCrystal",       path: "/assets/models/props/Meshy_AI_Mysterious_crystal_fo_0423094924_texture.glb", tier: "deferred" },
  propPalm:          { id: "propPalm",          path: "/assets/models/props/Meshy_AI_Single_stylized_palm__0423095118_texture.glb", tier: "deferred" },
  propIsland:        { id: "propIsland",        path: "/assets/models/props/Meshy_AI_Small_stylized_tropic_0423095130_texture.glb", tier: "deferred" },
};
```

- [ ] **Step 4: Create `src/assets/registry.ts`**

```typescript
import { useEffect, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import { MANIFEST, type AssetEntry, type AssetTier } from "./manifest";

type LoadState = { status: "idle" } | { status: "loading" } | { status: "ready"; scene: THREE.Group } | { status: "error"; error: unknown };

const states = new Map<string, LoadState>();
const waiters = new Map<string, Array<(scene: THREE.Group) => void>>();
const subscribers = new Set<() => void>();

function notify() {
  for (const fn of subscribers) fn();
}

// Shared loader — DRACO decoder fetched from a CDN to avoid bundling the wasm blob.
let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  sharedLoader = loader;
  return loader;
}

export function assetsByTier(tier: AssetTier): AssetEntry[] {
  return Object.values(MANIFEST).filter((e) => e.tier === tier);
}

export function getProgress(tier: AssetTier): number {
  const entries = assetsByTier(tier);
  if (entries.length === 0) return 1;
  const loaded = entries.filter((e) => states.get(e.id)?.status === "ready").length;
  return loaded / entries.length;
}

export function getAsset(id: string): Promise<THREE.Group> {
  const entry = MANIFEST[id];
  if (!entry) return Promise.reject(new Error(`unknown asset id: ${id}`));
  const current = states.get(id);
  if (current?.status === "ready") return Promise.resolve(current.scene);
  return new Promise((resolve, reject) => {
    const list = waiters.get(id) ?? [];
    list.push(resolve);
    waiters.set(id, list);
    if (current?.status === "loading") return;
    states.set(id, { status: "loading" });
    notify();
    getLoader().load(
      entry.path,
      (gltf) => {
        states.set(id, { status: "ready", scene: gltf.scene });
        const resolvers = waiters.get(id) ?? [];
        waiters.delete(id);
        for (const r of resolvers) r(gltf.scene);
        notify();
      },
      undefined,
      (err) => {
        states.set(id, { status: "error", error: err });
        waiters.delete(id);
        notify();
        reject(err);
      }
    );
  });
}

export function useAsset(id: string): THREE.Group | null {
  const [, force] = useState(0);
  useEffect(() => {
    const s = states.get(id);
    if (!s || s.status === "idle") getAsset(id).catch(() => { /* handled via state */ });
    const fn = () => force((n) => n + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, [id]);
  const s = states.get(id);
  return s?.status === "ready" ? s.scene : null;
}

// Test-only helpers.
export function __resetRegistryForTests(): void {
  states.clear();
  waiters.clear();
  subscribers.clear();
}

export function markLoaded(id: string): void {
  // Used by tests and by the preloader to mark critical progress based on actual load success.
  // In tests, we mark with a stub group.
  states.set(id, { status: "ready", scene: new THREE.Group() });
  notify();
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- registry`
Expected: all registry tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/assets/manifest.ts src/assets/registry.ts src/assets/registry.test.ts
git commit -m "feat(assets): add tiered manifest + registry with getAsset/useAsset"
```

---

## Task 7: `<AssetPreloader>` component

**Files:**
- Create: `src/assets/AssetPreloader.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useRef } from "react";
import { assetsByTier, getAsset, getProgress } from "./registry";
import type { AssetTier } from "./manifest";

interface AssetPreloaderProps {
  tier: AssetTier;
  onProgress?: (progress: number, label: string) => void;
  onComplete?: () => void;
}

/**
 * Loads every asset in the given tier in parallel. Fires onProgress after each
 * individual load completes (or fails — a failure still advances progress;
 * deferred-tier misses fall back to primitive meshes at render time).
 */
export function AssetPreloader({ tier, onProgress, onComplete }: AssetPreloaderProps): null {
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const entries = assetsByTier(tier);
    if (entries.length === 0) {
      onProgress?.(1, "");
      onComplete?.();
      return;
    }

    let completed = 0;
    for (const entry of entries) {
      getAsset(entry.id)
        .catch(() => { /* error already captured in registry state; still count as done */ })
        .finally(() => {
          completed += 1;
          const progress = completed / entries.length;
          onProgress?.(progress, entry.id);
          if (completed === entries.length) {
            onComplete?.();
          }
        });
    }

    // Fallback: if everything is already cached, fire progress once.
    const p = getProgress(tier);
    if (p === 1) {
      onProgress?.(1, "");
      onComplete?.();
    }
  }, [tier, onProgress, onComplete]);

  return null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/assets/AssetPreloader.tsx
git commit -m "feat(assets): add AssetPreloader driving tiered loads"
```

---

## Task 8: `<SplashScreen>` component

**Files:**
- Create: `src/ui/SplashScreen.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS for splash**

Append to `src/styles.css`:

```css
.splash {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #14243a 0%, #0a1222 85%);
  color: #d4e4f0;
  z-index: 100;
  font-family: system-ui, sans-serif;
}

.splash-title {
  font-size: 64px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 0 24px rgba(120, 180, 240, 0.5);
  margin-bottom: 32px;
}

.splash-bar {
  width: 320px;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.splash-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #5faae0, #a8d8e0);
  transition: width 150ms ease-out;
}

.splash-label {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  opacity: 0.5;
  margin-top: 12px;
  min-height: 16px;
}
```

- [ ] **Step 2: Create the component**

Create `src/ui/SplashScreen.tsx`:

```tsx
import type { ReactElement } from "react";
import type { LoadingState } from "../game/types";

interface SplashScreenProps {
  loading: LoadingState;
}

export function SplashScreen({ loading }: SplashScreenProps): ReactElement {
  const pct = Math.round(loading.progress * 100);
  return (
    <div className="splash">
      <div className="splash-title">FLOWFORGE</div>
      <div className="splash-bar">
        <div className="splash-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="splash-label">{loading.label || "Loading…"}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/SplashScreen.tsx src/styles.css
git commit -m "feat(ui): add SplashScreen with progress bar"
```

---

## Task 9: Wire loading phase into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Render splash + drive critical preload**

Replace the render block in `src/App.tsx` to add the loading phase branch and mount `AssetPreloader`. Update imports at the top:

```tsx
import { useEffect } from "react";
import type { ReactElement } from "react";
import { AssetPreloader } from "./assets/AssetPreloader";
import { useGameState } from "./game/useGameState";
import type { MovementKey } from "./game/types";
import { GameScene } from "./scene/GameScene";
import { GameOverScreen } from "./ui/GameOverScreen";
import { Hud } from "./ui/Hud";
import { PauseScreen } from "./ui/PauseScreen";
import { SplashScreen } from "./ui/SplashScreen";
import { StartScreen } from "./ui/StartScreen";
import { UpgradeModal } from "./ui/UpgradeModal";
```

Destructure the two new API methods:

```tsx
const { snapshot, startRun, restartRun, setMovementKey, triggerCannon, triggerBoost, chooseUpgrade, togglePause, quitRun, tick, finishLoading, setLoadingProgress } =
  useGameState();
```

Replace the final JSX return with:

```tsx
  return (
    <div className="app-shell">
      {snapshot.phase === "loading" ? (
        <>
          <AssetPreloader
            tier="critical"
            onProgress={(p, label) => setLoadingProgress(p, label)}
            onComplete={finishLoading}
          />
          <SplashScreen loading={snapshot.loading} />
        </>
      ) : (
        <>
          <GameScene snapshot={snapshot} />
          {(snapshot.phase === "playing" || snapshot.phase === "upgrade" || snapshot.phase === "paused") && <Hud snapshot={snapshot} />}
          {snapshot.phase === "start" && (
            <>
              <AssetPreloader tier="biome" />
              <StartScreen onStart={startRun} />
            </>
          )}
          {snapshot.phase === "playing" && <AssetPreloader tier="deferred" />}
          {snapshot.phase === "paused" && <PauseScreen snapshot={snapshot} onResume={togglePause} onQuit={quitRun} />}
          {snapshot.phase === "upgrade" && (
            <UpgradeModal options={snapshot.pendingUpgradeOptions} onPick={chooseUpgrade} />
          )}
          {snapshot.phase === "gameover" && <GameOverScreen snapshot={snapshot} onRestart={restartRun} />}
        </>
      )}
    </div>
  );
```

- [ ] **Step 2: Smoke-test in dev**

Run: `npm run dev`
Expected: browser opens, shows splash with title + progress bar that fills to 100% then auto-advances to Start screen. Click Start → game plays.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): gate boot on loading phase; drive tiered preloads"
```

---

## Task 10: Migrate `ShipModelVisual` to registry

**Files:**
- Modify: `src/scene/models/ShipModelVisual.tsx`

- [ ] **Step 1: Replace the loader logic with `useAsset`**

In `src/scene/models/ShipModelVisual.tsx`, replace the `ShipModelConfig` interface to take an `assetId` (not paths) and simplify the hook. Keep `normalizeShipScene`, `applyEliteShipTint`, `applySteamboatMaterials`, and `createSteamboatMaterialPalette` unchanged. Replace the `useShipAsset` hook and the component body:

```tsx
import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useAsset } from "../../assets/registry";

type ForwardAxis = "positiveZ" | "negativeZ" | "positiveX" | "negativeX";
type ShipMaterialPreset = "playerSteamboat";

export interface ShipModelConfig {
  assetId: string;
  targetLength: number;
  forwardAxis?: ForwardAxis;
  rotationOffsetY?: number;
  positionOffset?: [number, number, number];
  materialPreset?: ShipMaterialPreset;
}

interface ShipModelVisualProps {
  config: ShipModelConfig;
  fallback: ReactNode;
  eliteTint?: boolean;
}

const FORWARD_AXIS_ROTATION_Y: Record<ForwardAxis, number> = {
  positiveZ: 0,
  negativeZ: Math.PI,
  positiveX: Math.PI / 2,
  negativeX: -Math.PI / 2,
};

export const PLAYER_SHIP_MODEL_CONFIG: ShipModelConfig = {
  assetId: "playerShip",
  targetLength: 3.2,
  forwardAxis: "positiveZ",
  rotationOffsetY: Math.PI / 2,
  positionOffset: [0, 0.02, 0],
  materialPreset: "playerSteamboat",
};

// (Keep existing normalizeShipScene, applyEliteShipTint, applySteamboatMaterials,
//  createSteamboatMaterialPalette, STEAMBOAT_MATERIAL_SETTINGS, chooseSteamboatMaterialRole,
//  hasUsableTexture, keepImportedMaterial unchanged from the existing file.)

export function ShipModelVisual({ config, fallback, eliteTint = false }: ShipModelVisualProps): ReactElement {
  const scene = useAsset(config.assetId);

  const normalized = useMemo(() => {
    if (!scene) return null;
    return normalizeShipScene(scene, config.targetLength, config.materialPreset);
  }, [config.materialPreset, config.targetLength, scene]);

  const withElite = useMemo(() => {
    if (!normalized) return null;
    if (!eliteTint) return normalized;
    const root = clone(normalized) as THREE.Group;
    applyEliteShipTint(root);
    return root;
  }, [normalized, eliteTint]);

  if (!withElite) return <>{fallback}</>;

  const forwardAxis = config.forwardAxis ?? "positiveZ";
  const rotationY = FORWARD_AXIS_ROTATION_Y[forwardAxis] + (config.rotationOffsetY ?? 0);
  const offset = config.positionOffset ?? [0, 0, 0];

  return (
    <group position={offset} rotation={[0, rotationY, 0]}>
      <primitive object={withElite} />
    </group>
  );
}
```

- [ ] **Step 2: Update the enemy ship config references**

Any component constructing a `ShipModelConfig` (search for `ShipModelConfig = {`) with `candidatePaths` or `path` must be rewritten to use `assetId`. For example, an enemy ship config becomes:

```typescript
const ENEMY_BASIC_CONFIG: ShipModelConfig = {
  assetId: "enemyShipBasic",
  targetLength: 2.4,
  forwardAxis: "positiveZ",
  rotationOffsetY: Math.PI / 2,
};
```

Run: `grep -rn 'candidatePaths\|ShipModelConfig' src/` to find all usage. Update each.

- [ ] **Step 3: Verify type-check**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 4: Smoke-test in dev**

Run: `npm run dev`
Expected: player + enemy ships render with models (once critical+biome loads complete). Before biome loads, enemy ships show their primitive-mesh fallback.

- [ ] **Step 5: Commit**

```bash
git add src/scene/models/ShipModelVisual.tsx
git commit -m "feat(assets): migrate ShipModelVisual to registry.useAsset"
```

---

## Task 11: Migrate `GltfMeshyProp` to registry

**Files:**
- Modify: `src/scene/arcade/props/GltfMeshyProp.tsx`
- Modify: `src/scene/arcade/props/meshyUrls.ts`
- Modify: `src/scene/arcade/WaterArena.tsx` — update prop dispatches to pass asset ids

- [ ] **Step 1: Read current GltfMeshyProp**

Run: `cat src/scene/arcade/props/GltfMeshyProp.tsx`
Note how it currently takes a `url` prop and a fallback child. We'll replace `url` with `assetId`.

- [ ] **Step 2: Rewrite `GltfMeshyProp.tsx`**

```tsx
import type { ReactElement, ReactNode } from "react";
import { useMemo } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useAsset } from "../../../assets/registry";

interface GltfMeshyPropProps {
  assetId: string;
  scale?: number;
  yOff?: number;
  children: ReactNode; // primitive-mesh fallback
}

function normalizeProp(scene: THREE.Group, scale: number): THREE.Group {
  const root = clone(scene) as THREE.Group;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const targetSize = 2.0 * scale;
  const scalar = targetSize / maxDim;
  root.scale.setScalar(scalar);
  root.position.set(-center.x * scalar, -box.min.y * scalar, -center.z * scalar);
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      (obj as THREE.Mesh).castShadow = true;
      (obj as THREE.Mesh).receiveShadow = true;
    }
  });
  return root;
}

export function GltfMeshyProp({ assetId, scale = 1, yOff = 0, children }: GltfMeshyPropProps): ReactElement {
  const scene = useAsset(assetId);
  const normalized = useMemo(() => (scene ? normalizeProp(scene, scale) : null), [scene, scale]);
  if (!normalized) return <>{children}</>;
  return (
    <group position={[0, yOff, 0]}>
      <primitive object={normalized} />
    </group>
  );
}
```

- [ ] **Step 3: Update `meshyUrls.ts` to export asset ids instead of paths**

Replace the file:

```typescript
// Asset ids for prop GLBs — consumed by GltfMeshyProp.
// Ids resolve to paths via src/assets/manifest.ts.

export const MESHY_PROP = {
  navBuoy: "propBuoy",
  barrel: "propBarrel",
  tropicalIsland: "propIsland",
  crystal: "propCrystal",
  palm: "propPalm",
} as const;
```

- [ ] **Step 4: Update `WaterArena.tsx` call sites**

In `src/scene/arcade/WaterArena.tsx`, every `<GltfMeshyProp url={MESHY_PROP.xxx} …>` becomes `<GltfMeshyProp assetId={MESHY_PROP.xxx} …>`. Replace all occurrences:

```bash
grep -n 'url={MESHY_PROP' src/scene/arcade/WaterArena.tsx
```

Then edit each line, changing `url=` to `assetId=`.

- [ ] **Step 5: Smoke-test**

Run: `npm run dev`
Expected: props render when their tier has loaded; before that, the primitive-mesh fallback shows — no console errors.

- [ ] **Step 6: Verify size gate still passes**

Run: `npm run assets:size-check`
Expected: OK.

- [ ] **Step 7: Commit**

```bash
git add src/scene/arcade/props/GltfMeshyProp.tsx src/scene/arcade/props/meshyUrls.ts src/scene/arcade/WaterArena.tsx
git commit -m "feat(assets): migrate GltfMeshyProp + MESHY_PROP to asset ids"
```

---

# PHASE 2A — Post-Processing & HUD Polish

## Task 12: Install `@react-three/postprocessing` and add `PostFxPulse` plumbing

**Files:**
- Modify: `package.json`
- Modify: `src/game/systems/upgrades.ts` (add helper)

- [ ] **Step 1: Install the library**

```bash
npm install @react-three/postprocessing postprocessing
```

- [ ] **Step 2: Verify install**

Run: `grep '@react-three/postprocessing' package.json`
Expected: entry appears in `dependencies`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @react-three/postprocessing"
```

---

## Task 13: `PostFxPulse` tick + decay (TDD)

**Files:**
- Modify: `src/game/useGameState.ts`
- Create: `src/game/useGameState.postFx.test.ts`

- [ ] **Step 1: Write failing test for pulse decay**

Create `src/game/useGameState.postFx.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { decayPostFxPulse } from "./useGameState";
import type { PostFxPulse } from "./types";

describe("decayPostFxPulse", () => {
  it("returns null when input is null", () => {
    expect(decayPostFxPulse(null, 0.016)).toBeNull();
  });

  it("decreases remaining by delta", () => {
    const p: PostFxPulse = { effect: "chromaticAb", remaining: 0.2, duration: 0.2 };
    const next = decayPostFxPulse(p, 0.05);
    expect(next?.remaining).toBeCloseTo(0.15, 5);
    expect(next?.duration).toBe(0.2);
  });

  it("returns null once remaining reaches or drops below zero", () => {
    const p: PostFxPulse = { effect: "chromaticAb", remaining: 0.01, duration: 0.2 };
    expect(decayPostFxPulse(p, 0.05)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- useGameState.postFx`
Expected: FAIL — "decayPostFxPulse is not exported".

- [ ] **Step 3: Add the helper and wire it into `tick`**

In `src/game/useGameState.ts`, above the exported `useGameState` function, add:

```typescript
export function decayPostFxPulse(pulse: GameSnapshot["postFxPulse"], delta: number): GameSnapshot["postFxPulse"] {
  if (!pulse) return null;
  const remaining = pulse.remaining - delta;
  if (remaining <= 0) return null;
  return { ...pulse, remaining };
}
```

And inside the `tick` callback, near the existing `visualEffects` decay loop, insert:

```typescript
state.postFxPulse = decayPostFxPulse(state.postFxPulse, delta);
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm run test -- useGameState.postFx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/useGameState.ts src/game/useGameState.postFx.test.ts
git commit -m "feat(state): decay postFxPulse per tick"
```

---

## Task 14: `<PostFX>` composer with bloom + vignette + tonemapping

**Files:**
- Create: `src/scene/postfx/PostFX.tsx`
- Modify: `src/scene/GameScene.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction, KernelSize } from "postprocessing";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import type { PostFxPulse } from "../../game/types";
import { Vector2 } from "three";

export type PostFxQuality = "full" | "lite" | "off";

interface PostFXProps {
  quality: PostFxQuality;
  pulse: PostFxPulse | null;
}

export function PostFX({ quality, pulse }: PostFXProps): React.ReactElement | null {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl]);

  if (quality === "off") return null;

  // Chromatic-aberration offset scales with pulse progress (fades out).
  const abIntensity =
    pulse && pulse.effect === "chromaticAb" ? (pulse.remaining / pulse.duration) * 0.004 : 0;

  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.2}
        mipmapBlur
        kernelSize={KernelSize.MEDIUM}
      />
      {quality === "full" ? (
        <>
          <ChromaticAberration
            offset={new Vector2(abIntensity, abIntensity)}
            radialModulation={false}
            modulationOffset={0}
            blendFunction={BlendFunction.NORMAL}
          />
          <Vignette eskil={false} offset={0.35} darkness={0.55} />
        </>
      ) : null}
    </EffectComposer>
  );
}
```

- [ ] **Step 2: Mount `<PostFX>` inside `<Canvas>`**

In `src/scene/GameScene.tsx`, import `PostFX` and add inside the `<Canvas>` JSX (as the last child, after all meshes):

```tsx
import { PostFX } from "./postfx/PostFX";

// ... inside the Canvas at the bottom:
<PostFX quality="full" pulse={snapshot.postFxPulse} />
```

For now, hard-code `quality="full"`. Auto-downgrade comes in Task 15.

- [ ] **Step 3: Smoke-test**

Run: `npm run dev`
Expected: bloom visible on emissive pickups and water; vignette subtly darkens corners; no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/postfx/PostFX.tsx src/scene/GameScene.tsx
git commit -m "feat(postfx): add bloom + chromatic-ab + vignette composer"
```

---

## Task 15: Quality toggle + auto-downgrade (TDD for fps tracker)

**Files:**
- Create: `src/scene/postfx/qualityController.ts`
- Create: `src/scene/postfx/qualityController.test.ts`
- Modify: `src/scene/GameScene.tsx`

- [ ] **Step 1: Write failing test for the fps tracker**

Create `src/scene/postfx/qualityController.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createQualityController, type PostFxQuality } from "./qualityController";

function run(fps: number, seconds: number, starting: PostFxQuality = "full", override?: PostFxQuality) {
  const qc = createQualityController({ initial: starting, override });
  const frameDelta = 1 / fps;
  const steps = Math.ceil(fps * seconds);
  let last: PostFxQuality = starting;
  for (let i = 0; i < steps; i++) last = qc.update(frameDelta);
  return last;
}

describe("qualityController auto-downgrade", () => {
  it("stays on 'full' when fps is healthy", () => {
    expect(run(60, 5)).toBe("full");
  });

  it("drops full → lite after >3 s under 50 fps", () => {
    expect(run(45, 4)).toBe("lite");
  });

  it("drops lite → off after >3 s under 35 fps", () => {
    expect(run(30, 4, "lite")).toBe("off");
  });

  it("never downgrades on brief dips (1 s at 30 fps)", () => {
    const qc = createQualityController({ initial: "full" });
    for (let i = 0; i < 30; i++) qc.update(1 / 30); // 1 s at 30 fps
    for (let i = 0; i < 60; i++) qc.update(1 / 60); // back to 60 fps
    expect(qc.current()).toBe("full");
  });

  it("respects an override, skipping auto-downgrade", () => {
    expect(run(20, 10, "full", "off")).toBe("off");
    expect(run(20, 10, "full", "full")).toBe("full");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- qualityController`
Expected: FAIL — "Cannot find module './qualityController'".

- [ ] **Step 3: Implement `qualityController`**

```typescript
import type { PostFxQuality } from "./PostFX";

export type { PostFxQuality };

export interface QualityControllerOptions {
  initial: PostFxQuality;
  override?: PostFxQuality;
}

export interface QualityController {
  update(delta: number): PostFxQuality;
  current(): PostFxQuality;
}

/**
 * Tracks rolling avg fps over a 3 s window. Downgrades:
 *   full → lite when avg < 50 fps sustained 3 s
 *   lite → off  when avg < 35 fps sustained 3 s
 * Never upgrades back — downgrades are one-way per session.
 */
export function createQualityController(options: QualityControllerOptions): QualityController {
  let current: PostFxQuality = options.initial;

  const WINDOW_SEC = 3;
  let windowElapsed = 0;
  let frameCount = 0;

  const update = (delta: number): PostFxQuality => {
    if (options.override !== undefined) {
      current = options.override;
      return current;
    }
    windowElapsed += delta;
    frameCount += 1;
    if (windowElapsed >= WINDOW_SEC) {
      const avgFps = frameCount / windowElapsed;
      if (current === "full" && avgFps < 50) current = "lite";
      else if (current === "lite" && avgFps < 35) current = "off";
      windowElapsed = 0;
      frameCount = 0;
    }
    return current;
  };

  return { update, current: () => current };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test -- qualityController`
Expected: PASS.

- [ ] **Step 5: Wire controller into GameScene**

In `src/scene/GameScene.tsx`, add an inner `QualityManager` component that lives inside `<Canvas>` (so it can use `useFrame`):

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { createQualityController, type PostFxQuality } from "./postfx/qualityController";

function getOverrideFromURL(): PostFxQuality | undefined {
  if (typeof window === "undefined") return undefined;
  const p = new URLSearchParams(window.location.search).get("fx");
  if (p === "full" || p === "lite" || p === "off") return p;
  return undefined;
}

function QualityManager({ onChange }: { onChange: (q: PostFxQuality) => void }): null {
  const ctrlRef = useRef(createQualityController({ initial: "full", override: getOverrideFromURL() }));
  useFrame((_state, delta) => {
    const q = ctrlRef.current.update(delta);
    onChange(q);
  });
  return null;
}
```

Then inside the GameScene component, above the `<Canvas>`:

```tsx
const [quality, setQuality] = useState<PostFxQuality>("full");
```

And inside the `<Canvas>`:

```tsx
<QualityManager onChange={setQuality} />
{/* ... */}
<PostFX quality={quality} pulse={snapshot.postFxPulse} />
```

- [ ] **Step 6: Smoke-test with override**

Run: `npm run dev`
- Visit `http://localhost:5173/?fx=off` — bloom should disappear.
- Visit `http://localhost:5173/?fx=lite` — vignette + chromatic-ab disappear; bloom stays.
- Visit `http://localhost:5173/?fx=full` — everything on.

- [ ] **Step 7: Commit**

```bash
git add src/scene/postfx/qualityController.ts src/scene/postfx/qualityController.test.ts src/scene/GameScene.tsx
git commit -m "feat(postfx): URL override + auto-downgrade on low fps"
```

---

## Task 16: `useTweenedValue` hook (TDD)

**Files:**
- Create: `src/ui/useTweenedValue.ts`
- Create: `src/ui/useTweenedValue.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { stepTween } from "./useTweenedValue";

describe("stepTween", () => {
  it("returns target when delta equals or exceeds duration", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0.2, duration: 0.15 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(true);
  });

  it("eases out toward target", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0.075, duration: 0.15 });
    expect(next.value).toBeGreaterThan(50);  // ease-out biases toward target
    expect(next.value).toBeLessThan(100);
    expect(next.done).toBe(false);
  });

  it("handles zero duration", () => {
    const next = stepTween({ current: 0, target: 100, elapsed: 0, duration: 0 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(true);
  });

  it("works with negative deltas (clamps)", () => {
    const next = stepTween({ current: 100, target: 0, elapsed: -1, duration: 0.15 });
    expect(next.value).toBe(100);
    expect(next.done).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm run test -- useTweenedValue`
Expected: FAIL.

- [ ] **Step 3: Implement the hook + pure helper**

```typescript
import { useEffect, useRef, useState } from "react";

export interface StepTweenInput {
  current: number;
  target: number;
  elapsed: number;
  duration: number;
}

export interface StepTweenResult {
  value: number;
  done: boolean;
}

// Ease-out cubic.
function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

export function stepTween({ current, target, elapsed, duration }: StepTweenInput): StepTweenResult {
  if (duration <= 0 || elapsed >= duration) return { value: target, done: true };
  if (elapsed < 0) return { value: current, done: false };
  const t = easeOut(elapsed / duration);
  return { value: current + (target - current) * t, done: false };
}

/**
 * Returns a value that tweens toward `target` over `durationMs` with ease-out.
 * When `target` changes, the tween restarts from the current rendered value.
 */
export function useTweenedValue(target: number, durationMs = 150): number {
  const [value, setValue] = useState(target);
  const startRef = useRef<{ from: number; target: number; startedAt: number }>({
    from: target,
    target,
    startedAt: performance.now(),
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = { from: value, target, startedAt: performance.now() };
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const frame = (now: number) => {
      const elapsed = (now - startRef.current.startedAt) / 1000;
      const res = stepTween({
        current: startRef.current.from,
        target: startRef.current.target,
        elapsed,
        duration: durationMs / 1000,
      });
      setValue(res.value);
      if (!res.done) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- useTweenedValue`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useTweenedValue.ts src/ui/useTweenedValue.test.ts
git commit -m "feat(ui): useTweenedValue hook + ease-out helper"
```

---

## Task 17: HUD primitives — `AnimatedNumber`, `PulseMeter`, `XPBar`, `LevelPill`, `BiomeBadge`, `BossFrame`

**Files:**
- Create: `src/ui/AnimatedNumber.tsx`
- Create: `src/ui/PulseMeter.tsx`
- Create: `src/ui/XPBar.tsx`
- Create: `src/ui/LevelPill.tsx`
- Create: `src/ui/BiomeBadge.tsx`
- Create: `src/ui/BossFrame.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS keyframes and classes for all new primitives**

Append to `src/styles.css`:

```css
/* Animated HUD primitives */

.pulse-meter {
  width: 100%;
  height: 10px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.pulse-meter-fill {
  height: 100%;
  transition: width 120ms ease-out, background 100ms linear;
  border-radius: 5px;
}

.pulse-meter.ready .pulse-meter-fill {
  box-shadow: 0 0 10px currentColor;
  animation: pulse-glow 0.9s ease-in-out infinite alternate;
}

@keyframes pulse-glow {
  from { filter: brightness(1); }
  to   { filter: brightness(1.5); }
}

.pulse-meter.damage-flash {
  animation: damage-flash 180ms ease-out;
}

@keyframes damage-flash {
  0%   { background: rgba(255, 80, 80, 0.7); }
  100% { background: rgba(0, 0, 0, 0.35); }
}

/* XP bar */
.xp-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: rgba(0, 0, 0, 0.5);
  z-index: 30;
}

.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffe16b 0%, #ff9a3c 100%);
  box-shadow: 0 0 8px #ffd27a;
  transition: width 150ms ease-out;
}

.xp-bar.level-up .xp-bar-fill {
  animation: xp-sweep 480ms ease-out;
}

@keyframes xp-sweep {
  0%   { filter: brightness(1); }
  40%  { filter: brightness(2.5) saturate(1.5); }
  100% { filter: brightness(1); }
}

/* Level pill */
.level-pill {
  position: fixed;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #ff9a3c, #ff5577);
  color: #fff;
  font-weight: 800;
  font-size: 22px;
  padding: 8px 16px;
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(255, 100, 80, 0.4);
  letter-spacing: 1px;
  font-family: "Luckiest Guy", system-ui, sans-serif;
  transition: transform 160ms ease-out;
}

.level-pill.bump {
  animation: level-bump 360ms ease-out;
}

@keyframes level-bump {
  0%   { transform: scale(1); }
  30%  { transform: scale(1.3) rotate(-3deg); }
  100% { transform: scale(1); }
}

/* Biome badge */
.biome-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(40, 60, 90, 0.7);
  color: #a8d8e0;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.biome-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

/* Boss frame */
.boss-frame {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  text-align: center;
  padding: 8px 12px;
  background: rgba(20, 10, 20, 0.75);
  border: 2px solid #ff2020;
  border-radius: 6px;
  box-shadow: 0 0 24px rgba(255, 32, 32, 0.6);
}

.boss-frame .boss-title {
  color: #ff6060;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 3px;
  text-shadow: 1px 1px 2px black;
  margin-bottom: 4px;
  font-family: "Luckiest Guy", system-ui, sans-serif;
}

.boss-frame .boss-bar {
  height: 16px;
  background: #1a0505;
  border-radius: 3px;
  overflow: hidden;
}

.boss-frame .boss-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff2020 0%, #ff7a3a 100%);
  transition: width 150ms ease-out;
}
```

- [ ] **Step 2: Create `AnimatedNumber.tsx`**

```tsx
import type { ReactElement } from "react";
import { useTweenedValue } from "./useTweenedValue";

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
}

export function AnimatedNumber({ value, durationMs = 150, format }: AnimatedNumberProps): ReactElement {
  const shown = useTweenedValue(value, durationMs);
  const display = format ? format(shown) : Math.floor(shown).toLocaleString();
  return <>{display}</>;
}
```

- [ ] **Step 3: Create `PulseMeter.tsx`**

```tsx
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface PulseMeterProps {
  value: number;       // 0..1
  color: string;
  ready?: boolean;     // show pulse-glow when full/ready
  damageSignal?: number;  // increment this prop when damage is taken to fire a flash
}

export function PulseMeter({ value, color, ready, damageSignal }: PulseMeterProps): ReactElement {
  const [flashing, setFlashing] = useState(false);
  const lastSignal = useRef(damageSignal ?? 0);
  useEffect(() => {
    if (damageSignal === undefined) return;
    if (damageSignal !== lastSignal.current) {
      lastSignal.current = damageSignal;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 180);
      return () => clearTimeout(t);
    }
  }, [damageSignal]);

  const classes = `pulse-meter ${ready ? "ready" : ""} ${flashing ? "damage-flash" : ""}`;
  return (
    <div className={classes} style={{ color }}>
      <div className="pulse-meter-fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}
```

- [ ] **Step 4: Create `XPBar.tsx`**

```tsx
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

interface XPBarProps {
  /** Fraction toward next level, 0..1 */
  progress: number;
  /** Current level — used to detect level-up and trigger sweep animation */
  level: number;
}

export function XPBar({ progress, level }: XPBarProps): ReactElement {
  const [sweeping, setSweeping] = useState(false);
  useEffect(() => {
    if (level === 0) return;
    setSweeping(true);
    const t = setTimeout(() => setSweeping(false), 480);
    return () => clearTimeout(t);
  }, [level]);
  return (
    <div className={`xp-bar ${sweeping ? "level-up" : ""}`}>
      <div className="xp-bar-fill" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
    </div>
  );
}
```

- [ ] **Step 5: Create `LevelPill.tsx`**

```tsx
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

interface LevelPillProps {
  level: number;
}

export function LevelPill({ level }: LevelPillProps): ReactElement {
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (level === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 360);
    return () => clearTimeout(t);
  }, [level]);
  return <div className={`level-pill ${bump ? "bump" : ""}`}>LV {level}</div>;
}
```

- [ ] **Step 6: Create `BiomeBadge.tsx`**

```tsx
import type { ReactElement } from "react";
import type { BiomeType } from "../game/types";

const BIOME_COLOR: Record<BiomeType, string> = {
  open_sea: "#a8d8e0",
  island_chain: "#ffe16b",
  deep_waters: "#9a7bff",
  boss_storm: "#ff6060",
};

function formatBiomeName(biome: string): string {
  return biome.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface BiomeBadgeProps {
  biome: BiomeType;
}

export function BiomeBadge({ biome }: BiomeBadgeProps): ReactElement {
  return (
    <div className="biome-badge" style={{ color: BIOME_COLOR[biome] }}>
      <div className="dot" />
      {formatBiomeName(biome)}
    </div>
  );
}
```

- [ ] **Step 7: Create `BossFrame.tsx`**

```tsx
import type { ReactElement } from "react";
import type { EnemyState } from "../game/types";

interface BossFrameProps {
  boss: EnemyState;
}

export function BossFrame({ boss }: BossFrameProps): ReactElement {
  const pct = Math.max(0, Math.min(1, boss.hp / boss.maxHp));
  return (
    <div className="boss-frame">
      <div className="boss-title">⚔  PIRATE LORD  ⚔</div>
      <div className="boss-bar">
        <div className="boss-bar-fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/ui/AnimatedNumber.tsx src/ui/PulseMeter.tsx src/ui/XPBar.tsx src/ui/LevelPill.tsx src/ui/BiomeBadge.tsx src/ui/BossFrame.tsx src/styles.css
git commit -m "feat(ui): HUD primitives — XPBar, LevelPill, PulseMeter, BiomeBadge, BossFrame, AnimatedNumber"
```

---

## Task 18: Rewrite `Hud.tsx` to use new primitives

**Files:**
- Modify: `src/ui/Hud.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Append HUD layout CSS**

Append to `src/styles.css`:

```css
.hud-v2 {
  position: fixed;
  inset: 0;
  pointer-events: none;
  padding: 32px 16px 16px 16px; /* top 32 to clear XP bar */
}

.hud-v2-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
  pointer-events: none;
}

.hud-v2-corner.top-left   { top: 60px; left: 12px; }
.hud-v2-corner.top-right  { top: 16px; right: 12px; align-items: flex-end; }
.hud-v2-corner.bottom-left{ bottom: 12px; left: 12px; }

.hud-v2-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: system-ui, sans-serif;
  color: #e2ecf0;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
}

.hud-v2-big {
  font-family: "Luckiest Guy", system-ui, sans-serif;
  font-size: 22px;
  letter-spacing: 1px;
}

.hud-v2-hp-bar { width: 180px; }
.hud-v2-ability-bar { width: 140px; }
```

- [ ] **Step 2: Replace `src/ui/Hud.tsx`**

```tsx
import type { ReactElement } from "react";
import { useRef } from "react";
import type { GameSnapshot } from "../game/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { BiomeBadge } from "./BiomeBadge";
import { BossFrame } from "./BossFrame";
import { LevelPill } from "./LevelPill";
import { PulseMeter } from "./PulseMeter";
import { XPBar } from "./XPBar";

interface HudProps {
  snapshot: GameSnapshot;
}

function cooldownPercent(remaining: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remaining / duration));
}

export function Hud({ snapshot }: HudProps): ReactElement {
  const prevHp = useRef(snapshot.player.hp);
  const damageSignal = useRef(0);
  if (snapshot.player.hp < prevHp.current - 1) damageSignal.current += 1;
  prevHp.current = snapshot.player.hp;

  const hpRatio = snapshot.player.hp / snapshot.player.maxHp;
  const cannonReady = snapshot.cooldowns.cannonRemaining <= 0;
  const boostReady = snapshot.cooldowns.boostRemaining <= 0;
  const xpProgress = snapshot.upgrades.nextThreshold > 0
    ? Math.min(1, snapshot.stats.collectedCoins / snapshot.upgrades.nextThreshold)
    : 0;
  const boss = snapshot.enemies.find((e) => e.type === "boss");

  return (
    <>
      <XPBar progress={xpProgress} level={snapshot.upgrades.level} />
      <LevelPill level={snapshot.upgrades.level} />

      <div className="hud-v2">
        <div className="hud-v2-corner top-right">
          <BiomeBadge biome={snapshot.runBiome} />
          <div className="hud-v2-row hud-v2-big">
            <AnimatedNumber value={snapshot.stats.score} />
          </div>
          <div className="hud-v2-row">
            <span>TIME {snapshot.stats.timeSurvived.toFixed(1)}s</span>
            <span>KILLS <AnimatedNumber value={snapshot.stats.enemiesKilled} /></span>
            <span>COINS <AnimatedNumber value={snapshot.stats.collectedCoins} /></span>
          </div>
        </div>

        <div className="hud-v2-corner bottom-left">
          <div className="hud-v2-row">
            <span>HP {Math.ceil(snapshot.player.hp)}</span>
            <div className="hud-v2-hp-bar">
              <PulseMeter value={hpRatio} color={hpRatio > 0.3 ? "#4ade80" : "#ff6060"} damageSignal={damageSignal.current} />
            </div>
          </div>
          <div className="hud-v2-row">
            <span>Q CANNON</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.cannonRemaining, snapshot.cooldowns.cannonDuration)} color="#ffcc66" ready={cannonReady} />
            </div>
          </div>
          <div className="hud-v2-row">
            <span>SPACE BOOST</span>
            <div className="hud-v2-ability-bar">
              <PulseMeter value={cooldownPercent(snapshot.cooldowns.boostRemaining, snapshot.cooldowns.boostDuration)} color="#88ddff" ready={boostReady} />
            </div>
          </div>
        </div>
      </div>

      {boss ? <BossFrame boss={boss} /> : null}

      {snapshot.message ? <div className="toast">{snapshot.message.text}</div> : null}
    </>
  );
}
```

- [ ] **Step 3: Smoke-test in dev**

Run: `npm run dev`
Expected: XP bar at top, Level pill at top-left, biome/score/time at top-right, HP + abilities at bottom-left. Level pill bumps on upgrade. Taking damage flashes the HP bar red.

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Hud.tsx src/styles.css
git commit -m "feat(ui): rewrite HUD with animated primitives; move XP bar to top-full-width"
```

---

## Task 19: Load display font at critical tier

**Files:**
- Modify: `src/assets/manifest.ts`
- Modify: `src/assets/AssetPreloader.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add font CSS import**

Prepend to `src/styles.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');
```

(Google Fonts' `display=swap` ensures the fallback renders first if the font hasn't loaded yet — the HUD upgrades to the display font as soon as it arrives.)

- [ ] **Step 2: Smoke-test**

Run: `npm run dev`
Expected: Level pill and boss title render in Luckiest Guy. Before font loads, system sans shows.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(ui): load Luckiest Guy display font with swap"
```

---

# PHASE 2B — Upgrade Moment & Audio

## Task 20: Remove sim-pause during `upgrade` phase (TDD)

**Files:**
- Create: `src/game/useGameState.upgrade.test.ts`
- Modify: `src/game/useGameState.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { shouldAdvanceSimThisTick } from "./useGameState";

describe("shouldAdvanceSimThisTick", () => {
  it("advances during playing", () => {
    expect(shouldAdvanceSimThisTick("playing")).toBe(true);
  });
  it("advances during upgrade (no sim-pause)", () => {
    expect(shouldAdvanceSimThisTick("upgrade")).toBe(true);
  });
  it("does not advance during paused, loading, start, or gameover", () => {
    expect(shouldAdvanceSimThisTick("paused")).toBe(false);
    expect(shouldAdvanceSimThisTick("loading")).toBe(false);
    expect(shouldAdvanceSimThisTick("start")).toBe(false);
    expect(shouldAdvanceSimThisTick("gameover")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- useGameState.upgrade`
Expected: FAIL.

- [ ] **Step 3: Implement the helper + use it in `tick`**

Add to `src/game/useGameState.ts` above `useGameState`:

```typescript
export function shouldAdvanceSimThisTick(phase: GameSnapshot["phase"]): boolean {
  return phase === "playing" || phase === "upgrade";
}
```

Replace the early-return in `tick`:

```typescript
    if (!shouldAdvanceSimThisTick(state.phase)) {
      syncState();
      return;
    }
```

- [ ] **Step 4: Guard upgrade-triggering so we don't re-enter**

In `tick`, the existing `if (state.stats.collectedCoins >= state.upgrades.nextThreshold …)` block can re-fire while already in `upgrade`. Guard it:

```typescript
    if (state.phase === "playing" && (state.stats.collectedCoins >= state.upgrades.nextThreshold || triggerUpgrade)) {
      state.phase = "upgrade";
      state.pendingUpgradeOptions = buildUpgradeChoices(state.upgrades);
      setMessage({ text: "Choose your upgrade", remaining: 99 });
      syncState();
      return;
    }
```

- [ ] **Step 5: Tests pass**

Run: `npm run test -- useGameState`
Expected: PASS.

- [ ] **Step 6: Smoke-test**

Run: `npm run dev`
Expected: when upgrade modal opens, enemies still move — and can damage you. HP bar keeps ticking if an enemy is on top of you.

- [ ] **Step 7: Commit**

```bash
git add src/game/useGameState.ts src/game/useGameState.upgrade.test.ts
git commit -m "feat(state): remove sim-pause during upgrade phase"
```

---

## Task 21: Audio types + `AudioManager` skeleton + `devSynth` (TDD)

**Files:**
- Create: `src/audio/types.ts`
- Create: `src/audio/devSynth.ts`
- Create: `src/audio/AudioManager.ts`
- Create: `src/audio/AudioManager.test.ts`

- [ ] **Step 1: Create types file**

```typescript
import type { SfxId, AmbientId, AudioEvent } from "../game/types";
export type { SfxId, AmbientId, AudioEvent };
```

- [ ] **Step 2: Create `devSynth.ts`**

```typescript
import type { SfxId } from "../game/types";

// Crude but testable — each SFX id maps to a one-shot oscillator envelope.
const RECIPES: Record<SfxId, { freq: number; wave: OscillatorType; durationMs: number; sweepTo?: number }> = {
  cannon_fire:            { freq: 120,  wave: "sawtooth", durationMs: 200, sweepTo: 60 },
  hit:                    { freq: 220,  wave: "square",   durationMs: 150 },
  pickup:                 { freq: 660,  wave: "sine",     durationMs: 100, sweepTo: 1320 },
  upgrade_sting:          { freq: 440,  wave: "sine",     durationMs: 500, sweepTo: 880 },
  boss_cue:               { freq: 80,   wave: "sawtooth", durationMs: 1000 },
  damage_taken:           { freq: 180,  wave: "square",   durationMs: 150, sweepTo: 90 },
  ship_destroyed:         { freq: 100,  wave: "sawtooth", durationMs: 400, sweepTo: 40 },
  harvestable_destroyed:  { freq: 300,  wave: "triangle", durationMs: 300, sweepTo: 450 },
};

export function playSynth(ctx: AudioContext, dest: AudioNode, sfx: SfxId, volume = 1, pitch = 1): void {
  const recipe = RECIPES[sfx];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = recipe.wave;
  osc.frequency.value = recipe.freq * pitch;
  if (recipe.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, recipe.sweepTo * pitch),
      ctx.currentTime + recipe.durationMs / 1000
    );
  }
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3 * volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + recipe.durationMs / 1000);
  osc.connect(gain).connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + recipe.durationMs / 1000 + 0.05);
}
```

- [ ] **Step 3: Write failing test for AudioManager queue drain**

Create `src/audio/AudioManager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAudioManager } from "./AudioManager";
import type { AudioEvent } from "../game/types";

function makeFakeAudioContext() {
  const played: string[] = [];
  const gainNode = { gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn().mockReturnThis() };
  const osc = { type: "sine", frequency: { value: 0, exponentialRampToValueAtTime: vi.fn() }, connect: () => gainNode, start: vi.fn(), stop: vi.fn() };
  return {
    currentTime: 0,
    createGain: () => ({ ...gainNode, connect: vi.fn().mockReturnThis() }),
    createOscillator: () => osc,
    destination: { connect: vi.fn() },
    played,
  };
}

describe("AudioManager", () => {
  let fakeCtx: ReturnType<typeof makeFakeAudioContext>;
  beforeEach(() => { fakeCtx = makeFakeAudioContext(); });

  it("drain empties the queue", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    const queue: AudioEvent[] = [
      { id: 1, sfx: "pickup" },
      { id: 2, sfx: "hit" },
    ];
    mgr.drain(queue);
    expect(queue.length).toBe(0);
  });

  it("drain ignores empty queue safely", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    expect(() => mgr.drain([])).not.toThrow();
  });

  it("setMasterVolume clamps to [0, 1]", () => {
    const mgr = createAudioManager(fakeCtx as unknown as AudioContext);
    mgr.setMasterVolume(2);   // should clamp to 1
    expect(mgr.getMasterVolume()).toBe(1);
    mgr.setMasterVolume(-0.5); // should clamp to 0
    expect(mgr.getMasterVolume()).toBe(0);
  });
});
```

- [ ] **Step 4: Run — expect FAIL**

Run: `npm run test -- AudioManager`
Expected: FAIL — "Cannot find module './AudioManager'".

- [ ] **Step 5: Implement `AudioManager.ts`**

```typescript
import type { AudioEvent } from "../game/types";
import { playSynth } from "./devSynth";

export interface AudioManager {
  drain(queue: AudioEvent[]): void;
  setMasterVolume(v: number): void;
  getMasterVolume(): number;
  ambient(id: "sea_bed" | "boss_bed", fadeMs?: number): void;
  stopAmbient(fadeMs?: number): void;
}

export function createAudioManager(ctx: AudioContext): AudioManager {
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.5;
  musicBus.connect(master);

  let currentAmbient: AudioBufferSourceNode | null = null;

  return {
    drain(queue) {
      while (queue.length > 0) {
        const ev = queue.shift();
        if (!ev) break;
        // Always use devSynth for now. Real .ogg files replace this in a follow-up.
        playSynth(ctx, sfxBus, ev.sfx, ev.volume ?? 1, ev.pitch ?? 1);
      }
    },
    setMasterVolume(v) {
      const clamped = Math.min(1, Math.max(0, v));
      master.gain.value = clamped;
    },
    getMasterVolume() { return master.gain.value; },
    ambient(_id, _fadeMs) {
      // Placeholder. devSynth can't easily loop; real impl arrives with .ogg bank.
    },
    stopAmbient(_fadeMs) {
      if (currentAmbient) {
        try { currentAmbient.stop(); } catch { /* already stopped */ }
        currentAmbient = null;
      }
    },
  };
}
```

- [ ] **Step 6: Run tests — expect PASS**

Run: `npm run test -- AudioManager`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/audio/types.ts src/audio/devSynth.ts src/audio/AudioManager.ts src/audio/AudioManager.test.ts
git commit -m "feat(audio): AudioManager + devSynth placeholder tones"
```

---

## Task 22: Wire `AudioManager` to `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Mount manager and drain per-frame**

In `src/App.tsx`, add above the existing rAF effect:

```tsx
import { useMemo, useRef } from "react";
import { createAudioManager } from "./audio/AudioManager";

// Inside the App component, near the top:
const audioCtxRef = useRef<AudioContext | null>(null);
const audioMgrRef = useRef<ReturnType<typeof createAudioManager> | null>(null);

// Lazy-init on first user gesture (required by browsers for autoplay policy).
useEffect(() => {
  const kick = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      audioMgrRef.current = createAudioManager(ctx);
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };
  window.addEventListener("keydown", kick, { once: false });
  window.addEventListener("pointerdown", kick, { once: false });
  return () => {
    window.removeEventListener("keydown", kick);
    window.removeEventListener("pointerdown", kick);
  };
}, []);
```

Inside the per-frame `tick` effect, drain events:

```tsx
useEffect(() => {
  let raf = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(delta);
    const mgr = audioMgrRef.current;
    if (mgr) mgr.drain(snapshot.audioEvents); // drains in-place
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}, [tick, snapshot.audioEvents]);
```

Note: `snapshot.audioEvents` is mutated in-place by the manager. Next tick's `syncState` will then produce a copy with an empty list.

- [ ] **Step 2: Smoke-test**

Run: `npm run dev`
Expected: no audio yet (no events emitted). No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(audio): mount AudioManager on first user gesture; drain per frame"
```

---

## Task 23: Gameplay systems emit audio events (TDD on upgrades)

**Files:**
- Modify: `src/game/useGameState.ts`
- Modify: `src/game/systems/collision.ts`
- Modify: `src/game/systems/pickups.ts`
- Modify: `src/game/systems/upgrades.ts`
- Create: `src/game/systems/upgrades.test.ts`

- [ ] **Step 1: Write failing test for level-up emits**

Create `src/game/systems/upgrades.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { emitLevelUpEvents } from "./upgrades";
import type { AudioEvent, PostFxPulse, VisualEffect } from "../types";

describe("emitLevelUpEvents", () => {
  it("pushes an upgrade_sting audio event", () => {
    const audio: AudioEvent[] = [];
    const vfx: VisualEffect[] = [];
    const idRef = { value: 1 };
    const pulse = emitLevelUpEvents({ x: 1, y: 2 }, audio, vfx, idRef);
    expect(audio).toHaveLength(1);
    expect(audio[0].sfx).toBe("upgrade_sting");
  });

  it("returns a chromaticAb postFxPulse", () => {
    const pulse = emitLevelUpEvents({ x: 0, y: 0 }, [], [], { value: 1 });
    expect(pulse).toBeTruthy();
    expect(pulse?.effect).toBe("chromaticAb");
    expect(pulse?.remaining).toBeCloseTo(0.2, 3);
  });

  it("pushes screen-shake and hit-burst visual effects", () => {
    const vfx: VisualEffect[] = [];
    const idRef = { value: 1 };
    emitLevelUpEvents({ x: 4, y: 5 }, [], vfx, idRef);
    const kinds = vfx.map((e) => e.kind).sort();
    expect(kinds).toContain("screenShake");
    expect(kinds).toContain("hitBurst");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test -- upgrades`
Expected: FAIL — "emitLevelUpEvents is not exported".

- [ ] **Step 3: Add `emitLevelUpEvents` helper to `src/game/systems/upgrades.ts`**

Append to the file:

```typescript
import type { AudioEvent, PostFxPulse, Vec2, VisualEffect } from "../types";

export function emitLevelUpEvents(
  playerPos: Vec2,
  audio: AudioEvent[],
  vfx: VisualEffect[],
  effectIdRef: { value: number }
): PostFxPulse {
  // Audio sting.
  audio.push({ id: effectIdRef.value++, sfx: "upgrade_sting" });

  // Camera punch — leverages existing screenShake effect.
  vfx.push({
    id: effectIdRef.value++,
    kind: "screenShake",
    position: { x: playerPos.x, y: playerPos.y },
    remaining: 0.14,
  });

  // Radial burst from ship — reuses the existing hitBurst kind for now. A
  // bespoke "radialBurst" VisualEffectKind is a future polish; hitBurst reads
  // visually as a burst already.
  vfx.push({
    id: effectIdRef.value++,
    kind: "hitBurst",
    position: { x: playerPos.x, y: playerPos.y },
    remaining: 0.35,
    color: "#ffe16b",
  });

  return { effect: "chromaticAb", remaining: 0.2, duration: 0.2 };
}
```

- [ ] **Step 4: Wire `emitLevelUpEvents` into `chooseUpgrade`**

In `src/game/useGameState.ts`, replace the `chooseUpgrade` body:

```typescript
const chooseUpgrade = useCallback((type: UpgradeType) => {
  const state = stateRef.current;
  if (state.phase !== "upgrade") return;
  applyUpgrade(state.upgrades, type);
  if (type === "maxHp") {
    state.player.maxHp += 25;
    state.player.hp = state.player.maxHp;
  }
  state.phase = "playing";
  state.pendingUpgradeOptions = [];
  state.postFxPulse = emitLevelUpEvents(
    state.player.position,
    state.audioEvents,
    state.visualEffects,
    effectIdRef.current
  );
  setMessage({ text: `${type} upgraded!`, remaining: 0.8 });
  syncState();
}, [setMessage, syncState]);
```

Import `emitLevelUpEvents`:

```typescript
import { applyUpgrade, buildUpgradeChoices, countEvolutionStacks, emitLevelUpEvents } from "./systems/upgrades";
```

- [ ] **Step 5: Run tests — PASS**

Run: `npm run test -- upgrades`
Expected: PASS.

- [ ] **Step 6: Emit audio events from collision + pickups**

In `src/game/systems/pickups.ts`, find the collection path where `coinsGained` increments. At the point where the loop actually consumes the pickup (accepts the pickup), push an event. Example: at the top of the function, add a parameter:

```typescript
export function processPickups(
  pickups: PickupState[],
  player: PlayerState,
  cooldowns: Cooldowns,
  audioEvents?: AudioEvent[],
  audioIdRef?: { value: number }
): { coinsGained: number; triggerUpgrade: boolean } {
  // … existing code
}
```

At each `pickups.splice(i, 1)` / `coinsGained +=` site, push:

```typescript
if (audioEvents && audioIdRef) {
  audioEvents.push({ id: audioIdRef.value++, sfx: "pickup" });
}
```

Update the caller in `useGameState.ts` `tick`:

```typescript
const { coinsGained, triggerUpgrade } = processPickups(
  state.pickups, state.player, state.cooldowns, state.audioEvents, effectIdRef.current
);
```

Similarly in `src/game/systems/collision.ts` — inside the function that processes projectile-vs-enemy hits, pass through `audioEvents` and push a `hit` event on each hit, `ship_destroyed` when an enemy dies, and `harvestable_destroyed` on harvestable kills. Add `damage_taken` in `useGameState.ts` `tick` where `playerDamageTaken > 0`:

```typescript
if (collisionResult.playerDamageTaken > 0 && state.cooldowns.invulnRemaining <= 0) {
  state.audioEvents.push({ id: effectIdRef.current.value++, sfx: "damage_taken" });
}
```

- [ ] **Step 7: Smoke-test**

Run: `npm run dev`
After first user keydown (to unlock audio), expect synth tones on:
- Picking up coins → a short rising sine
- Getting hit → a square-wave bonk
- Picking an upgrade → a sweeping sting
- Enemy destroyed → a descending saw

- [ ] **Step 8: Commit**

```bash
git add src/game/useGameState.ts src/game/systems/collision.ts src/game/systems/pickups.ts src/game/systems/upgrades.ts src/game/systems/upgrades.test.ts
git commit -m "feat(audio): emit SFX events on hit/pickup/damage/kill/level-up"
```

---

## Task 24: `<ScreenFlash>` UI overlay

**Files:**
- Create: `src/scene/fx/ScreenFlash.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS**

Append to `src/styles.css`:

```css
.screen-flash {
  position: fixed;
  inset: 0;
  background: white;
  pointer-events: none;
  opacity: 0;
  z-index: 80;
}

.screen-flash.fire {
  animation: flash-once 120ms ease-out;
}

@keyframes flash-once {
  0%   { opacity: 0.08; }
  100% { opacity: 0; }
}
```

- [ ] **Step 2: Create the component**

```tsx
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface ScreenFlashProps {
  /** Fire the flash when this value changes (e.g. tie to a counter of levelUp events). */
  signal: number;
}

export function ScreenFlash({ signal }: ScreenFlashProps): ReactElement {
  const last = useRef(signal);
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (signal !== last.current) {
      last.current = signal;
      setFiring(true);
      const t = setTimeout(() => setFiring(false), 140);
      return () => clearTimeout(t);
    }
  }, [signal]);
  return <div className={`screen-flash ${firing ? "fire" : ""}`} />;
}
```

- [ ] **Step 3: Mount and wire to level-up**

In `src/App.tsx`, track a counter of level-up events from the snapshot. A simple way: monotonically increments when `snapshot.upgrades.level` changes.

```tsx
import { ScreenFlash } from "./scene/fx/ScreenFlash";

// near other state:
const levelRef = useRef(0);
const [flashSignal, setFlashSignal] = useState(0);
useEffect(() => {
  if (snapshot.upgrades.level !== levelRef.current) {
    levelRef.current = snapshot.upgrades.level;
    setFlashSignal((n) => n + 1);
  }
}, [snapshot.upgrades.level]);
```

Render inside the main branch (inside the `<>…</>` that holds `GameScene` etc.):

```tsx
<ScreenFlash signal={flashSignal} />
```

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`
Expected: picking an upgrade triggers a brief white flash over the canvas.

- [ ] **Step 5: Commit**

```bash
git add src/scene/fx/ScreenFlash.tsx src/App.tsx src/styles.css
git commit -m "feat(fx): ScreenFlash UI overlay on level-up"
```

---

## Task 25: `<LevelUpRibbon>` UI sweep

**Files:**
- Create: `src/ui/LevelUpRibbon.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS**

Append to `src/styles.css`:

```css
.levelup-ribbon {
  position: fixed;
  top: 42%;
  left: -100%;
  width: 100%;
  padding: 14px 0;
  background: linear-gradient(90deg, transparent 0%, #ff5577 15%, #ffaa33 50%, #ff5577 85%, transparent 100%);
  color: #fff;
  font-family: "Luckiest Guy", system-ui, sans-serif;
  font-size: 46px;
  font-weight: 800;
  letter-spacing: 6px;
  text-align: center;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 90;
  opacity: 0;
  transform: skewY(-2deg);
}

.levelup-ribbon.fire {
  animation: levelup-sweep 480ms ease-out;
}

@keyframes levelup-sweep {
  0%   { left: -100%; opacity: 0; }
  25%  { left: 0%;    opacity: 1; }
  75%  { left: 0%;    opacity: 1; }
  100% { left: 100%;  opacity: 0; }
}
```

- [ ] **Step 2: Create the component**

```tsx
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

interface LevelUpRibbonProps {
  signal: number;
}

export function LevelUpRibbon({ signal }: LevelUpRibbonProps): ReactElement {
  const last = useRef(signal);
  const [firing, setFiring] = useState(false);
  useEffect(() => {
    if (signal !== last.current) {
      last.current = signal;
      setFiring(true);
      const t = setTimeout(() => setFiring(false), 500);
      return () => clearTimeout(t);
    }
  }, [signal]);
  return <div className={`levelup-ribbon ${firing ? "fire" : ""}`}>LEVEL UP!</div>;
}
```

- [ ] **Step 3: Mount in App**

Use the same `flashSignal` pattern from Task 24 (or a second signal tied to the same level-change event):

```tsx
import { LevelUpRibbon } from "./ui/LevelUpRibbon";

// in render:
<LevelUpRibbon signal={flashSignal} />
```

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`
Expected: picking an upgrade fires a "LEVEL UP!" ribbon that sweeps across the middle of the screen.

- [ ] **Step 5: Commit**

```bash
git add src/ui/LevelUpRibbon.tsx src/App.tsx src/styles.css
git commit -m "feat(ui): LevelUpRibbon sweep on upgrade pick"
```

---

## Task 26: Rewrite `UpgradeModal.tsx` with snap in/out + staggered cards

**Files:**
- Modify: `src/ui/UpgradeModal.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add CSS for snap-in cards**

Append to `src/styles.css`:

```css
.upgrade-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 70;
  animation: modal-fade-in 80ms ease-out;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.upgrade-modal-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(14, 24, 40, 0.9);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e2ecf0;
  font-family: system-ui, sans-serif;
}

.upgrade-grid-v2 {
  display: flex;
  gap: 12px;
}

.upgrade-card {
  width: 220px;
  min-height: 140px;
  background: rgba(30, 50, 80, 0.85);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px;
  color: #e2ecf0;
  cursor: pointer;
  text-align: left;
  font-family: system-ui, sans-serif;
  opacity: 0;
  transform: translateY(40px) rotate(-1deg);
  animation: card-flip-in 180ms ease-out forwards;
  transition: transform 90ms ease-out, border-color 90ms linear, box-shadow 90ms linear;
}

.upgrade-card:nth-child(1) { animation-delay: 0ms; }
.upgrade-card:nth-child(2) { animation-delay: 60ms; }
.upgrade-card:nth-child(3) { animation-delay: 120ms; }

@keyframes card-flip-in {
  from { opacity: 0; transform: translateY(40px) rotate(-1deg) scale(0.94); }
  to   { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
}

.upgrade-card:hover {
  transform: translateY(-4px) scale(1.03);
  border-color: #ffcc66;
  box-shadow: 0 6px 22px rgba(255, 200, 100, 0.25);
}

.upgrade-card.picked {
  animation: card-pick 120ms ease-out forwards !important;
}

@keyframes card-pick {
  0%   { transform: scale(1); filter: brightness(1); }
  60%  { transform: scale(1.08); filter: brightness(2.5); }
  100% { transform: scale(1); opacity: 0; filter: brightness(2.5); }
}

.upgrade-card strong {
  display: block;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #ffd27a;
}

.upgrade-card span {
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.85;
}
```

- [ ] **Step 2: Rewrite the component**

Replace `src/ui/UpgradeModal.tsx`:

```tsx
import type { ReactElement } from "react";
import { useState } from "react";
import type { UpgradeOption } from "../game/types";

interface UpgradeModalProps {
  options: UpgradeOption[];
  onPick: (type: UpgradeOption["type"]) => void;
}

export function UpgradeModal({ options, onPick }: UpgradeModalProps): ReactElement {
  const [picked, setPicked] = useState<UpgradeOption["type"] | null>(null);

  const handlePick = (type: UpgradeOption["type"]) => {
    if (picked) return;
    setPicked(type);
    // Delay the callback so the pick-flash animation can play before the modal unmounts.
    setTimeout(() => onPick(type), 100);
  };

  return (
    <div className="upgrade-modal">
      <div className="upgrade-modal-panel">
        <h2 style={{ fontFamily: "'Luckiest Guy', system-ui, sans-serif", letterSpacing: 2, margin: 0 }}>CHOOSE UPGRADE</h2>
        <div className="upgrade-grid-v2">
          {options.map((option) => (
            <button
              className={`upgrade-card ${picked === option.type ? "picked" : ""}`}
              key={option.type}
              type="button"
              onClick={() => handlePick(option.type)}
              disabled={!!picked}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke-test the full sequence**

Run: `npm run dev`
Expected sequence when picking an upgrade:
1. Cards staggered-flip in (~180 ms)
2. Pick → picked card flashes bright + scales, fades
3. ScreenFlash
4. Camera punch (existing screenShake)
5. Chromatic aberration pulse (visible on edges)
6. XP bar sweeps
7. Level-up ribbon sweeps
8. Level pill bumps
9. Audio sting
10. Combat resumed — enemies were moving throughout
Total: ~600–700 ms.

- [ ] **Step 4: Commit**

```bash
git add src/ui/UpgradeModal.tsx src/styles.css
git commit -m "feat(ui): upgrade modal snap-in/out with staggered cards + pick-flash"
```

---

## Task 27: Final verification pass

**Files:** none new. Run checklist.

- [ ] **Step 1: All tests pass**

Run: `npm run test`
Expected: all green.

- [ ] **Step 2: Type-check clean**

Run: `npx tsc -b --noEmit`
Expected: zero errors.

- [ ] **Step 3: Build succeeds and size gate passes**

Run: `npm run build`
Expected: vite build completes; `[size-check] OK: public/assets is <25 MB` printed.

- [ ] **Step 4: Manual verification checklist**

Run: `npm run dev`. Go through the checklist from the spec:

| Check | Target | Pass? |
|---|---|---|
| Cold boot, title visible | ≤ 2.0 s (DevTools Network, Slow 3G) | |
| Cold boot, first-playable | ≤ 5.0 s | |
| Upgrade click → back-in-combat | ≤ 700 ms | |
| `?fx=full` — sustained 60 fps | open_sea 2 min, boss_storm 2 min | |
| `?fx=lite` — sustained 60 fps | same | |
| `?fx=off` — sustained 60 fps | same | |
| Auto-downgrade | DevTools 4× slowdown → quality drops to lite then off | |
| Biome transition with deferred prop unloaded | Primitive fallback renders silently | |
| Audio: devSynth mode | Pickup chime, hit bonk, sting, cue, damage all audible | |
| HUD: level pill bumps on level-up | Visible | |
| HUD: HP bar damage-flash on hit | Visible | |
| XP bar sweep on level-up | Visible | |
| Screen flash + ribbon on level-up | Visible | |
| Sim continues during upgrade | Enemies move, can damage player | |

- [ ] **Step 5: Final commit**

No code changes here. If the checklist found issues, each fix gets its own commit. Otherwise, the plan is complete.

---

## Self-Review Notes

Coverage vs spec:
- Phase 1 asset pipeline + tiered loading → Tasks 1–3, 6, 7, 9–11. ✓
- Phase 1 `loading` phase + splash → Tasks 4, 5, 8, 9. ✓
- Phase 2A post-processing → Tasks 12–15. ✓
- Phase 2A HUD polish → Tasks 16–19. ✓
- Phase 2B sim-pause removal → Task 20. ✓
- Phase 2B audio → Tasks 21–23. ✓
- Phase 2B upgrade-moment sequence → Tasks 23–26. ✓
- Testing plan (unit + build-gate + manual) → embedded per-task + Task 27 consolidation. ✓
- Non-goals respected: no gameplay mechanics changes; no real audio files (devSynth only); no mobile; biome themes untouched. ✓

Deferred from Phase 2B design table vs this plan:
- "RadialBurst" as a distinct component is folded into the existing `hitBurst` VisualEffectKind (Task 23) — the scene already renders hitBurst with color + particles, so a bespoke component is YAGNI for Phase 2B. If a richer burst is wanted later, extract then.
- The ambient sea-bed / boss-bed music layer is stubbed but not functional under devSynth — the `ambient()` method is present on AudioManager and is a no-op until real `.ogg` files arrive (listed as out-of-scope in the spec).
