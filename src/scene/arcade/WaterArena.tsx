import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { NavBuoyProp } from "./props/NavBuoyProp";
import { BarrelDebrisProp } from "./props/BarrelDebrisProp";
import { IslandProp } from "./props/IslandProp";
import { CrystalSpireProp } from "./props/CrystalSpireProp";
import type { BiomeTheme, BiomeType } from "../../game/types";

const TILE_SIZE = 280;
const TILE_OFFSETS = [-TILE_SIZE, 0, TILE_SIZE] as const;



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

/** Tinted noise overlay scrolled by player movement; replaces the multi-layer white wash. */
function createShimmerNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 720; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = 0.10 + Math.random() * 0.25;
    // White grayscale; the material's `color` tints it to the biome shimmer hue.
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
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
}: {
  centerX: number;
  centerZ: number;
  biome: BiomeType;
}): ReactElement {
  const CELL = 40;
  const viewHalf = 180;
  const i0 = Math.floor((centerX - viewHalf) / CELL);
  const i1 = Math.floor((centerX + viewHalf) / CELL);
  const j0 = Math.floor((centerZ - viewHalf) / CELL);
  const j1 = Math.floor((centerZ + viewHalf) / CELL);

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
            ? <NavBuoyProp variant={variant} />
            : <BarrelDebrisProp variant={variant} />;
          items.push(<BobbingProp key={`os-${i}-${j}`} wx={wx} wz={wz} scale={0.9} seed={h} child={child} />);
        }
      } else if (biome === "island_chain") {
        if (h % 3 === 0) {
          const size = 1.0 + ((h >> 16) % 100) / 75;
          items.push(
            <group key={`isl-${i}-${j}`} position={[wx, 0, wz]}>
              <IslandProp seed={h} size={size} />
            </group>
          );
        }
      } else if (biome === "deep_waters") {
        if (h % 6 === 0) {
          items.push(
            <group key={`crys-${i}-${j}`} position={[wx, -0.6, wz]}>
              <CrystalSpireProp seed={h} />
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
}

export function WaterArena({ playerX, playerZ, theme, biome }: WaterArenaProps): ReactElement {
  const bumpMap = useMemo(() => createCalmBumpTexture(), []);
  const shimmerMap = useMemo(() => createShimmerNoiseTexture(), []);
  const playerRef = useRef({ x: 0, z: 0 });

  playerRef.current = { x: playerX, z: playerZ };

  useFrame((_state, delta) => {
    const time = _state.clock.elapsedTime;
    const { x: px, z: pz } = playerRef.current;

    bumpMap.offset.x = px * 0.003 + time * 0.0006;
    bumpMap.offset.y = pz * 0.003 - time * 0.00045;

    shimmerMap.offset.x = px * 0.012 + time * 0.0042;
    shimmerMap.offset.y = pz * 0.012 + time * 0.0021;
    void delta;
  });

  return (
    <group>
      <group position={[playerX, 0, playerZ]}>
        {TILE_OFFSETS.flatMap((ox) =>
          TILE_OFFSETS.map((oz) => (
            <group key={`${ox}-${oz}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, -0.02, oz]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshPhysicalMaterial
                  color={theme.waterColor}
                  roughness={theme.waterRoughness}
                  metalness={0.02}
                  bumpMap={bumpMap}
                  bumpScale={theme.bumpScale}
                  clearcoat={theme.waterClearcoat}
                  clearcoatRoughness={0.58}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.012, oz]}>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshBasicMaterial
                  map={shimmerMap}
                  color={theme.shimmerColor}
                  transparent
                  opacity={theme.shimmerOpacity}
                  depthWrite={false}
                />
              </mesh>
            </group>
          ))
        )}
      </group>
      <ScatteredSeaProps centerX={playerX} centerZ={playerZ} biome={biome} />
    </group>
  );
}
