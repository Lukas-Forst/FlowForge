# Edge/Chromium Performance Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix low FPS and stalled loading in Edge/Chromium by self-hosting the DRACO decoder, setting an explicit WebGL power preference, and starting post-processing at `"lite"` quality on Chromium browsers.

**Architecture:** Three independent changes to `registry.ts` (DRACO path), `GameScene.tsx` (Canvas props + quality init), and a new `src/utils/browserPerf.ts` utility. No game logic touched. The existing fps-based auto-upgrade in `FxQualityTracker` continues to work on top of the new browser-aware default.

**Tech Stack:** React 19, react-three-fiber 9, three.js 0.183, TypeScript 6, Vite 8, `vite-plugin-static-copy` (new dev dep).

**Design source:** `docs/superpowers/specs/2026-04-24-edge-performance-design.md`

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/utils/browserPerf.ts` | `isChromiumBased()` + `getDefaultFxQuality()` |

### Modified files

| Path | Change |
|---|---|
| `package.json` | Add `vite-plugin-static-copy` to devDependencies |
| `vite.config.ts` | Add static-copy plugin to copy DRACO decoder to `public/draco/` |
| `src/assets/registry.ts` | Change DRACO decoder path from `gstatic.com` to `/draco/` |
| `src/scene/GameScene.tsx` | Three changes: `gl` prop on `<Canvas>`, `useState` init, `useRef` inits in `FxQualityTracker` |

---

## Task 1: Install vite-plugin-static-copy and self-host DRACO decoder

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/assets/registry.ts:22`

- [ ] **Step 1: Install the package**

```bash
cd /home/dfs/FlowForge
npm install --save-dev vite-plugin-static-copy
```

Expected: package added to `devDependencies` in `package.json`, no peer dep warnings.

- [ ] **Step 2: Update `vite.config.ts` to copy DRACO files**

Replace the entire file:

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

- [ ] **Step 3: Point the DRACO loader at the local path**

In `src/assets/registry.ts` line 22, change:

```ts
draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
```

to:

```ts
draco.setDecoderPath("/draco/");
```

- [ ] **Step 4: Start the dev server and verify DRACO files are served**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. In DevTools → Network tab, filter by "draco". Load the game. Confirm requests go to `localhost:5173/draco/draco_decoder.wasm` and `localhost:5173/draco/draco_decoder.js` — not to `gstatic.com`.

- [ ] **Step 5: Verify the build also copies the files**

```bash
npm run build
ls dist/draco/
```

Expected output includes: `draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/assets/registry.ts
git commit -m "feat(assets): self-host DRACO decoder to eliminate gstatic.com dependency"
```

---

## Task 2: Add `powerPreference` to the WebGL Canvas

**Files:**
- Modify: `src/scene/GameScene.tsx:335`

- [ ] **Step 1: Add the `gl` prop to `<Canvas>`**

In `src/scene/GameScene.tsx` line 335, change:

```tsx
<Canvas shadows dpr={[1, 1.8]} orthographic camera={{ position: [ISO_OFFSET, ISO_OFFSET, ISO_OFFSET], zoom: 22, near: 0.1, far: 600 }}>
```

to:

```tsx
<Canvas shadows dpr={[1, 1.8]} gl={{ powerPreference: "high-performance" }} orthographic camera={{ position: [ISO_OFFSET, ISO_OFFSET, ISO_OFFSET], zoom: 22, near: 0.1, far: 600 }}>
```

- [ ] **Step 2: Verify the build passes**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 3: Smoke test in the dev server**

```bash
npm run dev
```

Open the game. In DevTools → Console, no WebGL context errors. Game renders and plays normally.

- [ ] **Step 4: Commit**

```bash
git add src/scene/GameScene.tsx
git commit -m "feat(scene): set powerPreference high-performance on WebGL canvas"
```

---

## Task 3: Browser-aware initial FX quality

**Files:**
- Create: `src/utils/browserPerf.ts`
- Modify: `src/scene/GameScene.tsx:14,155,156,333`

**Important implementation note:** `FxQualityTracker` starts `avgFpsRef` at 60, which means `pickFxQuality("lite", 60)` would immediately upgrade back to `"full"` on the first frame — defeating B1. The fix: on Chromium, initialise `avgFpsRef` at 30 (pessimistic). The EMA smoothing takes ~20 frames (~333 ms at 60 fps) to cross the 56 fps upgrade threshold, giving the GPU time to prove itself before upgrading.

- [ ] **Step 1: Create `src/utils/browserPerf.ts`**

```ts
import type { FxQuality } from "../scene/postfx/qualityController";

export function isChromiumBased(): boolean {
  const nav = navigator as Navigator & {
    userAgentData?: { brands: { brand: string }[] };
  };
  const brands = nav.userAgentData?.brands;
  if (brands) {
    return brands.some(
      (b) =>
        b.brand === "Chromium" ||
        b.brand === "Google Chrome" ||
        b.brand === "Microsoft Edge",
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

- [ ] **Step 2: Import the new utilities in `GameScene.tsx`**

Add to the imports at the top of `src/scene/GameScene.tsx` (after existing imports):

```ts
import { isChromiumBased, getDefaultFxQuality } from "../utils/browserPerf";
```

- [ ] **Step 3: Update `FxQualityTracker` to use browser-aware initial values**

In `src/scene/GameScene.tsx`, find `FxQualityTracker` (around line 154). Change these two lines:

```ts
// Before
const avgFpsRef = useRef(60);
const qualityRef = useRef<FxQuality>("full");
```

```ts
// After
const avgFpsRef = useRef(isChromiumBased() ? 30 : 60);
const qualityRef = useRef<FxQuality>(getDefaultFxQuality());
```

- [ ] **Step 4: Update `GameScene`'s `fxQuality` state initialisation**

In `src/scene/GameScene.tsx` around line 333, change:

```ts
// Before
const [fxQuality, setFxQuality] = useState<FxQuality>("full");
```

```ts
// After
const [fxQuality, setFxQuality] = useState<FxQuality>(getDefaultFxQuality);
```

Note: pass `getDefaultFxQuality` (no parentheses) as the lazy initialiser so it only runs once on mount, not on every render.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no type errors.

- [ ] **Step 6: Smoke test in dev — Chromium path**

Open `http://localhost:5173` in Edge or Chrome (no `?fx=` param). Open DevTools → Console and run:

```js
window.__fxDebug = true; // optional — just observe PostFX visually
```

The scene should render visibly at `lite` quality (slightly less bloom) on first load. After ~5 seconds of smooth play it may upgrade to `full` automatically.

- [ ] **Step 7: Smoke test — Firefox path**

Open `http://localhost:5173` in Firefox (no `?fx=` param). Scene should render at `full` quality from the first frame.

- [ ] **Step 8: Smoke test — URL param override**

Open `http://localhost:5173?fx=full` in Edge. Scene should render at `full` quality immediately, overriding the Chromium default.

- [ ] **Step 9: Commit**

```bash
git add src/utils/browserPerf.ts src/scene/GameScene.tsx
git commit -m "feat(scene): browser-aware FX quality default — lite on Chromium, full on Firefox"
```
