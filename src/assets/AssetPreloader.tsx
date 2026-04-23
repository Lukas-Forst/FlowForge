import { useEffect } from "react";
import type { ReactElement } from "react";
import { assetsByTier, getAsset } from "./registry";
import type { AssetTier } from "./manifest";

interface AssetPreloaderProps {
  tier: AssetTier;
  onProgress?: (progress: number, label: string) => void;
  onComplete?: () => void;
}

export function AssetPreloader({ tier, onProgress, onComplete }: AssetPreloaderProps): ReactElement | null {
  useEffect(() => {
    let cancelled = false;
    const entries = assetsByTier(tier);
    const total = Math.max(1, entries.length);
    let done = 0;

    onProgress?.(0, `Loading ${tier} assets...`);

    const run = async () => {
      for (const entry of entries) {
        if (cancelled) return;
        try {
          await getAsset(entry.id);
        } catch {
          // Keep progressing even if one asset fails; runtime components still have fallbacks.
        }
        done += 1;
        onProgress?.(done / total, entry.id);
      }
      if (!cancelled) {
        onProgress?.(1, "");
        onComplete?.();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [onComplete, onProgress, tier]);

  return null;
}
