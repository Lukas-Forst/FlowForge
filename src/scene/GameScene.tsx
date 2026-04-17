import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { EnemyShip } from "./entities/Enemy";
import { PlayerShip } from "./entities/PlayerShip";
import type { GameSnapshot } from "../game/types";
import { CAMERA_EDGE_MARGIN, WORLD_HALF_SIZE } from "../game/constants";
import { clampToBounds } from "../game/utils";

const CAMERA_HEIGHT = 28;
const CAMERA_DISTANCE = 34;
const DECORATIVE_ISLANDS: Array<{ position: [number, number, number]; scale: number; rotationY: number }> = [
  { position: [-154, 0.18, -122], scale: 1.05, rotationY: 0.35 },
  { position: [162, 0.2, -130], scale: 1.2, rotationY: -0.2 },
  { position: [-148, 0.22, 136], scale: 0.92, rotationY: 0.55 },
  { position: [146, 0.22, 142], scale: 1.28, rotationY: -0.45 },
  { position: [0, 0.16, -172], scale: 0.86, rotationY: 0.1 },
];
const OCEAN_TILES: Array<{ x: number; z: number; color: string }> = [
  { x: -110, z: -110, color: "#4bbfe0" },
  { x: 110, z: -110, color: "#44b3d7" },
  { x: -110, z: 110, color: "#55c5e6" },
  { x: 110, z: 110, color: "#3eaed1" },
];
const WAVE_PATCHES: Array<{ x: number; z: number; radiusInner: number; radiusOuter: number }> = [
  { x: -72, z: -30, radiusInner: 8.5, radiusOuter: 12.8 },
  { x: 64, z: 40, radiusInner: 10, radiusOuter: 14.5 },
  { x: 8, z: -88, radiusInner: 7.8, radiusOuter: 12.2 },
  { x: -14, z: 96, radiusInner: 9.5, radiusOuter: 13.6 },
];

