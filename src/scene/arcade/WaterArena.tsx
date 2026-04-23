import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { NavBuoyProp } from "./props/NavBuoyProp";
import { BarrelDebrisProp } from "./props/BarrelDebrisProp";
import { IslandProp } from "./props/IslandProp";
import { CrystalSpireProp } from "./props/CrystalSpireProp";
import { RockOutcropProp } from "./props/RockOutcropProp";
import { RuinedDockProp } from "./props/RuinedDockProp";
import { GltfMeshyProp } from "./props/GltfMeshyProp";
import { MESHY_PROP } from "./props/meshyUrls";
import type { BiomeTheme, BiomeType } from "../../game/types";
import { RUN_ARC_P2_END, RUN_ARC_P3_END } from "../../game/systems/runArc";

/** Low-frequency bump for gentle light catch on the water surface. */
function createCalmBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let n = 0; n < 14; n += 1) {
    const bx = Math.random() * canvas.width;
    const by = Math.random() * canvas.height;
    const r = 40 + Math.random() * 90;
    const grd = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    const lift = Math.random() > 0.5;
    const inner = lift ? "rgb(168,176,182)" : "rgb(96,102,108)";
    const outer = "rgb(128,128,128)";
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    ctx.globalAlpha = 0.35 + Math.random() * 0.25;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.35, 1.35);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}


function hash2(i: number, j: number): number {
  return ((i * 73856093) ^ (j * 19349663) ^ (i * j * 83492791)) >>> 0;
}

function BobbingProp({
  wx,
  wz,
  scale,
  seed,
  child,
}: {
  wx: number;
  wz: number;
  scale: number;
  seed: number;
  child: ReactElement;
}): ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state) => {
    if (!groupRef.current) return;
    const time = _state.clock.elapsedTime;
    const bob = Math.sin(time * 1.5 + seed * 10 + wx * 0.1) * 0.08 + Math.cos(time * 0.8 + wz * 0.1) * 0.04;
    groupRef.current.position.y = 0.04 + bob;
    groupRef.current.rotation.z = Math.sin(time * 1.2 + seed * 5) * 0.10;
    groupRef.current.rotation.x = Math.cos(time * 1.1 + seed * 5) * 0.10;
  });

  return (
    <group ref={groupRef} position={[wx, 0.04, wz]} scale={scale}>
      {child}
    </group>
  );
}

/** Sparse world-anchored props in a grid so the sea feels endless without a visible arena rim. */
function ScatteredSeaProps({
  centerX,
  centerZ,
  biome,
  elapsedTotal,
}: {
  centerX: number;
  centerZ: number;
  biome: BiomeType;
  elapsedTotal: number;
}): ReactElement {
  if (biome === "boss_storm") {
    return <group />;
  }

  const CELL = 40;
  const viewHalf = 180;
  const i0 = Math.floor((centerX - viewHalf) / CELL);
  const i1 = Math.floor((centerX + viewHalf) / CELL);
  const j0 = Math.floor((centerZ - viewHalf) / CELL);
  const j1 = Math.floor((centerZ + viewHalf) / CELL);

  const inDeepChaos = elapsedTotal >= RUN_ARC_P2_END && elapsedTotal < RUN_ARC_P3_END;
  const crystalMod = inDeepChaos ? 4 : 6;

  const items: ReactElement[] = [];
  for (let i = i0; i <= i1; i += 1) {
    for (let j = j0; j <= j1; j += 1) {
      const h = hash2(i, j);
      const wx = i * CELL + ((h % 100) / 100 - 0.5) * CELL * 0.8;
      const wz = j * CELL + (((h >> 8) % 100) / 100 - 0.5) * CELL * 0.8;

      if (biome === "open_sea") {
        if (h % 5 === 0) {
          const variant = (h >> 17) % 3;
          const child = h % 2 === 0
            ? (
                <GltfMeshyProp assetId={MESHY_PROP.navBuoy} scale={0.5} yOff={-0.05}>
                  <NavBuoyProp variant={variant} />
                </GltfMeshyProp>
              )
            : (
                <GltfMeshyProp assetId={MESHY_PROP.barrel} scale={0.55} yOff={0.05}>
                  <BarrelDebrisProp variant={variant} />
                </GltfMeshyProp>
              );
          items.push(<BobbingProp key={`os-${i}-${j}`} wx={wx} wz={wz} scale={0.9} seed={h} child={child} />);
        }
      } else if (biome === "island_chain") {
        if (h % 3 === 0) {
          const size = 1.0 + ((h >> 16) % 100) / 75;
          items.push(
            <group key={`isl-${i}-${j}`} position={[wx, 0, wz]}>
              <GltfMeshyProp assetId={MESHY_PROP.tropicalIsland} scale={0.9 * size} yOff={0.02}>
                <IslandProp seed={h} size={size} />
              </GltfMeshyProp>
            </group>
          );
        } else if (h % 11 === 0) {
          items.push(
            <group key={`rock-${i}-${j}`} position={[wx, 0, wz]}>
              <RockOutcropProp seed={h} />
            </group>
          );
        } else if (h % 13 === 0) {
          items.push(
            <group key={`dock-${i}-${j}`} position={[wx, 0, wz]} rotation={[0, (h % 100) * 0.04, 0]}>
              <RuinedDockProp />
            </group>
          );
        }
      } else if (biome === "deep_waters") {
        if (h % crystalMod === 0) {
          items.push(
            <group key={`crys-${i}-${j}`} position={[wx, -0.6, wz]}>
              <GltfMeshyProp assetId={MESHY_PROP.crystal} scale={0.45} yOff={0}>
                <CrystalSpireProp seed={h} />
              </GltfMeshyProp>
            </group>
          );
        }
      }
    }
  }
  return <group>{items}</group>;
}



