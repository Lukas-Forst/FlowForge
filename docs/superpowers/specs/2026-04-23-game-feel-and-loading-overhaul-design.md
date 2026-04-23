# FlowForge — Game-Feel & Loading Overhaul

**Status:** Design locked 2026-04-23. Pending implementation plan.

## Context

FlowForge is a React + react-three-fiber arcade ocean-survivor game. Three distinct pain points shipped in one coordinated spec:

1. **Loading performance.** `public/assets/models/` is ~361 MB of uncompressed Meshy-exported GLBs (individual ships 44–69 MB, props 7–31 MB). Localhost works but the game is unshippable publicly — no one will wait ~60 s for first frame.
2. **Upgrade acquisition feel.** Picking an upgrade opens a plain-HTML modal with text buttons. Zero animation, zero VFX, zero sound. The high-dopamine beat of a survivors-style run currently reads as a form submission.
3. **Overall visual polish.** No post-processing pass; the HUD is raw `div`s with flat text. The 3D scene has decent fundamentals (iso camera, vertex-displaced water, biome themes) but nothing amplifies them.

## Locked Decisions

| Axis | Choice |
|---|---|
| Visual direction | **Arcade Pop & Punch** (saturated, bloom-heavy, screen-shake-heavy; Vampire Survivors / Brotato energy) |
| Deployment target | **Public portfolio** — ~2 s title, ~5 s in-game on cafe wifi / mid-tier laptop |
| Upgrade moment pacing | **Stay-in-flow snap** (~0.6 s total, no freeze) |
| Audio | **In scope** — SFX bank + ambient sea bed |
| Staging | **Foundation first, juice second** (compression + splash → post-FX + VFX + audio) |

## Goals

- Cold-boot title screen visible under 2 s on cafe wifi.
- First-playable under 5 s. Deferred assets stream invisibly during combat.
- Total shipped `public/assets/**` under **25 MB** (vs ~361 MB today), enforced by a build-time gate.
- Upgrade click → back-in-combat under 700 ms, with full-sensory punch: flash, camera punch, radial burst from ship, XP-bar sweep, level-up ribbon, audio sting.
- Post-processing + HUD polish land cleanly with a quality toggle (`full | lite | off`) and auto-downgrade on slow frames.

## Non-Goals

- New gameplay mechanics. This spec is feel/perf only.
- Replacing existing Meshy assets. We're optimizing them, not re-authoring.
- Shipping real audio files. Placeholder synth tones ship alongside the audio system; real audio files are a follow-up.
- Mobile web. Target is desktop web; mobile is a future concern.
- Changes to game systems (`collision.ts`, `enemySpawner.ts`, etc.) — they only gain emit calls into the existing `visualEffects` / new `audioEvents` queues.

## Architecture

### New modules

- `scripts/assets/optimize.mjs` — build-time asset-compression CLI. Reads source GLBs from `assets-sources/` (gitignored), emits optimized GLBs to `public/assets/models/`.
- `src/assets/registry.ts` — single source of truth. Exposes `getAsset(id): Promise<Group>` (imperative, with dedup + caching) and `useAsset(id): Group | null` (React hook wrapper that returns the cached value synchronously once loaded, `null` while pending). Replaces the ad-hoc `loadedScenes` Map in `ShipModelVisual.tsx`.
- `src/assets/manifest.ts` — every asset tagged with a tier: `critical | biome | deferred`.
- `src/assets/AssetPreloader.tsx` — loads `critical` before the title screen renders; kicks off `biome` in the background.
- `src/ui/SplashScreen.tsx` — shown during the new `loading` phase. Displays title art, progress bar, and progress label; auto-dismisses when critical tier completes.
- `src/scene/postfx/PostFX.tsx` — one `<EffectComposer>` with bloom, chromatic-aberration pulse, vignette; mounted inside `<Canvas>`.
- `src/scene/fx/` — promoted juice primitives: `ScreenFlash.tsx` (UI overlay), `RadialBurst.tsx` (3D), `LevelUpRibbon.tsx` (UI), `HitSparks.tsx` (3D). All declarative consumers of `snapshot.visualEffects`.
- `src/audio/AudioManager.ts` — thin Web Audio wrapper. No library dep. Loads a small SFX bank, exposes `play` / `ambient`, drained once per frame from `snapshot.audioEvents`.
- `src/audio/devSynth.ts` — generates `OscillatorNode`-based placeholder tones so the audio system is testable before real files exist.
- `src/ui/LevelUpRibbon.tsx`, `src/ui/XPBar.tsx`, `src/ui/LevelPill.tsx`, `src/ui/AnimatedNumber.tsx`, `src/ui/PulseMeter.tsx`, `src/ui/BossFrame.tsx`, `src/ui/BiomeBadge.tsx` — HUD primitives.
- `src/ui/useTweenedValue.ts` — ~40-line hook; drives HUD count-ups and pulses without a dep.