function OceanWaveOverlays(): ReactElement {
  const planeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const rippleRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    planeRefs.current.forEach((plane, index) => {
      if (!plane) {
        return;
      }
      const drift = index === 0 ? 1 : -1;
      plane.position.x = Math.sin(time * (0.03 + index * 0.01)) * 10 * drift;
      plane.position.z = Math.cos(time * (0.025 + index * 0.012)) * 8;
      plane.rotation.z = Math.sin(time * 0.08 + index) * 0.12;
    });

    rippleRefs.current.forEach((ripple, index) => {
      if (!ripple) {
        return;
      }
      const material = ripple.material as THREE.MeshBasicMaterial;
      const pulse = 0.9 + Math.sin(time * 0.7 + index * 0.9) * 0.18;
      ripple.scale.setScalar(pulse);
      material.opacity = 0.08 + Math.sin(time * 0.55 + index) * 0.02;
    });
  });

  return (
    <group>
      <mesh
        ref={(mesh) => {
          planeRefs.current[0] = mesh;
        }}
        rotation={[-Math.PI / 2, 0, 0.05]}
        position={[0, 0.03, 0]}
      >
        <planeGeometry args={[460, 460]} />
        <meshBasicMaterial color="#b3ecff" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <mesh
        ref={(mesh) => {
          planeRefs.current[1] = mesh;
        }}
        rotation={[-Math.PI / 2, 0, -0.08]}
        position={[0, 0.04, 0]}
      >
        <planeGeometry args={[420, 420]} />
        <meshBasicMaterial color="#9fdff4" transparent opacity={0.045} depthWrite={false} />
      </mesh>

      {WAVE_PATCHES.map((patch, index) => (
        <mesh
          key={`${patch.x}-${patch.z}`}
          ref={(mesh) => {
            rippleRefs.current[index] = mesh;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[patch.x, 0.05, patch.z]}
        >
          <ringGeometry args={[patch.radiusInner, patch.radiusOuter, 40]} />
          <meshBasicMaterial color="#d8f5ff" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

interface ShipWakeProps {
  x: number;
  z: number;
  facing: number;
  size?: number;
  intensity?: number;
}

function ShipWake({ x, z, facing, size = 1, intensity = 1 }: ShipWakeProps): ReactElement {
  const segments = [0, 1, 2, 3, 4];
  const clampedIntensity = Math.max(0.55, Math.min(1.6, intensity));
  const backwardX = -Math.sin(facing);
  const backwardZ = -Math.cos(facing);
  const sideX = Math.cos(facing);
  const sideZ = -Math.sin(facing);

  return (
    <group>
      {segments.map((segment) => {
        const distance = (0.7 + segment * 0.58) * size;
        const spread = (0.1 + segment * 0.07) * size;
        const baseOpacity = Math.max(0.03, (0.2 - segment * 0.03) * clampedIntensity);
        const scaleX = (0.45 + segment * 0.13) * size;
        const scaleZ = (0.32 + segment * 0.1) * size;
        return (
          <mesh
            key={segment}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              x + backwardX * distance + sideX * spread,
              0.045,
              z + backwardZ * distance + sideZ * spread,
            ]}
            scale={[scaleX, 1, scaleZ]}
          >
            <circleGeometry args={[0.75, 14]} />
            <meshBasicMaterial color="#e6f8ff" transparent opacity={baseOpacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function CameraFollow({ snapshot }: { snapshot: GameSnapshot }): null {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const lerpAlphaRef = useRef(0.12);

  useFrame((_state, delta) => {
    // Smooth-follow: keep the player near the screen center.
    target.set(snapshot.player.position.x, 0, snapshot.player.position.y);

    // Clamp the target so we don't look beyond the world.
    const clampedTarget2 = clampToBounds({ x: target.x, y: target.z }, WORLD_HALF_SIZE);
    target.set(clampedTarget2.x, 0, clampedTarget2.y);

    desired.set(target.x, CAMERA_HEIGHT, target.z + CAMERA_DISTANCE);

    const camMin = -WORLD_HALF_SIZE + CAMERA_EDGE_MARGIN;
    const camMax = WORLD_HALF_SIZE - CAMERA_EDGE_MARGIN;
    desired.x = Math.max(camMin, Math.min(camMax, desired.x));
    desired.z = Math.max(camMin, Math.min(camMax, desired.z));

    // delta-scaled smoothing for stable camera motion.
    lerpAlphaRef.current = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, lerpAlphaRef.current);
    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}

interface GameSceneProps {
  snapshot: GameSnapshot;
}

export function GameScene({ snapshot }: GameSceneProps): ReactElement {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 44 }}
    >
      <color attach="background" args={["#9ad9f6"]} />
      <ambientLight intensity={0.7} />
      <directionalLight
        castShadow
        intensity={1.55}
        color="#f4f9ff"
        position={[15, 22, 10]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight intensity={0.3} color="#b5dcf6" position={[-13, 11, -10]} />

      <CameraFollow snapshot={snapshot} />
      <OceanWaveOverlays />

      {/* Ocean "tiles" (no textures, but tiled geometry keeps the world from feeling tiny). */}
      {OCEAN_TILES.map((tile) => (
        <mesh key={`${tile.x}-${tile.z}`} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[tile.x, 0, tile.z]}>
          <planeGeometry args={[220, 220, 1, 1]} />
          <meshStandardMaterial color={tile.color} roughness={0.72} metalness={0.04} />
        </mesh>
      ))}

      {DECORATIVE_ISLANDS.map((island, index) => (
        <group key={index} position={island.position} rotation={[0, island.rotationY, 0]} scale={island.scale}>
          <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
            <cylinderGeometry args={[2.9, 3.6, 0.55, 7]} />
            <meshStandardMaterial color="#bea777" roughness={0.84} metalness={0.04} />
          </mesh>
          <mesh castShadow position={[0.22, 0.52, -0.08]}>
            <dodecahedronGeometry args={[1.15, 0]} />
            <meshStandardMaterial color="#7aa36f" roughness={0.86} metalness={0.02} />
          </mesh>
          <mesh castShadow position={[-0.85, 0.47, 0.66]} rotation={[0.1, 0.2, 0]}>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color="#8c8778" roughness={0.9} metalness={0.01} />
          </mesh>
          {/* Lightweight foam ring: placeholder for future shoreline edge treatment. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
            <ringGeometry args={[2.7, 3.4, 28]} />
            <meshBasicMaterial color="#edfaff" transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* Outer playfield ring (invisible bounds feel better than hard walls). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[WORLD_HALF_SIZE - 2, WORLD_HALF_SIZE + 2, 96]} />
        <meshBasicMaterial color="#50bfde" opacity={0.32} transparent />
      </mesh>

      <PlayerShip
        upgradeLevel={snapshot.upgrades.level}
        position={[snapshot.player.position.x, 0, snapshot.player.position.y]}
        rotation={[0, snapshot.player.facing, 0]}
      />
      <ShipWake x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} size={1.05} intensity={1.1} />

      {snapshot.enemies.map((enemy) => (
        <group key={enemy.id}>
          <EnemyShip type={enemy.type} position={[enemy.position.x, 0, enemy.position.y]} />
          <ShipWake
            x={enemy.position.x}
            z={enemy.position.y}
            facing={Math.atan2(snapshot.player.position.x - enemy.position.x, snapshot.player.position.y - enemy.position.y)}
            size={enemy.type === "brute" ? 1.05 : enemy.type === "bomber" ? 0.86 : 0.78}
            intensity={enemy.type === "brute" ? 0.92 : 0.72}
          />
        </group>
      ))}

      {snapshot.projectiles.map((projectile) => (
        <mesh key={projectile.id} position={[projectile.position.x, 0.55, projectile.position.y]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#f7d085" emissive="#8f4f16" emissiveIntensity={0.9} />
        </mesh>
      ))}

      {snapshot.coins.map((coin) => (
        <mesh key={coin.id} position={[coin.position.x, 0.25, coin.position.y]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.09, 8, 14]} />
          <meshStandardMaterial color="#ffca3d" emissive="#7a5715" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </Canvas>
  );
}
