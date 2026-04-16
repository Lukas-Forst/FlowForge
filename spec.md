# FlowForge — Specification

------

## Overview

FlowForge is a browser-based pirate-themed rogue-like action game inspired by the play style of Vampire Survivors. Players control a pirate ship, survive as long as possible, destroy enemies, and improve their ship through upgrades during each run. It is designed as a simple, relaxing game that people can jump into quickly, play for a short time, and enjoy without friction.

------

## Background & Problem Statement

The project is being built for the VibeJam contest on Twitter. The main challenge is turning a rough prototype into something that already feels like a real game instead of a placeholder demo. Right now, the biggest gaps are visual identity, readable combat, and a tight progression loop that makes repeated runs satisfying.

The game needs to stay small enough to finish in jam scope while still feeling polished. That means focusing on one strong browser-based gameplay loop, simple controls, and a clear pirate-themed 2.5D presentation.

------

## Goals

- Deliver a working browser game for the VibeJam contest.
- Create a fun, low-friction survival loop that works in short play sessions.
- Give players a clear sense of progression through ship upgrades during a run.
- Establish a strong pirate-themed 2.5D visual identity.
- Build a polished v1 that could later be expanded into a commercial product.

------

## Non-Goals

- Do not build a story-driven RPG.
- Do not include multiplayer in v1.
- Do not require accounts, login, or user profiles.
- Do not collect player data.
- Do not add many different abilities in v1.
- Do not build a true voxel sandbox or complex ship builder.

------

## User Roles

### Player

- Can open the game in the browser and start immediately.
- Can control a pirate ship using keyboard controls.
- Can survive waves, destroy enemies, collect coins, and choose upgrades.
- Can use active abilities and benefit from automatic attacks.
- Cannot create an account or store personal progress online.

### Developer / Creator

- Can tune balancing, enemy pacing, upgrades, ship visuals, and game feel.
- Can create or generate art assets for the ship, enemies, and world.
- Can decide the final visual direction and contest-ready scope.
- Cannot rely on analytics or player data collection in v1.

### Guest / Unauthenticated User

- Can access the full core game loop without signing up.
- Can play complete runs directly in the browser.
- Cannot access online saves, profiles, or social systems.

------

## User Stories

- As a player, I want to start a run instantly so that I can play without setup friction.
- As a player, I want automatic attacks so that I can focus on movement and positioning.
- As a player, I want an active cannon ability so that I still have moments of deliberate input and timing.
- As a player, I want upgrades during a run so that my ship feels stronger over time.
- As a player, I want score to reward both survival and combat so that different play styles still feel valid.

------

## Core Features

### 1. Browser-Based Survival Gameplay

The game runs directly in the browser and starts quickly. The player controls a pirate ship and tries to survive as long as possible while enemy pressure increases. The run ends when the ship’s HP reaches zero.

### 2. Ship Control and Movement

The player moves the ship with WASD. The ship’s facing direction matters because the active cannon salvo fires in the direction the ship is facing. Movement should feel responsive and readable at all times.

### 3. Automatic Base Attack

The base attack behaves like Vampire Survivors: it is automatic rather than manually aimed. This keeps the core loop simple and lets the player focus on survival, pathing, and collecting coins. The automatic attack system should still feel satisfying and frequent enough to support the pirate combat fantasy.

### 4. Active Ability System

The player has active ability inputs on Q, E, R, and Space. In v1, the key active ability is a cannon salvo that fires in the current direction of the ship. Additional ability slots may exist in the input model already, but v1 should avoid expanding ability scope unless needed.

### 5. Upgrade System

The player can choose upgrades during a run after collecting enough coins. The current rule is: upgrades appear after collecting `20 + n` coins, where `n` increases by 1 after each upgrade. Initial upgrade options are:
- Fire rate increase
- Ship speed increase
- Ability cooldown reduction

This system should be simple, repeatable, and easy to balance for jam scope.

### 6. Score System

Player performance is measured using a mix of time alive and enemies killed. This allows the game to reward both survival and aggressive play. The end-of-run screen should clearly show the final result.

### 7. Pirate 2.5D Presentation

The player ship starts as a simple pirate or steamship-style vessel and becomes stronger through upgrades such as added cannons. The visual target is a 2.5D browser game with a stylized low-poly or voxel-inspired look. The art style should be chosen for speed of production, readability, and charm rather than realism.

------

## User Flows

### Start a Run

1. The player opens the game in the browser.
2. The player starts the game from a simple start screen.
3. The player takes control of the ship immediately.
4. Enemies begin spawning and the survival loop starts.

### Survive and Upgrade

