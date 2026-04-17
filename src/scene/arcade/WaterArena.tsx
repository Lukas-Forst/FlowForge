import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from "../../game/constants";

const W = WORLD_HALF_WIDTH * 2 + 48;
const H = WORLD_HALF_HEIGHT * 2 + 48;

function createOceanGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#6ed8f5");
  g.addColorStop(0.35, "#4ec4ea");
  g.addColorStop(0.65, "#3eb6e0");
  g.addColorStop(1, "#2a9fd4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFlowNoiseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 18; i += 1) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 40 + Math.random() * 90;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.22)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 2.2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ISLANDS: Array<{ nx: number; nz: number; scale: number; rotationY: number }> = [
  { nx: -0.9, nz: -0.28, scale: 0.74, rotationY: 0.38 },
  { nx: -0.88, nz: 0.32, scale: 0.8, rotationY: -0.32 },
  { nx: 0.22, nz: 0.9, scale: 0.86, rotationY: 0.18 },
  { nx: -0.18, nz: -0.92, scale: 0.68, rotationY: -0.08 },
  { nx: 0.26, nz: 0.22, scale: 0.52, rotationY: 0.12 },
];
const ROCK_CLUSTERS: Array<{ nx: number; nz: number; rotationY: number }> = [
  { nx: 0.9, nz: 0.78, rotationY: 0.62 },
  { nx: -0.78, nz: 0.72, rotationY: -0.45 },
];
const SANDBARS: Array<{ nx: number; nz: number; rotationY: number; width: number; depth: number }> = [
  { nx: 0.86, nz: -0.88, rotationY: 0.32, width: 5.4, depth: 2.5 },
];

function FlowOverlays(): ReactElement {
  const planeRefs = useRef<Array<THREE.Mesh | null>>([]);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    planeRefs.current.forEach((plane, index) => {
      if (!plane) {
        return;
      }
      const drift = index % 2 === 0 ? 1 : -1;
      plane.position.x = Math.sin(time * (0.022 + index * 0.006)) * (12 + index * 4) * drift;
      plane.position.z = Math.cos(time * (0.019 + index * 0.007)) * (9 + index * 3);
      plane.rotation.z = Math.sin(time * 0.06 + index * 0.4) * 0.1;
    });
  });

  return (
    <group>
      <mesh
        ref={(m) => {
          planeRefs.current[0] = m;
        }}
        rotation={[-Math.PI / 2, 0, 0.04]}
        position={[0, 0.04, 0]}
      >
        <planeGeometry args={[W * 1.05, H * 1.05]} />
        <meshBasicMaterial color="#c2f0ff" transparent opacity={0.055} depthWrite={false} />
      </mesh>
      <mesh
        ref={(m) => {
          planeRefs.current[1] = m;
        }}
        rotation={[-Math.PI / 2, 0, -0.06]}
        position={[0, 0.045, 0]}
      >
        <planeGeometry args={[W * 0.92, H * 0.92]} />
        <meshBasicMaterial color="#e8fbff" transparent opacity={0.04} depthWrite={false} />
      </mesh>
    </group>
  );
}

