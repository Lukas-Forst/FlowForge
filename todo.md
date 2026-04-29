# Performance and Engineering Fix Plan

- [x] Replace O(n^2) audio queue draining in `src/audio/AudioManager.ts`
- [x] Fix undefined `invulnBlocked` and wire correct invulnerability reporting in `src/game/systems/collision.ts`
- [x] Add safe zero-baseline handling for upgrade deltas in `src/game/systems/upgrades.ts`
- [x] Remove `setTimeout` side effects from passive broadside and make firing simulation-tick driven
- [x] Reduce per-tick snapshot cloning overhead in `src/game/useGameState.ts`
- [x] Reduce projectile collision broad-phase cost with lightweight spatial bucketing
- [x] Reduce host multiplayer serialization churn in `src/App.tsx`

## Notes

- Goal is to keep gameplay behavior unchanged while reducing avoidable CPU + GC pressure.
- Each item will be validated with build/lint after implementation.
