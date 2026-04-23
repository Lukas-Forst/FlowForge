// Walk assets-sources/ and emit DRACO+WebP optimized GLBs into public/assets/models/.

import { readdir, mkdir } from "node:fs/promises";
import { join, relative, dirname, extname } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, simplify, textureCompress, draco as dracoTransform } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";
import draco3d from "draco3dgltf";

const SRC = "assets-sources";
const DST = "public/assets/models";

function simplifyRatio(relPath) {
  if (relPath.includes("ships")) return 0.45;
  if (relPath.includes("structures")) return 0.4;
  return 0.35;
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

async function optimizeOne(srcPath, io) {
  const rel = relative(SRC, srcPath);
  const dstPath = join(DST, rel);
  await mkdir(dirname(dstPath), { recursive: true });
  const doc = await io.read(srcPath);

  await doc.transform(
    dedup(),
    prune({ keepLeaves: false }),
    simplify({ simplifier: MeshoptSimplifier, ratio: simplifyRatio(rel), error: 0.015 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
    dracoTransform({ method: "edgebreaker", encodeSpeed: 5, decodeSpeed: 5 }),
  );

  await io.write(dstPath, doc);
  console.log(`[optimize] ${rel}`);
}

async function main() {
  const sources = await walkGlb(SRC);
  if (sources.length === 0) {
    console.warn(`[optimize] no GLBs found in ${SRC}/`);
    return;
  }

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.encoder": await draco3d.createEncoderModule(),
      "draco3d.decoder": await draco3d.createDecoderModule(),
    });

  console.log(`[optimize] ${sources.length} GLB(s) -> ${DST}/`);
  for (const src of sources) {
    try {
      await optimizeOne(src, io);
    } catch (error) {
      console.warn(`[optimize] skip ${src}`);
      console.warn(error);
    }
  }
  console.log("[optimize] done");
}

await main();