1. The player moves the ship, avoids damage, and automatically attacks.
2. The player collects coins dropped during play.
3. Once the coin threshold is reached, an upgrade choice appears.
4. The player selects one upgrade.
5. The run continues with stronger ship stats.

### Use Cannon Salvo

1. The player faces the ship toward the desired direction.
2. The player presses the assigned ability key.
3. The ship fires a cannon salvo in that direction.
4. The ability goes on cooldown.
5. The player can reduce future cooldowns through upgrades.

### End a Run

1. The ship loses all HP.
2. The run ends.
3. The player sees a score summary based on time survived and enemies killed.
4. The player can restart quickly.

------

## Notifications & Emails

No emails or notifications are planned for v1.

| Trigger | Recipient | Content | Timing |
| ------- | --------- | ------- | ------ |
| None | None | None | None |

------

## Error States & Edge Cases

- If the game fails to load some visual assets, it should fall back to simple placeholder meshes rather than become unplayable.
- If the player presses unsupported keys, the game should ignore them safely.
- If the player activates an ability while it is on cooldown, the input should be ignored and cooldown feedback should remain clear.
- If the player reaches the upgrade threshold during a chaotic combat moment, the upgrade prompt should pause or safely interrupt gameplay in a predictable way.
- If the player dies at the same time as a coin pickup or upgrade trigger, the run should resolve cleanly.
- If browser performance drops, gameplay responsiveness should take priority over effects.
- If no enemies are present briefly, the game should still feel intentional rather than broken.

------

## Constraints

- The game must run in the browser.
- The game must not collect personal user data.
- The game must not require authentication.
- The game must remain small enough to complete within jam scope.
- The first version should focus on one polished gameplay loop.
- Controls must remain keyboard-focused and simple.
- The visual style should be achievable quickly and support a 2.5D look.

------

## Assumptions

- Players are willing to play without accounts or online progression.
- Automatic attacks reduce friction and improve accessibility for short sessions.
- A single strong active ability is enough for v1.
- A small upgrade pool is enough to make repeated runs satisfying.
- A low-poly or voxel-inspired 2.5D style is the fastest path to a polished look.

------

## Open Questions

| Question | Owner | Due |
| -------- | ----- | --- |
| Which of Q, E, R, or Space triggers the cannon salvo in v1? | Lukas | Before input implementation |
| Are Q/E/R reserved for future abilities or should they stay unused in v1? | Lukas | Before UI/input lock |
| Does the ship rotate freely toward movement direction, cursor direction, or a fixed directional model? | Lukas | Before movement/combat lock |
| Are coin drops guaranteed per enemy or based on chance/value tiers? | Lukas | Before economy balance |
| How exactly are time survived and kills weighted in the final score? | Lukas | Before end screen implementation |
| Does the upgrade screen pause gameplay fully or partially? | Lukas | Before UX lock |

------

## Out of Scope (v1)

- Multiplayer or co-op
- Online leaderboards
- User accounts
- Cloud saves
- Story mode
- Complex ship customization
- Large ability roster
- Social features
- Analytics and notifications
- True voxel terrain or destructible world systems

------

## Technical Stack

- **Backend** — None or minimal static hosting
- **Frontend** — React
- **Game Rendering** — Three.js via React Three Fiber
- **Database** — None
- **Styling** — Minimal HTML/CSS UI plus in-canvas rendering
- **Authentication** — None
- **Visual Approach** — 2.5D low-poly / voxel-inspired assets with orthographic-style presentation

------

## Key Dependencies & Integrations

| Service | Purpose | Notes |
| ------- | ------- | ----- |
| Three.js | 3D rendering for browser game | Good fit for 2.5D scene presentation with orthographic camera |
| React Three Fiber | Declarative React renderer for Three.js | Helps structure scene and gameplay UI cleanly |
| Asset generation tooling | Ship, enemy, and environment creation | Prefer stylized low-poly / voxel-inspired pipeline |
| VibeJam contest platform | Submission target | Scope should stay jam-sized |

------

## Security & Privacy

- No personal user data should be collected.
- No login or account system should exist in v1.
- No trackers or analytics should be added in v1.
- Any local settings or save data, if added later, should avoid personal information.
- Privacy simplicity is a core product requirement.

------

## Success Metrics

- A working playable version is submitted to the VibeJam contest.
- Players can start a run in the browser immediately and without explanation.
- The game loop of moving, surviving, killing enemies, collecting coins, and upgrading feels complete.
- The visual presentation reads clearly as pirate-themed and 2.5D.
- The prototype feels like a real game rather than a placeholder.
- Early player feedback describes the game as fun, simple, and easy to jump into.
