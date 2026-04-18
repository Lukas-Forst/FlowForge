# FlowForge — Change Map

A developer-facing plan to close the gap between "playable prototype" and "game that feels designed." Focus is **gameplay design, run structure, and map design** — not visual polish (tracked separately). Each section lists: the problem, why it matters, the concrete change, and where in the code it belongs.

Items are ordered by **design impact per effort**. The "P0" block is what most changes the felt quality of the game; the "P2" block is polish that only pays off once P0/P1 land.

---

## 1. Current state (what the game is today)

Read this first — every change below is measured against this baseline.

- **Loop:** endless arena. Player spawns at origin, moves with WASD, ship faces movement direction. Auto-fires a single forward projectile at `BASE_AUTO_ATTACK_INTERVAL = 0.55s`. Q fires a 5-shot broadside (port + starboard). Space is a 0.22s speed burst on a 4.5s cooldown.
- **Enemies:** three types (`corsair`, `bomber`, `brute`) spawned outside the camera view. All three behave the same: seek the player + fire a ranged projectile on a timer. Differences are cosmetic + stat tuning only (see `src/game/systems/enemyRanged.ts` and `src/game/systems/collision.ts:57`).
- **Spawning:** time-ramped cap. `getEnemyCap` in `src/game/systems/enemySpawner.ts:26` caps at **12** active enemies after ~3:00. Interval floors at `MIN_SPAWN_INTERVAL = 0.2s`. No waves, no elites, no bosses.
- **Economy:** every killed enemy drops 1 coin (`resolveCollisions` in `src/game/systems/collision.ts:107`). First upgrade at 10 coins; threshold grows `+(level+4)` per level (`src/game/systems/upgrades.ts:15`).
- **Upgrades:** `buildUpgradeChoices` always returns the **same three options** in the **same order**: fireRate, speed, cooldown (`src/game/systems/upgrades.ts:6`). No randomization, no variety, no rarity.
- **Score:** `floor(time) + kills * 10`.
- **World:** infinite water. `WaterArena.tsx` renders a camera-following 3×3 tile grid and sparse world-anchored "buoy" props (`ScatteredSeaProps`). No islands, no rocks (removed per memory), no biomes, no landmarks.
- **UI:** start screen → playing → upgrade modal (full pause) → gameover. No between-run progression. No pause key.
- **Unused inputs:** `E` and `R` are intercepted but do nothing (`src/App.tsx:46`). A second ability slot is wired but empty.

**Diagnosis in one line:** the *systems* for a Vampire Survivors–style run exist, but the *content* needed to make runs feel different from each other — and even different from minute-to-minute within a single run — is missing.

---

## 2. Design principles to design against

Before picking items to build, lock these. They're the tests to apply to every subsequent decision.

1. **A run must have shape.** Intro (0:00–1:00, easy, teach) → rising action (1:00–4:00, build choices matter) → crescendo (4:00–7:00, boss or event) → death or victory. Currently a run is a flat ramp.
2. **Every minute should offer a decision.** Not just "dodge or die" — *which* direction to push, *which* upgrade to take, *which* pickup to grab.
3. **Enemy variety = behavioral, not cosmetic.** Two enemies with identical AI and different meshes read as the same enemy. Different movement + attack patterns read as different enemies even with the same mesh.
4. **The map must push and pull the player.** An endless empty ocean gives the player no reason to move except to dodge. Landmarks, pickups, and biome edges create intent.
5. **Feedback > fidelity.** Hit-pause and screen shake beat one more particle effect. Design for *readability under pressure*.
6. **Meta progression is optional for jam scope but mandatory for replayability.** Unlockable ships or starting upgrades after N runs give players a reason to come back.

---

## 3. P0 — Ship these to unlock the rest

These are the changes that most transform the prototype into a "real game." Do them in order; each unblocks the ones below.

### 3.1 Expand the upgrade pool and randomize the draw

**Problem.** `buildUpgradeChoices` returns the same three options every upgrade tier. There's no deck-building, no build identity, no reason to hit threshold 5 vs threshold 20.

