// Generate prop 3D models via Meshy AI text-to-3D API.
// Each prop runs: preview (geometry) → refine (texture) → download GLB.
//
// Usage:
//   MESHY_API_KEY=your_key node scripts/meshy/generate-props.mjs
//   MESHY_API_KEY=your_key node scripts/meshy/generate-props.mjs --dry-run
//   MESHY_API_KEY=your_key node scripts/meshy/generate-props.mjs --only propBarrel,propBuoy
//
// Output: assets-sources/props/<filename>.glb
// Then run: npm run assets:optimize

import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const OUT_DIR = join(ROOT, "assets-sources/props");

const MESHY_API = "https://api.meshy.ai/openapi/v2";
const API_KEY = process.env.MESHY_API_KEY;

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY_ARG = process.argv.find((a) => a.startsWith("--only="));
const ONLY = ONLY_ARG ? new Set(ONLY_ARG.slice(7).split(",")) : null;

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const PROPS = [
  {
    id: "propBarrel",
    filename: "prop_barrel.glb",
    prompt:
      "A weathered wooden barrel with iron bands, sea-worn and mossy, stylized low-poly pirate game asset, isolated object on transparent background",
    negativePrompt:
      "realistic, photorealistic, high poly, text, label, ground, floor, background, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propBuoy",
    filename: "prop_buoy.glb",
    prompt:
      "A round ocean navigation buoy with red and white stripes, rusted metal, floating, stylized low-poly pirate game asset, isolated object",
    negativePrompt:
      "realistic, photorealistic, high poly, text, water, ocean, ground, background, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propCrystal",
    filename: "prop_crystal.glb",
    prompt:
      "A cluster of mysterious glowing crystals rising from a rocky base, blue-green magical energy, fantasy pirate game asset, low-poly stylized, isolated object",
    negativePrompt:
      "realistic, photorealistic, high poly, dark, ground, water, background, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propPalm",
    filename: "prop_palm.glb",
    prompt:
      "A single stylized tropical palm tree slightly leaning, warm sunset colors, low-poly pirate game asset, isolated object with visible trunk base",
    negativePrompt:
      "realistic, photorealistic, high poly, multiple trees, forest, ground, background, roots, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propIsland",
    filename: "prop_island.glb",
    prompt:
      "A small stylized tropical island with sandy beach and two palm trees seen from a slight top-down angle, low-poly pirate game asset, isolated floating island",
    negativePrompt:
      "realistic, photorealistic, high poly, people, buildings, ocean water, flat, background, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propRock",
    filename: "prop_rock.glb",
    prompt:
      "A cluster of jagged sea rocks partially covered in barnacles and seaweed, stylized low-poly pirate game asset, isolated object",
    negativePrompt:
      "realistic, photorealistic, high poly, ground, background, water, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
  {
    id: "propWreck",
    filename: "prop_wreck.glb",
    prompt:
      "A sunken ship wreck half-submerged, broken wooden hull with torn sails and barnacles, stylized low-poly pirate game asset, isolated object",
    negativePrompt:
      "realistic, photorealistic, high poly, people, ground, background, water, shadow",
<<<<<<< HEAD
    artStyle: "realistic",
=======
    artStyle: "cartoon",
>>>>>>> arklight/claude/improve-flowforge-playability-GWlZo
  },
];

// ---------------------------------------------------------------------------
// Meshy API helpers
// ---------------------------------------------------------------------------

async function meshyPost(endpoint, body) {
  const res = await fetch(`${MESHY_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function meshyGet(endpoint) {
  const res = await fetch(`${MESHY_API}${endpoint}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function poll(taskId, label, intervalMs = 8000, timeoutMs = 15 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const task = await meshyGet(`/text-to-3d/${taskId}`);
    const pct = task.progress != null ? `${task.progress}%` : "?%";
    process.stdout.write(`\r    [${label}] ${task.status} ${pct}   `);
    if (task.status === "SUCCEEDED") {
      process.stdout.write("\n");
      return task;
    }
    if (task.status === "FAILED" || task.status === "EXPIRED") {
      process.stdout.write("\n");
      throw new Error(
        `Task ${taskId} ${task.status}: ${task.task_error?.message ?? "no details"}`
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Task ${taskId} timed out after ${timeoutMs / 1000}s`);
}

async function downloadGlb(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

// ---------------------------------------------------------------------------
// Single prop pipeline: preview → refine (texture) → download
// ---------------------------------------------------------------------------

async function generateProp(prop) {
  // Step 1 — preview (geometry only, fast)
  console.log(`\n[${prop.id}] Submitting preview task...`);
  const { result: previewId } = await meshyPost("/text-to-3d", {
    mode: "preview",
    prompt: prop.prompt,
    negative_prompt: prop.negativePrompt,
    art_style: prop.artStyle,
    should_remesh: true,
  });
  console.log(`    preview task id: ${previewId}`);
  await poll(previewId, "geometry");

  // Step 2 — refine (adds PBR texture to preview geometry)
  console.log(`[${prop.id}] Submitting texture refinement...`);
  const { result: refineId } = await meshyPost("/text-to-3d", {
    mode: "refine",
    preview_task_id: previewId,
  });
  console.log(`    refine task id:  ${refineId}`);
  const refined = await poll(refineId, "texture ");

  // Step 3 — download GLB
  const glbUrl = refined.model_urls?.glb;
  if (!glbUrl) throw new Error(`No GLB URL returned for task ${refineId}`);

  const destPath = join(OUT_DIR, prop.filename);
  console.log(`[${prop.id}] Downloading GLB...`);
  await downloadGlb(glbUrl, destPath);
  console.log(`[${prop.id}] ✓ saved → assets-sources/props/${prop.filename}`);

  return prop.filename;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const activeProps = ONLY ? PROPS.filter((p) => ONLY.has(p.id)) : PROPS;

  if (DRY_RUN) {
    console.log("=== DRY RUN (no API calls) ===");
    for (const p of activeProps) {
      console.log(`  ${p.id}`);
      console.log(`    prompt:   ${p.prompt.slice(0, 80)}...`);
      console.log(`    output:   assets-sources/props/${p.filename}`);
    }
    console.log(`\n${activeProps.length} prop(s) would be generated.`);
    return;
  }

  if (!API_KEY) {
    console.error("Error: set MESHY_API_KEY environment variable");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating ${activeProps.length} prop(s)…\n`);

  const results = [];
  for (const prop of activeProps) {
    try {
      const filename = await generateProp(prop);
      results.push({ id: prop.id, filename, ok: true });
    } catch (err) {
      console.error(`\n[${prop.id}] FAILED: ${err.message}`);
      results.push({ id: prop.id, filename: null, ok: false });
    }
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"}  ${r.id}: ${r.filename ?? "FAILED"}`);
  }

  const ok = results.filter((r) => r.ok);
  if (ok.length > 0) {
    console.log(`\n${ok.length} model(s) saved to assets-sources/props/`);
    console.log("Next: npm run assets:optimize   (DRACO + WebP compression)");
  }
}

await main();
