import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const PORT = Number(process.env.PERF_GUARD_PORT ?? "5174");
const THRESHOLD_MS = Number(process.env.PERF_GUARD_MAX_MS ?? "400");
const TARGET_FILE = process.env.PERF_GUARD_FILE ?? "src/App.tsx";
const READY_TIMEOUT_MS = Number(process.env.PERF_GUARD_READY_TIMEOUT_MS ?? "20000");
const HMR_TIMEOUT_MS = Number(process.env.PERF_GUARD_HMR_TIMEOUT_MS ?? "8000");
const MARKER = "// perf-guard-touch";

const READY_PATTERN = /ready in|Local:\s*http/i;
const HMR_PATTERN = /(hmr update|page reload|updated modules)/i;

function fail(message) {
  console.error(`[perf:guard] FAIL: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[perf:guard] ${message}`);
}

function withTimeout(ms, onTimeout) {
  return setTimeout(onTimeout, ms);
}

async function main() {
  const original = await readFile(TARGET_FILE, "utf8");
  let restored = false;
  let startMs = 0;
  let sawReady = false;
  let hmrTimer = null;
  let readyTimer = null;

  const vite = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort", "--clearScreen", "false"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const cleanup = async () => {
    if (!restored) {
      restored = true;
      await writeFile(TARGET_FILE, original, "utf8");
    }
    if (!vite.killed) vite.kill("SIGTERM");
    if (readyTimer) clearTimeout(readyTimer);
    if (hmrTimer) clearTimeout(hmrTimer);
  };

  const onChunk = async (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (!sawReady && READY_PATTERN.test(text)) {
      sawReady = true;
      log("dev server ready; simulating one save");
      startMs = performance.now();
      await writeFile(TARGET_FILE, `${original}\n${MARKER}\n`, "utf8");
      hmrTimer = withTimeout(HMR_TIMEOUT_MS, async () => {
        await cleanup();
        fail(`no HMR signal within ${HMR_TIMEOUT_MS}ms after touching ${TARGET_FILE}`);
      });
      return;
    }

    if (sawReady && HMR_PATTERN.test(text)) {
      const elapsed = Math.round(performance.now() - startMs);
      await cleanup();
      if (elapsed > THRESHOLD_MS) {
        fail(`save latency ${elapsed}ms exceeds threshold ${THRESHOLD_MS}ms`);
      }
      log(`OK: save latency ${elapsed}ms (threshold ${THRESHOLD_MS}ms)`);
      process.exit(0);
    }
  };

  vite.stdout.on("data", (chunk) => {
    void onChunk(chunk);
  });
  vite.stderr.on("data", (chunk) => {
    void onChunk(chunk);
  });

  readyTimer = withTimeout(READY_TIMEOUT_MS, async () => {
    await cleanup();
    fail(`dev server was not ready within ${READY_TIMEOUT_MS}ms`);
  });

  vite.on("error", async (error) => {
    await cleanup();
    fail(`unable to start vite: ${String(error)}`);
  });

  vite.on("exit", async (code) => {
    await cleanup();
    if (!sawReady) {
      fail(`vite exited before becoming ready (exit code ${code ?? "unknown"})`);
    }
  });
}

await main();
