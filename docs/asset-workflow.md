# Asset workflow

## Sources

Raw Meshy and Blender exports live in `assets-sources/` (gitignored). Mirror the target layout:

    assets-sources/
      ships/Main_ship.glb
      ships/Enemy_ship_basic.glb
      props/Meshy_AI_Mysterious_crystal_fo_0423094924_texture.glb

## Optimize

    npm run assets:optimize

This writes compressed outputs to `public/assets/models/`.

## Size gate

    npm run assets:size-check

This runs automatically before `npm run build` and fails if `public/assets/**` exceeds 25 MB.

## Tier declaration

Every runtime-loaded GLB is declared in `src/assets/manifest.ts` with one tier:
`critical` (boot blocking), `biome` (start screen background load), or `deferred` (in-run stream).