**Why it matters.** Upgrade variety *is* the rogue-like loop. Without it the game doesn't differentiate between runs — and the moment the modal appears a second time, players know exactly what they'll see forever.

**Change.**
1. Add ~12 upgrades across 3 tiers. See "Upgrade catalog" below.
2. Each upgrade has a **max stack count** (e.g. fireRate stacks 5×, cannonCount stacks 3×).
3. `buildUpgradeChoices` picks **3 random offers** from non-maxed upgrades, weighted by rarity. Guarantee at least one common so early offers aren't all rares.
4. Add an "evolution" rule: at upgrade level 6, if fireRate + speed are both maxed, offer a unique evolved upgrade (e.g. "Full Steam Ahead": auto-fire doubles on boost).

**Where.**
- `src/game/types.ts:3` — extend `UpgradeType` to a union of new types.
- `src/game/constants.ts:73` — add entries to `UPGRADE_OPTIONS` with `rarity` and `maxStacks` fields.
- `src/game/systems/upgrades.ts` — replace `buildUpgradeChoices` with weighted random pick using `upgrades` state to filter maxed-out types.
- `src/game/useGameState.ts` — thread `upgrades.stacks: Record<UpgradeType, number>` into state.

**Upgrade catalog (suggested starting set).**

| Id | Tier | Effect | Max stacks | Reason |
|---|---|---|---|---|
| `fireRate` | common | +22% auto-fire rate | 5 | DPS |
| `speed` | common | +15% ship speed | 4 | Mobility |
| `cooldown` | common | -18% cannon cooldown | 4 | Burst |
| `maxHp` | common | +25 max HP (heal to full) | 3 | Survivability |
| `projectileCount` | uncommon | +1 forward auto-shot | 3 | DPS |
| `sideGuns` | uncommon | adds passive port+starboard shots every 1.2s | 2 | Flavor + horizontal DPS |
| `pierce` | uncommon | auto-shots pierce 1 extra enemy | 2 | AoE |
| `coinMagnet` | uncommon | +150% coin pickup radius | 2 | QoL + pacing |
| `armor` | uncommon | -15% damage taken | 3 | Survivability |
| `boostRepeat` | rare | boost cooldown -40%, +50% active time | 1 | Mobility identity |
| `cannonSpread` | rare | cannon salvo size +2, arc widens | 2 | Ability identity |
| `fullSteam` (evolution) | epic | auto-fire doubles while boost active; grants 1s post-boost | 1 | Build reward |

### 3.2 Behavioral enemy variety

**Problem.** All three enemy types are "chase + shoot toward player." The brute is statistically larger; the bomber is statistically squishier. The player does not think about them differently.

**Why it matters.** The core moment-to-moment skill expression of a bullet-hell survivor is **reading enemy intent** and positioning against it. If every enemy reads identically, the game collapses to "don't let anything touch you."

**Change.** Reshape the three existing types, then add two new ones. Keep it cheap — behaviors are small branches in `updateEnemyMovement` + `runEnemyRangedAttacks`.

| Type | Role | Movement | Attack | Signature read |
|---|---|---|---|---|
| `corsair` (exists, rework) | Harasser | Orbits the player at ~8u; never closes | Rapid short-range single shot | "Keep it at arm's length" |
| `bomber` (exists, rework) | Rusher | Straight-line charge; ignores ranged | Explodes on contact, no projectile | "Don't let it reach you" |
| `brute` (exists, rework) | Artillery | Slow approach, stops to fire | Slow heavy shot with telegraph ring | "Sidestep the big one" |
| `swarmer` (new) | Cheap mass | Fast, low HP, erratic jitter | Melee only | Tests AoE build |
| `sniper` (new, rare) | Back-line threat | Never closes past 14u | Charged shot with tracer line | Forces player to push toward danger |