### Changed modules

- `useGameState.ts`
  - Adds a `loading` phase (preceding `start`) with `{ progress: number, label: string }`.
  - Adds `audioEvents: AudioEvent[]` array (analogous to `visualEffects`).
  - Adds `postFxPulse?: { effect: 'chromaticAb'|'flash', remaining: number }` field.
  - Keeps the `upgrade` phase (it still gates input and triggers the modal) but removes its sim-pause effect: `tick` no longer short-circuits when `phase === "upgrade"`, so enemies, projectiles, and the run clock continue to advance while the player picks a card. (Sim-runs-during-upgrade confirmed with user.)
- `Hud.tsx` — rewritten with animated components. Structural change: XP bar moves to top-of-screen full-width for stronger progression signal.
- `UpgradeModal.tsx` — rewritten with CSS-keyframe snap-in/out; `onPick` emits `levelUp` into `visualEffects` + `audioEvents`.
- `ShipModelVisual.tsx` — loses the candidate-path + loader logic; becomes a thin consumer of `useAsset(id)` from `src/assets/registry.ts`.
- `GameScene.tsx` — wraps scene in `<PostFX>`; reads `postFxPulse` from snapshot.
- `package.json` — adds `assets:optimize`, `assets:size-check`; wires `size-check` into `build`.

### Untouched

- Core gameplay systems (`collision.ts`, `enemySpawner.ts`, `bossSpawner.ts`, `pickups.ts`, `enemyRanged.ts`, `harvestableSpawner.ts`, `runArc.ts`, `autoAttack.ts`, `cannonAbility.ts`, `boostAbility.ts`, `playerController.ts`, `biome.ts`). They only gain *emit* calls into the queues.
- Biome themes, water shader, wake foam, and scene-prop dispatch.

### Dependencies

- **Added (runtime):** `@react-three/postprocessing` (~20 KB gzipped).
- **Added (dev-only):** `@gltf-transform/cli` (or `gltfpack`). Build-time tool; never bundled.
- **Not added:** No audio library (Web Audio direct). No animation library (CSS keyframes + hook).

---

## Phase 1 — Loading Performance

### Asset-compression pipeline

`scripts/assets/optimize.mjs` walks `assets-sources/` and pipes each GLB through:

