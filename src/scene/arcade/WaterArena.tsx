import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const TILE_SIZE = 280;
const TILE_OFFSETS = [-TILE_SIZE, 0, TILE_SIZE] as const;

/** Base water tint; overlays and fog are tuned to this family. */
const WATER_BASE = "#5cb0cf";

function createMicroNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 520; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const alpha = 0.018 + Math.random() * 0.042;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAxisFlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgba(255,255,255,0.0)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 16; i += 1) {
    const y = Math.round((i + 1) * (canvas.height / 18));
    const alpha = 0.055 + Math.random() * 0.06;
    const width = 100 + Math.random() * 300;
    const x = Math.random() * (canvas.width - width);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, width, 2);
  }
  for (let i = 0; i < 9; i += 1) {
    const x = Math.round((i + 1) * (canvas.width / 10));
    const alpha = 0.035 + Math.random() * 0.05;
    const height = 45 + Math.random() * 150;
    const y = Math.random() * (canvas.height - height);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(x, y, 2, height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 3.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft radial shade (light center → white edge) for multiply blend on water tiles. */
function createWaterRadialShadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const cx = 256;
  const cy = 256;
  const grd = ctx.createRadialGradient(cx, cy, 24, cx, cy, 380);
  grd.addColorStop(0, "rgb(198,218,228)");
  grd.addColorStop(0.42, "rgb(228,238,244)");
  grd.addColorStop(1, "rgb(255,255,255)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(0.28, 0.28);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

function CalmSeaProp({ variant }: { variant: number }): ReactElement {
  if (variant === 1) {
    return (
      <group>
        <mesh castShadow position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 0.44, 8]} />
          <meshStandardMaterial color="#aec6d4" roughness={0.66} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#f2efe6" transparent opacity={0.88} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.38, 0.52, 16]} />
          <meshBasicMaterial color="#dce8f0" transparent opacity={0.065} depthWrite={false} />
        </mesh>
      </group>
    );
  }
  if (variant === 2) {
    return (
      <group>
        <mesh castShadow position={[0, 0.2, 0]}>
          <dodecahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial color="#7a8d98" roughness={0.9} metalness={0.03} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.32, 0.5, 14]} />
          <meshBasicMaterial color="#c5d8e6" transparent opacity={0.055} depthWrite={false} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.14, 0.2, 0.75, 8]} />
        <meshStandardMaterial color="#b8d4e4" roughness={0.58} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#f4f0e4" transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.35, 0.55, 16]} />
        <meshBasicMaterial color="#dceaf2" transparent opacity={0.07} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Sparse world-anchored props in a grid so the sea feels endless without a visible arena rim. */
function ScatteredSeaProps({ centerX, centerZ }: { centerX: number; centerZ: number }): ReactElement {
  const CELL = 190;
  const viewHalf = 320;
  const i0 = Math.floor((centerX - viewHalf) / CELL);
  const i1 = Math.floor((centerX + viewHalf) / CELL);
  const j0 = Math.floor((centerZ - viewHalf) / CELL);
  const j1 = Math.floor((centerZ + viewHalf) / CELL);

  const items: ReactElement[] = [];
  for (let i = i0; i <= i1; i += 1) {
    for (let j = j0; j <= j1; j += 1) {
      const h = hash2(i, j);
      if (h % 4 !== 0) {
        continue;
      }
      const ox = ((h % 127) / 127 - 0.5) * (CELL * 0.38);
      const oz = (((h >> 8) % 127) / 127 - 0.5) * (CELL * 0.38);
      const wx = i * CELL + ox;
      const wz = j * CELL + oz;
      const scale = 0.85 + ((h >> 16) % 100) / 250;
      const variant = (h >> 17) % 3;
      items.push(
        <group key={`${i}-${j}`} position={[wx, 0.04, wz]} scale={scale}>
          <CalmSeaProp variant={variant} />
        </group>,
      );
    }
  }
  return <group>{items}</group>;
}

interface WaterArenaProps {
  playerX: number;
  playerZ: number;
}

export function WaterArena({ playerX, playerZ }: WaterArenaProps): ReactElement {
  const microNoiseMap = useMemo(() => createMicroNoiseTexture(), []);
  const axisFlowMap = useMemo(() => createAxisFlowTexture(), []);
  const radialShadeMap = useMemo(() => createWaterRadialShadeTexture(), []);
  const bumpMap = useMemo(() => createCalmBumpTexture(), []);
  const playerRef = useRef({ x: 0, z: 0 });

  playerRef.current = { x: playerX, z: playerZ };

  useFrame((_state, delta) => {
    const time = _state.clock.elapsedTime;
    const { x: px, z: pz } = playerRef.current;

    microNoiseMap.offset.x = px * 0.01 + time * 0.0034;
    microNoiseMap.offset.y = pz * 0.01 + time * 0.0017;
    axisFlowMap.offset.x += delta * 0.011;
    axisFlowMap.offset.y += delta * 0.001;
    axisFlowMap.offset.x += px * 0.000032 * delta;
    axisFlowMap.offset.y += pz * 0.000032 * delta;

    bumpMap.offset.x = px * 0.003 + time * 0.0006;
    bumpMap.offset.y = pz * 0.003 - time * 0.00045;

    radialShadeMap.offset.set(px * 0.0032, pz * 0.0032);
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
                  color={WATER_BASE}
                  roughness={0.52}
                  metalness={0.02}
                  bumpMap={bumpMap}
                  bumpScale={0.042}
                  clearcoat={0.18}
                  clearcoatRoughness={0.58}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.004, oz]}>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshBasicMaterial
                  map={radialShadeMap}
                  transparent
                  opacity={0.58}
                  depthWrite={false}
                  blending={THREE.MultiplyBlending}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.012, oz]}>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE, 1, 1]} />
                <meshBasicMaterial map={microNoiseMap} transparent opacity={0.14} depthWrite={false} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ox, 0.018, oz]}>
                <planeGeometry args={[TILE_SIZE * 0.998, TILE_SIZE * 0.998, 1, 1]} />
                <meshBasicMaterial map={axisFlowMap} transparent opacity={0.11} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
            </group>
          ))
        )}
      </group>
      <ScatteredSeaProps centerX={playerX} centerZ={playerZ} />
    </group>
  );
}