**Where.**
- `src/game/types.ts:4` — add `"swarmer" | "sniper"` to `EnemyType`.
- `src/game/constants.ts:52` — add ranged tuning rows for new types.
- `src/game/systems/enemySpawner.ts:15` — `pickEnemyType` gains time-gated weights: swarmer available from 0:00, corsair/brute from 0:30, bomber from 1:00, sniper from 2:30.
- `src/game/systems/collision.ts:57` — branch movement by type:
  - corsair: compute tangential component, hold distance band [7, 9].
  - bomber: straight charge; on contact deal `touchDamage * 2.5` and self-destruct (expand `resolveCollisions` to delete enemy on touch if type === "bomber").
  - brute: if distance < 10, stop moving and extend `rangedCooldown` while telegraphing.
  - sniper: if distance < 14, retreat.
- `src/game/systems/enemyRanged.ts` — branch telegraph/shot types; brute needs a "charging" state and a visible telegraph effect (add `VisualEffectKind = "telegraphRing"`).

### 3.3 Run structure — waves, lull, boss

**Problem.** A run is a straight ramp with no rhythm. Players cannot anchor their memory to "the part where X happens." The run ends only when they die, which tends to feel abrupt rather than earned.

**Why it matters.** Memorable runs need beats: the intro minute, the first chest, the 5-minute boss. Without beats, every run overwrites the last.

**Change.** Replace the pure time-linear spawn ramp with a 4-phase loop that repeats:

1. **Wave (60s)** — cap + interval drive a specific enemy mix. Current behavior.
2. **Elite pulse (10s)** — one ranged-resistant "elite" corsair appears, drops a **chest** on death (see 3.5).
3. **Lull (15s)** — spawn cap drops by half; a **treasure boat** or **supply drop** spawns within ~25u (see 3.5).
4. **Boss at 5:00, 10:00, 15:00** — a single high-HP enemy with telegraphed attacks fills the screen; all normal spawning paused; run auto-ends if all 3 bosses defeated (a "win" screen).

