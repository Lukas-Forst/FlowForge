import type { BiomeTheme } from "../game/types";
import { RUN_ARC_BIOME_LERP_SEC, RUN_ARC_P1_END, RUN_ARC_P2_END, RUN_ARC_P3_END } from "../game/systems/runArc";
import { BIOME_THEMES } from "./biomeThemes";

function lerpColor(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16);
  const ag = parseInt(pa.slice(2, 4), 16);
  const ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16);
  const bg = parseInt(pb.slice(2, 4), 16);
  const bb = parseInt(pb.slice(4, 6), 16);
  const u = Math.min(1, Math.max(0, t));
  const r = Math.round(ar + (br - ar) * u);
  const g = Math.round(ag + (bg - ag) * u);
  const bl = Math.round(ab + (bb - ab) * u);
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function lerpVec3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const u = Math.min(1, Math.max(0, t));
  return [lerpNumber(a[0], b[0], u), lerpNumber(a[1], b[1], u), lerpNumber(a[2], b[2], u)];
}

function lerpTheme(a: BiomeTheme, b: BiomeTheme, t: number): BiomeTheme {
  return {
    waterColor: lerpColor(a.waterColor, b.waterColor, t),
    waterRoughness: lerpNumber(a.waterRoughness, b.waterRoughness, t),
    waterClearcoat: lerpNumber(a.waterClearcoat, b.waterClearcoat, t),
    bumpScale: lerpNumber(a.bumpScale, b.bumpScale, t),
    waterEmissive: lerpColor(a.waterEmissive, b.waterEmissive, t),
    waterEmissiveIntensity: lerpNumber(a.waterEmissiveIntensity, b.waterEmissiveIntensity, t),
    waveHeight: lerpNumber(a.waveHeight, b.waveHeight, t),
    waveSpeed: lerpNumber(a.waveSpeed, b.waveSpeed, t),
    shimmerColor: lerpColor(a.shimmerColor, b.shimmerColor, t),
    shimmerOpacity: lerpNumber(a.shimmerOpacity, b.shimmerOpacity, t),
    backgroundColor: lerpColor(a.backgroundColor, b.backgroundColor, t),
    ambient: {
      color: lerpColor(a.ambient.color, b.ambient.color, t),
      intensity: lerpNumber(a.ambient.intensity, b.ambient.intensity, t),
    },
    directional: {
      color: lerpColor(a.directional.color, b.directional.color, t),
      intensity: lerpNumber(a.directional.intensity, b.directional.intensity, t),
      position: lerpVec3(a.directional.position, b.directional.position, t),
    },
    rim: {
      color: lerpColor(a.rim.color, b.rim.color, t),
      intensity: lerpNumber(a.rim.intensity, b.rim.intensity, t),
    },
    fog: {
      color: lerpColor(a.fog.color, b.fog.color, t),
      near: lerpNumber(a.fog.near, b.fog.near, t),
      far: lerpNumber(a.fog.far, b.fog.far, t),
    },
  };
}

export function getBlendedRunArcTheme(elapsed: number): BiomeTheme {
  const L = RUN_ARC_BIOME_LERP_SEC;
  const b = BIOME_THEMES;
  if (elapsed < RUN_ARC_P1_END) return b.open_sea;
  if (elapsed < RUN_ARC_P1_END + L) return lerpTheme(b.open_sea, b.island_chain, (elapsed - RUN_ARC_P1_END) / L);
  if (elapsed < RUN_ARC_P2_END) return b.island_chain;
  if (elapsed < RUN_ARC_P2_END + L) return lerpTheme(b.island_chain, b.deep_waters, (elapsed - RUN_ARC_P2_END) / L);
  if (elapsed < RUN_ARC_P3_END) return b.deep_waters;
  if (elapsed < RUN_ARC_P3_END + L) return lerpTheme(b.deep_waters, b.boss_storm, (elapsed - RUN_ARC_P3_END) / L);
  return b.boss_storm;
}
