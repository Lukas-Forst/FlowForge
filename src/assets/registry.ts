import { useEffect, useState } from "react";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MANIFEST, type AssetEntry, type AssetTier } from "./manifest";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; scene: THREE.Group }
  | { status: "error"; error: unknown };

const states = new Map<string, LoadState>();
const subscribers = new Set<() => void>();
const inflight = new Map<string, Promise<THREE.Group>>();
const loadedIds = new Set<string>();

let sharedLoader: GLTFLoader | null = null;
function getLoader(): GLTFLoader {
  if (sharedLoader) return sharedLoader;
  const draco = new DRACOLoader();
  draco.setDecoderPath("/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  sharedLoader = loader;
  return loader;
}

function notify(): void {
  for (const fn of subscribers) fn();
}

export function assetsByTier(tier: AssetTier): AssetEntry[] {
  return Object.values(MANIFEST).filter((e) => e.tier === tier);
}

export function markLoaded(id: string): void {
  if (MANIFEST[id]) {
    loadedIds.add(id);
  }
}

export function getProgress(tier: AssetTier): number {
  const entries = assetsByTier(tier);
  if (entries.length === 0) return 1;
  let ready = 0;
  for (const e of entries) {
    if (loadedIds.has(e.id)) ready += 1;
  }
  return ready / entries.length;
}

export async function getAsset(id: string): Promise<THREE.Group> {
  const existing = states.get(id);
  if (existing?.status === "ready") {
    return existing.scene;
  }
  if (inflight.has(id)) {
    return inflight.get(id)!;
  }
  const entry = MANIFEST[id];
  if (!entry) {
    const error = new Error(`Unknown asset id: ${id}`);
    states.set(id, { status: "error", error });
    throw error;
  }

  states.set(id, { status: "loading" });
  notify();

  const p = new Promise<THREE.Group>((resolve, reject) => {
    getLoader().load(
      entry.path,
      (gltf) => {
        states.set(id, { status: "ready", scene: gltf.scene });
        inflight.delete(id);
        loadedIds.add(id);
        notify();
        resolve(gltf.scene);
      },
      undefined,
      (error) => {
        states.set(id, { status: "error", error });
        inflight.delete(id);
        notify();
        reject(error);
      },
    );
  });

  inflight.set(id, p);
  return p;
}

export function useAsset(id: string): THREE.Group | null {
  const [scene, setScene] = useState<THREE.Group | null>(() => {
    const st = states.get(id);
    return st?.status === "ready" ? st.scene : null;
  });

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      const st = states.get(id);
      if (st?.status === "ready") {
        setScene(st.scene);
      } else {
        setScene(null);
      }
    };
    subscribers.add(sync);
    sync();
    void getAsset(id).then(sync).catch(() => sync());
    return () => {
      cancelled = true;
      subscribers.delete(sync);
    };
  }, [id]);

  return scene;
}

export function __resetRegistryForTests(): void {
  states.clear();
  inflight.clear();
  loadedIds.clear();
}