1. **Mesh decimation** — target ~5–8k tris for ships, 1–3k for props. (`@gltf-transform`'s simplifier.) Meshy outputs 50–150k tris; most is invisible detail at iso camera distance.
2. **DRACO compression** on mesh streams — ~10–15× geometry reduction.
3. **KTX2 / Basis Universal texture compression** (`etc1s` profile) — 4–8× smaller than PNG *and* GPU-native (no decode cost on main thread).
4. **Metadata trim** — strip unused attributes, animations we don't use, material channels we override anyway.

Outputs emitted to `public/assets/models/` as the only git-tracked copies. Source GLBs stay out of git; documented in `docs/asset-workflow.md`. The existing `.Zone.Identifier` NTFS-metadata files and stale Meshy-named duplicates get deleted as part of this phase.

### Budget targets

| Asset class | Before | After (target) |
|---|---|---|
| Ships (each) | 44–69 MB | 1–3 MB |
| Props (each) | 7–31 MB | 0.5–1.5 MB |
| Total `public/assets/**` | ~361 MB | **< 20 MB** |

Build-time hard gate at 25 MB; fails `npm run build` if exceeded.

### Tiered loading

`manifest.ts` tags every asset with a tier:

- **`critical`** (loaded before title): player ship, HUD icons, display font, the SFX bank (`cannon_fire`, `hit`, `pickup`, `upgrade_sting`, `damage_taken`, `ship_destroyed`, `harvestable_destroyed`). Budget ~2 MB. Target ~1.5 s on cafe wifi.
- **`biome`** (loaded during title screen, in parallel): all 4 enemy ships, water bump-map, first biome's props, ambient audio loops (`sea_bed`, `boss_bed`), the `boss_cue` one-shot. Budget ~6 MB. Usually complete by the time user clicks Start.
- **`deferred`** (loaded in background during play): other biomes' props, boss ship. Budget ~10 MB. If a prop hasn't landed by the time the player enters that biome, the existing primitive-mesh fallback in each prop component covers the gap silently.

### Splash / title flow

- `useGameState` gains a `loading` phase preceding `start`.
- `AssetPreloader` drives critical-tier loads and exposes `{ progress, label }` to a new `SplashScreen` UI.
- Once critical completes → phase auto-advances to `start`.
- On title screen, biome-tier loads continue with a subtle hint on the Start button ("Preparing…" → "Start").
- On run start → deferred-tier loads kick off; completion is never blocking.

---

## Phase 2A — Post-Processing & HUD Polish

### Post-processing stack

`<PostFX>` renders one `<EffectComposer>` inside `<Canvas>`:

1. **Bloom** — `intensity 0.8`, `luminanceThreshold 0.65`, `mipmapBlur`. Picks up emissives on water/pickups/muzzle flashes. Biggest single visual win. ~2 ms GPU on mid-tier laptops.
2. **Chromatic aberration** — event-driven only, 150 ms pulse on upgrade pick, boss spawn, player hit. Constant chromatic-ab is nausea-inducing; we avoid it. Driven by `snapshot.postFxPulse`.
3. **Vignette** — `offset 0.35`, `darkness 0.55`, round. Frames the iso view.
4. **Tonemapping** — `ACESFilmicToneMapping` at renderer level (not in composer), plus `sRGBEncoding` output. Gives saturation without blowing out highlights.

**Quality toggle** exposed via URL param `?fx=full|lite|off`. Default `full`. Auto-downgrade: if `requestAnimationFrame` averages <50 fps for 3 s, drop `full → lite`; at <35 fps for 3 s, drop `lite → off`. `lite` = bloom only. `off` = no composer mounted.

### HUD polish

`Hud.tsx` rewritten to consume new primitives. Structural change: XP bar promoted to top-of-screen full-width.

- **Typography** — load one display font at critical tier (target: `Luckiest Guy` or `Bungee`, ~30 KB WOFF2) for numbers and key labels. System sans for flavour text.
- **`<AnimatedNumber>`** — smooth count-up tween (150 ms, ease-out) on coin / kill / score changes.
- **`<PulseMeter>`** — replaces raw `.meter-fill`. Gradient fill, soft outer glow when full (cannon/boost ready), damage-flash red on HP drop ≥ 10.
- **`<XPBar>`** — full-width top of screen. Gradient fill + sparkle sweep animation on level-up.
- **`<LevelPill>`** — chunky level badge top-left; scale-bump `1.0 → 1.25 → 1.0` on level-up.
- **`<LevelUpRibbon>`** — sweeps across center screen, 280 ms, on `levelUp` event.
- **`<BossFrame>`** — replaces the inline boss bar; stylized frame + emblem.
- **`<BiomeBadge>`** — replaces "Region:" text; pill with icon.

All HUD animations: CSS keyframes + `useTweenedValue`. No framer-motion.

---

## Phase 2B — Upgrade Moment & Audio

### Upgrade moment (0.6 s sequence)

On `chooseUpgrade(type)` the existing reducer emits a `levelUp` event into `visualEffects` + `audioEvents`; consumers fire the staged sub-effects at these offsets:

| t (ms) | Event | Consumer |
|---|---|---|
| 0 | Card flashes bright, scales to 1.08, fades out (120 ms) | `UpgradeModal` CSS keyframe |
| +30 | `ScreenFlash` 8% alpha, 100 ms ease-out | `<ScreenFlash>` UI overlay |
| +30 | Camera punch (amp 0.4, 140 ms decay) | Extends existing `screenShake` effect |
| +40 | `RadialBurst` — 8 sparkle particles from ship, 350 ms life | `<RadialBurst>` 3D |
| +100 | Audio: `upgrade_sting` | `AudioManager.play("upgrade_sting")` |
| +100 | `postFxPulse: chromaticAb` (200 ms) | `PostFX` consumes |
| +100 | XP bar fill-sweep | `<XPBar>` |
| +150 | `LevelUpRibbon` sweeps across (280 ms) | `<LevelUpRibbon>` |
| +400 | Modal unmounts; combat already resumed | — |

**Sim behavior during upgrade:** input blocked only — enemies keep moving. This is a change from current behavior where `phase === "upgrade"` pauses `tick`. User confirmed.

### Audio layer

`AudioManager` is ~150 lines of Web Audio glue: one `AudioContext`, one master `GainNode`, per-bus gains (`sfx`, `music`). Bank loaded at critical tier:

**SFX (~150 KB total, `.ogg` @ 96 kbps):**
- `cannon_fire` — 0.2 s
- `hit` — 0.15 s, random pitch ±10%
- `pickup` — 0.1 s
- `upgrade_sting` — 0.5 s
- `boss_cue` — 1.0 s
- `damage_taken` — 0.15 s
- `ship_destroyed` — 0.4 s
- `harvestable_destroyed` — 0.3 s, random pitch

**Ambient (~80 KB, ~10 s seamless loops):**
- `sea_bed`
- `boss_bed` — crossfades 600 ms when `runClock.phase` toggles boss

Gameplay systems push `{ id, volume?, pitch? }` onto `snapshot.audioEvents`; `AudioManager` drains the queue once per frame.

**`devSynth` placeholder mode.** Until real `.ogg` files exist, `AudioManager` auto-falls-back to `devSynth.ts`, which generates simple `OscillatorNode` tones per event. Ships in the first PR so the audio pipeline is provably working before real assets arrive. User can swap real files in later with no code change.

---

## Testing

### Unit (vitest, extending existing patterns)

- `upgrades.test.ts` — picking an upgrade emits the staged `visualEffects` + `audioEvents` in order with the expected time offsets.
- `registry.test.ts` — tier-based load order, dedup, progress callback math.
- `postFx.test.ts` — pulse timer decays to zero; auto-downgrade triggers on a mocked low-fps stream.
- `audioManager.test.ts` — queue drain, master/bus gain hierarchy, `devSynth` fallback.

### Build-time gates

- `npm run assets:size-check` — fails if `public/assets/**` total exceeds 25 MB. Wired into `npm run build`.
- `npm run build` — existing TypeScript strict mode + vite build.

### Manual verification checklist

| Check | Target |
|---|---|
| Cold boot, title visible | ≤ 2.0 s (cafe wifi, mid-tier laptop) |
| Cold boot, first-playable | ≤ 5.0 s |
| Upgrade click → combat resumed | ≤ 700 ms |
| `?fx=full` — 60 fps sustained | 2 min in open_sea + 2 min in boss_storm |
| `?fx=lite` — 60 fps sustained | Same routes |
| `?fx=off` — 60 fps sustained | Same routes |
| Auto-downgrade | Confirm on artificially throttled CPU (devtools 4× slowdown) |
| Biome transition with deferred prop tier unloaded | Primitive fallback renders, no console error |
| Audio: `devSynth` mode | All 8 SFX + 2 ambient loops audible |

---

## Out of Scope / Follow-ups

- Real audio asset authoring (the audio *system* ships with `devSynth` placeholders; actual `.ogg` files are a later task).
- Mobile web targeting.
- Gameplay rebalance or new mechanics.
- Redesigning biome themes (current themes stand; post-FX amplifies them).
- Localization of HUD strings.