interface WaterArenaProps {
  playerX: number;
  playerZ: number;
  theme: BiomeTheme;
  biome: BiomeType;
  /** Used for run-arc–dependent prop density (e.g. deeper crystals 12–18 min). */
  elapsedTotal: number;
}

export function WaterArena({ playerX, playerZ, theme, biome, elapsedTotal }: WaterArenaProps): ReactElement {
  const bumpMap = useMemo(() => createCalmBumpTexture(), []);
  const meshRef = useRef<THREE.Mesh>(null);
  const basePositions = useRef<Float32Array | null>(null);
  const normalTimer = useRef(0);
  const playerRef = useRef({ x: playerX, z: playerZ });
  playerRef.current = { x: playerX, z: playerZ };

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;

    if (!basePositions.current) {
      basePositions.current = new Float32Array(pos.array as unknown as Float32Array);
    }

    const verts = pos.array as unknown as Float32Array;
    const base = basePositions.current;
    const t = _state.clock.elapsedTime;
    const ws = theme.waveSpeed;
    const wh = theme.waveHeight;
    const px = playerRef.current.x;
    const pz = playerRef.current.z;

    for (let i = 0; i < verts.length; i += 3) {
      // base[i] = local X → world X; after rotation -PI/2 on X, world Z = pz - local Y.
      const bx = (base[i] ?? 0) + px;
      const bz = -(base[i + 1] ?? 0) + pz;

      const waveA = Math.sin(bx * 0.11 + t * 1.65 * ws + bz * 0.07) * (0.13 * wh);
      const waveB = Math.cos(bz * 0.09 - t * 1.25 * ws + bx * 0.04) * (0.10 * wh);
      const chop =
        Math.sin(bx * 0.32 + t * 2.9 * ws) *
        Math.cos(bz * 0.28 - t * 2.5 * ws) *
        (0.03 * wh);

      // local Z = world Y (up/down) after rotation={[-Math.PI/2, 0, 0]}
      verts[i + 2] = (base[i + 2] ?? 0) + waveA + waveB + chop;
    }

    pos.needsUpdate = true;

    // Throttle normal recompute to avoid per-frame CPU cost.
    normalTimer.current += delta;
    if (normalTimer.current >= 0.12) {
      normalTimer.current = 0;
      geo.computeVertexNormals();
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[playerX, -0.02, playerZ]}
        receiveShadow
      >
        <planeGeometry args={[900, 900, 64, 64]} />
        <meshPhysicalMaterial
          color={theme.waterColor}
          roughness={theme.waterRoughness}
          metalness={0.02}
          bumpMap={bumpMap}
          bumpScale={theme.bumpScale}
          clearcoat={theme.waterClearcoat}
          clearcoatRoughness={0.58}
          emissive={theme.waterEmissive}
          emissiveIntensity={theme.waterEmissiveIntensity}
        />
      </mesh>
      <ScatteredSeaProps centerX={playerX} centerZ={playerZ} biome={biome} elapsedTotal={elapsedTotal} />
    </group>
  );
}