**Where.**
- `src/game/types.ts` — add `phase: "wave" | "elite" | "lull" | "boss"` and a `phaseTimer`, or a `runClock: { phase, phaseTime }` block on `GameSnapshot`.
- `src/game/systems/enemySpawner.ts` — rewrite `updateEnemySpawning` to advance the phase machine; cap and interval are now functions of `(phase, elapsedTime)` instead of `elapsedTime` alone.
- New file `src/game/systems/bossSpawner.ts` — boss entity, HP bar rendering hook, telegraph-based attack patterns.
- New enemy type `"boss"` with a phase-count stat. Re-use the `Enemy_ship_boss.glb` already in `public/assets/models/ships/` (it's not wired — see `src/scene/entities/Enemy.tsx:40`).
- `src/ui/Hud.tsx` — add a "Next: 0:42" label for the upcoming phase, boss HP bar when `phase === "boss"`.

### 3.4 Map design — give the ocean geography

**Problem.** The "endless ocean" is a uniform blue plane with scattered buoys. Players have no reason to move in any particular direction; space is undifferentiated. Combine with a camera that always centers on the player and the world visually loops.

**Why it matters.** Survivors-style movement is spatial decision-making. Without landmarks, spatial decisions degrade to "the side with fewer bullets." Add geography and every movement decision carries a secondary question: *do I move toward or away from the thing I can see?*

**Change.** Introduce **chunked biomes** along the player's drift. The player trends outward; each ~80u chunk in their direction of travel belongs to one of three biomes:

1. **Open sea** — current look; standard enemy mix.
2. **Island chain** — 3–6 non-collidable small islands visible from a distance. Spawns *"shore battery"* stationary enemies on the islands (reuses brute logic with `speed = 0`). Reward: coin density is higher here.
3. **Fog bank** — tinted fog and lower camera visibility. Enemies appear at closer range and spawn faster. Only sniper + swarmer spawn. Reward: a guaranteed chest.

**Implementation.** Pure biome *assignment* is deterministic hash-based (like `ScatteredSeaProps` already does — `hash2(i, j)` in `WaterArena.tsx:128`). Fog and island visuals already have half-implementations in the visual-polish memory entry; wire them into the biome system instead of rendering everywhere.

**Where.**
- New file `src/game/systems/biome.ts` — `function biomeAt(x: number, y: number): BiomeId`, `function chunkHash(i: number, j: number): number`.
- `src/game/systems/enemySpawner.ts:41` — after picking spawn position, query `biomeAt` and filter the enemy type roll by biome.
- `src/scene/arcade/WaterArena.tsx` — add a "fog plane" layer whose tint is a function of `biomeAt(playerX, playerZ)`. Render islands when biome === "islands" (not everywhere).
- `src/scene/entities/` — new `ShoreBattery.tsx` (stationary brute variant).

**Non-goals.** No terrain collision. Islands remain decorative — the battery is the "hitbox." This keeps movement feel unchanged.

### 3.5 Loot that matters — chests, supply drops, HP pickups

**Problem.** The only loot is `value: 1` coins, which only exist to count toward an upgrade threshold. Loot cannot change a run; it can only hasten it.

**Why it matters.** Chests and random pickups create *moments* — the spike of "oh, a chest" that anchors a run. They also let the game hand out rewards without making every enemy drop a coin, which keeps the coin counter meaningful.

**Change.**
1. **Chests** spawn during elite pulses and in fog banks. Moving over one grants either (a) immediate upgrade modal or (b) a chunk of coins (randomized 5/15/30). Visual: locked treasure chest model, coin burst VFX on open.
2. **Supply drops** spawn during lulls. One of: full HP heal, temp `ATTACK_RATE +50% for 10s`, temp `invuln for 3s`. Forces the player to traverse the lull period rather than idle.
3. **HP pickups** drop at 3% per kill; heal 10 HP. Softens the lack of healing currently in the upgrade tree.

**Where.**
- New entity types in `src/game/types.ts`: `ChestState`, `PickupState`, `PickupKind`.
- `src/game/systems/coins.ts` — generalize to `src/game/systems/pickups.ts` that handles coin / HP / chest collection.
- `src/game/systems/collision.ts:107` — after kill, roll HP drop chance; emit appropriate pickup.
- `src/scene/GameScene.tsx:125` — render new pickup types alongside coins.

### 3.6 Combat feedback loop

**Problem.** Hits register a single `hitBurst` particle. No screen shake, no hit-pause, no damage numbers, no kill confirmation pop. Good hits and glancing hits feel the same.

**Why it matters.** Moment-to-moment combat *feel* is 80% feedback. The same damage numbers, with proper feedback, will be rated ~2× as "juicy" by playtesters. This is the cheapest P0 item and compounds with everything else.

**Change.**
1. **Screen shake** on player-hit (strong) and enemy-kill (light). Implement as a `cameraShakeRef` in `CameraFollow` that lerps toward zero.
2. **Hit-pause** (freeze-frame): on cannon hit or boss damage, `setTimeout(0.06s)` on the game tick. Implement by skipping one or two `tick` calls in `App.tsx:80`.
3. **Damage numbers** rising from the hit point. New `VisualEffectKind = "damageNumber"` carrying a number and a color (white for auto, yellow for cannon, red for crit).
4. **Kill popup** — enemy death plays a brief explosion sprite + 1 s fade out ring.
5. **HP flash** — the HP bar pulses red when the player takes damage.

**Where.**
- `src/scene/GameScene.tsx:62` — `CameraFollow` takes a shake magnitude signal.
- `src/game/useGameState.ts:252` — `resolveCollisions` return value gains a `hitEvents: { position, damage, kind }[]` list for VFX to consume.
- `src/scene/arcade/CombatVfx.tsx` — add damage-number sprite renderer.
- `src/ui/Hud.tsx:32` — HP bar flash via CSS class toggled on `playerDamageTaken > 0`.

### 3.7 Start, pause, death screens

**Problem.** The start screen is one line. Pause doesn't exist. The death screen lists three numbers and a button.

**Why it matters.** First and last impressions. The start screen sells the game in 3 seconds; the death screen sells the *next run*.

**Change.**
1. **Start screen** — show control scheme inline, show "Best: <score>" from `localStorage`, animate the title ship in the background.
2. **Pause** — bind `P` or `Escape`. Show a dimmed overlay with "Resume / Restart / Quit" and a compact stat sheet.
3. **Death screen** — list *run highlights* ("Biggest hit: 218", "Longest survival streak without damage: 47s"), show best vs this run, confetti-animate if best was beaten.
4. **Persist** best score to `localStorage["flowforge.best"]`. No accounts needed.

**Where.**
- `src/ui/StartScreen.tsx`, `src/ui/GameOverScreen.tsx` — extend.
- `src/game/types.ts:1` — extend `RunPhase` with `"paused"`.
- `src/game/useGameState.ts:202` — in `tick`, early-return if phase === "paused".
- `src/App.tsx:34` — key handler for P/Escape → `togglePause`.

---

## 4. P1 — Noticeable improvements after P0 lands

Lower-impact on their own, but the game will feel uneven if P0 ships without them.

### 4.1 Second active ability (E or R)

The input harness already reserves E/R. Pick one and wire a second ability. Candidates:

- **Repair (E, 12s cd)** — instant +25 HP, no invulnerability.
- **Smoke screen (R, 18s cd)** — drops a circular AoE at player; enemies inside lose sight and stop firing ranged for 3s. Very readable counter to the sniper.

Put both in state, bound to E and R respectively, and let an upgrade unlock the second one so the player isn't overwhelmed in the first run. Implementation parallels `src/game/systems/cannonAbility.ts`.

### 4.2 Coin value tiers

All enemies currently drop `value: 1`. Scale drops by enemy type and biome:

- corsair/swarmer → 1
- bomber/brute → 2
- sniper → 3
- elite → 5 + chest guaranteed
- boss → 20

Also add a rare **"gem" pickup** (value 5, 4% enemy drop chance). Makes HP pickup rolls and gem rolls mutually exclusive, not stacking.

### 4.3 Difficulty curve retune

Current ramp caps at 12 enemies after ~3:00. Combined with P0 enemy variety this will be trivial (corsair + sniper + brute = 12 enemies shooting at you). Retune:

- Keep cap lower (max 8–10) but **mix harder** — at 3:00+, 40% of spawns are sniper/brute.
- Boss fights pause normal spawns entirely; reset cap on boss clear.
- Test against "no-upgrade run" as the baseline: a no-upgrade player should die at ~4:00. A well-built player should reach the 15:00 boss.

### 4.4 Run seed + "daily run"

Single global run seed printed in the corner of the HUD. `Math.random` in spawners and upgrade picks reads from a seeded RNG. With the seed, runs become shareable. Add an optional "Daily Seed" button on the start screen that fixes the seed to `YYYY-MM-DD`.

### 4.5 Audio design stub

The game is silent. At minimum:

- Cannon fire sfx (Q)
- Enemy hit sfx (small)
- Player hit sfx (loud)
- Pickup sfx (rising chime)
- Background loop (calm chiptune or ambient ocean)
- Boss intro sting

Lay out an `src/audio/` directory with a tiny `playSfx("cannonFire")` interface; defer actual audio sourcing, but wire the call sites so later we only swap files.

---

## 5. P2 — Polish and depth once P0/P1 are stable

### 5.1 Meta progression

A `localStorage`-backed "port" screen between runs:

- Coins earned this run become a permanent currency.
- Unlock: +2 starting HP per 50 coins spent, starting cannon cooldown -10%, unlock new starter ship with different base stats (faster/lower-HP variant).
- Keep it shallow — jam scope. Maybe 6 permanent unlocks total.

### 5.2 Leaderboard (local-only)

Top 10 scores saved locally. Shown on game-over and start screen.

### 5.3 Cosmetic ship customization

Unlockable cosmetic variants: hull paint, smokestack color, flag. No stat effect. Reuses the existing material-cycle in `applySteampunkGltfMaterials` (see memory).

### 5.4 Tutorial micro-prompts

First run only: short inline hints ("Press Q — broadside!" when first cannon comes off cooldown, "Move over the coin" when first coin drops). Stored as a boolean in localStorage.

### 5.5 Accessibility

- Colorblind palette for projectiles (player = blue, enemy = red is the current inference from VFX — make it explicit in `CombatVfx.tsx` and add a toggle).
- Remap keys. At least WASD / arrows duality.
- "Reduced motion" toggle that dampens screen shake.

### 5.6 Performance pass

- Pool projectiles and visual effects rather than `push`/`splice` on every frame (`src/game/systems/collision.ts:32` loops are O(projectiles × enemies) today — fine until enemy count doubles, then not).
- Precompute enemy forward vectors once per frame rather than twice.

---

## 6. Recommended execution order

Do not pick from this list top-to-bottom — pick by dependency chain.

1. **3.1 upgrade pool** — 1 day. Unblocks "a build." Test runs start feeling different.
2. **3.2 enemy behaviors** — 1 day. Unblocks "a fight."
3. **3.6 feedback** — ½ day. Small change, huge felt improvement. Do it alongside 3.2 testing.
4. **3.3 run structure + boss** — 2 days. Unblocks "a run arc." Builds on 3.2 (you need behavioral variety before a boss is interesting).
5. **3.5 chest/pickups** — 1 day. Feeds directly off 3.3's lull/elite phases.
6. **3.4 map/biomes** — 1 day. Depends on 3.5 (biome-specific chests) and 3.2 (biome-specific enemy filters).
7. **3.7 menus + pause** — ½ day. Do last so it can show real stats from new systems.
8. **P1 items** — interleaved after each P0 chunk is in main.
9. **P2 items** — only after a full playthrough-to-win is possible end-to-end.

**Total P0 effort:** ~7 developer-days. Realistic jam scope.

---

## 7. Tests and verification

Two existing test files set the bar for the new systems:

- `src/game/systems/boostAbility.test.ts`
- `src/game/systems/enemySpawner.test.ts`

Add test coverage for at least:

- `buildUpgradeChoices` respects max stacks and rarity weights (3.1).
- Phase machine transitions wave → elite → lull → boss at correct timestamps (3.3).
- Biome assignment is deterministic for the same `(x, y)` (3.4).
- Chest and HP drop rolls respect their probability ranges over 10k samples (3.5).

Do **not** add integration tests for visual feedback items in 3.6 — screen shake and hit-pause are tuned by eye, not asserted.

---

## 8. Open design questions (decide before building)

| Question | Default answer if uncertain |
|---|---|
| Does the boss end the run on death, or does the run continue endlessly after 15:00? | Run continues endlessly; bosses just punctuate. Win screen triggers at 3rd boss kill but run can continue. |
| Does pause lose no-hit / damage-free achievements? | Yes — pause is not a tactical tool. |
| Are chests always opened by contact, or do they require a Q-press to open? | Contact. Keep UI minimal. |
| Does the player carry coins between runs (meta) or does every run start fresh? | Fresh run, but keep a lifetime counter for future meta. Decide P2 items off of that. |
| Does boost cancel incoming damage during its 0.22s active window? | **Yes, add 0.22s i-frames.** Currently it's just a speed burst — add invuln to give it identity. Touch enemy projectiles: if `cooldowns.boostActiveRemaining > 0`, skip damage in `resolveCollisions`. |

---

## 9. What this plan explicitly does *not* change

- The overall visual style — steamships, low-poly, stylized water. Keep it.
- The control scheme (WASD + Q + Space). Add E or R, don't move existing keys.
- The camera. Orthographic-feel chase camera stays.
- Multiplayer, accounts, online leaderboards, analytics (all out of scope per `spec.md`).
- True terrain collision. Islands and rocks remain decorative.

Keep the footprint of changes inside the current architecture: game-loop systems in `src/game/systems/*.ts`, scene entities in `src/scene/entities/*.tsx`, UI in `src/ui/*.tsx`. No new frameworks.
