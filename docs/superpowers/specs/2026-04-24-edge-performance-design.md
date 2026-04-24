# FlowForge — Edge/Chromium Performance Fix

**Status:** Design locked 2026-04-24.

## Context

FlowForge runs smoothly in Firefox but exhibits low FPS and sluggish loading in Microsoft Edge (and Chromium-based browsers generally). Root causes identified:

1. **DRACO decoder fetched from `gstatic.com` at runtime.** Edge's Tracking Prevention (Strict mode) can block or delay requests to `gstatic.com`, stalling GLB decoding during the loading phase and causing visible freezes when assets are first used.
2. **No `powerPreference` hint on the WebGL context.** On Windows, Edge defaults the WebGL power mode to `"default"`, which the OS often maps to the integrated GPU or a throttled power state. The discrete GPU (or full integrated clock) goes unused.
3. **Post-processing starts at `"full"` quality for all browsers.** The existing fps-based auto-downgrade reacts after jank is already visible. On Chromium, this means the first few seconds of gameplay run at full post-processing load.

## Goals

- GLB assets decode without any external network dependency.
- WebGL context explicitly requests high-performance GPU path on all browsers.
- Chromium-based browsers start at `"lite"` FX quality; auto-upgrade to `"full"` if fps proves stable.
- Firefox and other non-Chromium browsers are unaffected — they keep `"full"` as default.
- URL param `?fx=full|lite|off` continues to override all automatic logic.

## Non-Goals

- Changes to game logic, asset pipeline, or post-processing effects themselves.
- Mobile web support.
- Fixing Edge-specific bugs unrelated to rendering or loading.

## Architecture

### New files

| Path | Responsibility |
|---|---|
| `src/utils/browserPerf.ts` | `isChromiumBased()` detection + `getDefaultFxQuality()` |

### Modified files

| Path | Change |
|---|---|
| `vite.config.ts` | Add `vite-plugin-static-copy` to copy DRACO decoder files to `public/draco/` at build time |
| `src/assets/registry.ts` | Change DRACO decoder path from `gstatic.com` CDN to `/draco/` (same-origin) |
| `src/scene/GameScene.tsx` | Add `gl={{ powerPreference: "high-performance" }}` to `<Canvas>`; initialise `fxQuality` ref from `getDefaultFxQuality()` |
| `package.json` | Add `vite-plugin-static-copy` dev dependency |

### Untouched

All game systems, asset manifest, PostFX effects, `pickFxQuality()` fps-tracker logic, and the `?fx=` URL param override.

---

## Change A1 — Self-host DRACO decoder

`vite-plugin-static-copy` copies three files from `node_modules/three/examples/jsm/libs/draco/` into `public/draco/` during both `vite dev` and `vite build`:

- `draco_decoder.js`
- `draco_decoder.wasm`
- `draco_wasm_wrapper.js`

Total size: ~800 KB. Served from same origin, cached permanently after first visit, decoded off the main thread via WASM — no main-thread cost.

`registry.ts` change (one line):

```ts
// Before
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");

// After
draco.setDecoderPath("/draco/");
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/three/examples/jsm/libs/draco/*",
          dest: "draco",
        },
      ],
    }),
  ],
});
```

---

## Change A2 — Canvas `powerPreference`

`GameScene.tsx` `<Canvas>` gains a `gl` prop:

```tsx
// Before
<Canvas shadows dpr={[1, 1.8]} orthographic camera={...}>

// After
<Canvas shadows dpr={[1, 1.8]} gl={{ powerPreference: "high-performance" }} orthographic camera={...}>
```

This is a WebGL context creation attribute. It tells the OS GPU scheduler to use the discrete GPU if available, or at minimum the full clock speed of the integrated GPU. Safe to set on all browsers and platforms.

---

## Change B1 — Browser-aware initial FX quality

### `src/utils/browserPerf.ts`

```ts
import type { FxQuality } from "../scene/postfx/qualityController";

export function isChromiumBased(): boolean {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } })
    .userAgentData?.brands;
  if (brands) {
    return brands.some(
      (b) => b.brand === "Chromium" || b.brand === "Google Chrome" || b.brand === "Microsoft Edge",
    );
  }
  return "chrome" in window || /Edg\//.test(navigator.userAgent);
}

export function getDefaultFxQuality(): FxQuality {
  const param = new URLSearchParams(location.search).get("fx");
  if (param === "full" || param === "lite") return param;
  return isChromiumBased() ? "lite" : "full";
}
```

### `GameScene.tsx`

The `useRef` initialisation on the quality tracker changes from the hardcoded `"full"` to the detected default:

```ts
// Before
const qualityRef = useRef<FxQuality>("full");

// After
const qualityRef = useRef<FxQuality>(getDefaultFxQuality());
```

The existing `pickFxQuality(current, avgFps)` logic is untouched. On a Chromium browser with a fast GPU, it will upgrade from `"lite"` to `"full"` automatically once fps stabilises above 56.

---

## Testing

### Manual

| Check | Expected |
|---|---|
| Open in Edge — loading screen | No network request to `gstatic.com` in DevTools Network tab |
| Open in Edge — gameplay | FPS stable; starts at `lite` post-processing |
| Open in Firefox — gameplay | Starts at `full` post-processing |
| `?fx=full` in Edge | Overrides to `full` regardless of browser detection |
| `?fx=lite` in Firefox | Overrides to `lite` regardless of browser detection |
| `?fx=off` any browser | No PostFX composer mounted |
| Edge on good GPU — 60 fps for 5 s | Auto-upgrades from `lite` to `full` |
| Edge on slow GPU — fps < 45 | Stays at or downgrades to `lite` |

### Build

`npm run build` must succeed with the new Vite plugin. `public/draco/` must contain the three decoder files in the build output.