function EdgeFoamStrips(): ReactElement {
  const halfW = WORLD_HALF_WIDTH * 0.97;
  const halfH = WORLD_HALF_HEIGHT * 0.97;
  const strips: Array<{ position: [number, number, number]; scale: [number, number, number]; rotation: [number, number, number] }> = [
    { position: [0, 0.052, halfH], scale: [halfW * 2.1, 10, 1], rotation: [-Math.PI / 2, 0, 0] },
    { position: [0, 0.052, -halfH], scale: [halfW * 2.1, 10, 1], rotation: [-Math.PI / 2, 0, 0] },
    { position: [halfW, 0.052, 0], scale: [halfH * 2.1, 10, 1], rotation: [-Math.PI / 2, 0, Math.PI / 2] },
    { position: [-halfW, 0.052, 0], scale: [halfH * 2.1, 10, 1], rotation: [-Math.PI / 2, 0, Math.PI / 2] },
  ];
  return (
    <group>
      {strips.map((s, i) => (
        <mesh key={i} position={s.position} rotation={s.rotation} scale={s.scale}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#f2fcff" transparent opacity={0.07} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function InteriorWavePatches(): ReactElement {
  const patches: Array<{ x: number; z: number; inner: number; outer: number }> = [
    { x: -58, z: -22, inner: 9, outer: 14 },
    { x: 52, z: 36, inner: 10, outer: 15 },
    { x: 12, z: -78, inner: 8, outer: 12.5 },
    { x: -18, z: 88, inner: 9.5, outer: 14 },
    { x: -WORLD_HALF_WIDTH * 0.55, z: WORLD_HALF_HEIGHT * 0.55, inner: 14, outer: 22 },
    { x: WORLD_HALF_WIDTH * 0.55, z: WORLD_HALF_HEIGHT * 0.55, inner: 13, outer: 21 },
    { x: -WORLD_HALF_WIDTH * 0.55, z: -WORLD_HALF_HEIGHT * 0.55, inner: 15, outer: 23 },
    { x: WORLD_HALF_WIDTH * 0.52, z: -WORLD_HALF_HEIGHT * 0.52, inner: 12, outer: 19 },
  ];
  return (
    <group>
      {patches.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.055, p.z]}>
          <ringGeometry args={[p.inner, p.outer, 36]} />
          <meshBasicMaterial color="#dff8ff" transparent opacity={0.075} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function WaterArena(): ReactElement {
  const gradientMap = useMemo(() => createOceanGradientTexture(), []);
  const flowMap = useMemo(() => createFlowNoiseTexture(), []);
  const flowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_state, delta) => {
    gradientMap.offset.x += delta * 0.012;
    gradientMap.offset.y += delta * 0.008;
    flowMap.offset.x += delta * 0.018;
    flowMap.offset.y += delta * 0.011;
    if (flowMatRef.current) {
      flowMatRef.current.opacity = 0.11 + Math.sin(_state.clock.elapsedTime * 0.35) * 0.02;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[W, H, 48, 48]} />
        <meshStandardMaterial map={gradientMap} roughness={0.58} metalness={0.03} color="#7adcf4" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[W * 0.99, H * 0.99, 1, 1]} />
        <meshBasicMaterial
          ref={flowMatRef}
          map={flowMap}
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <FlowOverlays />
      <InteriorWavePatches />
      <EdgeFoamStrips />

      {/* Soft arena rim */}
      <group position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh scale={[WORLD_HALF_WIDTH * 0.995, WORLD_HALF_HEIGHT * 0.995, 1]}>
          <ringGeometry args={[0.94, 1, 72]} />
          <meshBasicMaterial color="#5fd4ef" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      </group>

      {ISLANDS.map((island, index) => {
        const x = island.nx * WORLD_HALF_WIDTH;
        const z = island.nz * WORLD_HALF_HEIGHT;
        return (
          <group key={`island-${index}`} position={[x, 0.2, z]} rotation={[0, island.rotationY, 0]} scale={island.scale}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
              <ringGeometry args={[2.2, 4.2, 28]} />
              <meshBasicMaterial color="#9ee8f8" transparent opacity={0.16} depthWrite={false} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
              <cylinderGeometry args={[2.9, 3.6, 0.55, 7]} />
              <meshStandardMaterial color="#d4bc86" roughness={0.82} metalness={0.04} />
            </mesh>
            <mesh castShadow position={[0.22, 0.52, -0.08]}>
              <dodecahedronGeometry args={[1.15, 0]} />
              <meshStandardMaterial color="#7cb56e" roughness={0.85} metalness={0.02} />
            </mesh>
            <mesh castShadow position={[-0.85, 0.47, 0.66]} rotation={[0.1, 0.2, 0]}>
              <dodecahedronGeometry args={[0.55, 0]} />
              <meshStandardMaterial color="#8f8a7c" roughness={0.88} metalness={0.01} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
              <ringGeometry args={[2.7, 3.4, 28]} />
              <meshBasicMaterial color="#f5fdff" transparent opacity={0.14} depthWrite={false} />
            </mesh>
          </group>
        );
      })}

      {ROCK_CLUSTERS.map((cluster, index) => (
        <group
          key={`rocks-${index}`}
          position={[cluster.nx * WORLD_HALF_WIDTH, 0.12, cluster.nz * WORLD_HALF_HEIGHT]}
          rotation={[0, cluster.rotationY, 0]}
        >
          <mesh castShadow position={[0, 0.42, 0]} rotation={[0.15, 0.4, 0.08]}>
            <dodecahedronGeometry args={[1.05, 0]} />
            <meshStandardMaterial color="#6b6f76" roughness={0.92} metalness={0.02} />
          </mesh>
          <mesh castShadow position={[1.15, 0.28, 0.55]} rotation={[-0.1, -0.35, 0.12]}>
            <dodecahedronGeometry args={[0.72, 0]} />
            <meshStandardMaterial color="#5c6068" roughness={0.9} metalness={0.02} />
          </mesh>
          <mesh castShadow position={[-0.85, 0.22, 0.35]} rotation={[0.2, 0.55, -0.05]}>
            <dodecahedronGeometry args={[0.58, 0]} />
            <meshStandardMaterial color="#767a82" roughness={0.91} metalness={0.02} />
          </mesh>
        </group>
      ))}

      {SANDBARS.map((bar, index) => (
        <mesh
          key={`sand-${index}`}
          castShadow
          receiveShadow
          rotation={[0, bar.rotationY, 0]}
          position={[bar.nx * WORLD_HALF_WIDTH, 0.04, bar.nz * WORLD_HALF_HEIGHT]}
        >
          <boxGeometry args={[bar.width, 0.07, bar.depth]} />
          <meshStandardMaterial color="#e2d2b0" roughness={0.86} metalness={0.02} />
        </mesh>
      ))}
    </group>
  );
}
