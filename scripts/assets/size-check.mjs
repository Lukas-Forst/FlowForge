// Fails the build if public/assets/** exceeds MAX_BYTES.
// Wired into npm run build via package.json prebuild hook.

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const MAX_BYTES = 25 * 1024 * 1024;
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

try {
  const total = await walkSize(ROOT);
  const mb = (total / 1024 / 1024).toFixed(2);
  if (total > MAX_BYTES) {
    console.error(`[size-check] FAIL: ${ROOT} is ${mb} MB (limit ${MAX_BYTES / 1024 / 1024} MB)`);
    process.exit(1);
  }
  console.log(`[size-check] OK: ${ROOT} is ${mb} MB (limit ${MAX_BYTES / 1024 / 1024} MB)`);
} catch (error) {
  console.error(`[size-check] FAIL: unable to scan ${ROOT}`);
  console.error(error);
  process.exit(1);
}
