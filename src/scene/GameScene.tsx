import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ArenaVisualEffects, CombatProjectiles } from "./arcade/CombatVfx";
import { WaterArena } from "./arcade/WaterArena";
import { EnemyShip } from "./entities/Enemy";
import { PlayerShip } from "./entities/PlayerShip";
import type { GameSnapshot } from "../game/types";
import { CAMERA_EDGE_MARGIN_X, CAMERA_EDGE_MARGIN_Z, WORLD_HALF_HEIGHT, WORLD_HALF_WIDTH } from "../game/constants";
import { clampToBounds } from "../game/utils";

const CAMERA_HEIGHT = 19;
const CAMERA_DISTANCE = 26;

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
            <meshBasicMaterial color="#f0fbff" transparent opacity={baseOpacity} depthWrite={false} />
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
    target.set(snapshot.player.position.x, 0, snapshot.player.position.y);

    const clampedTarget2 = clampToBounds({ x: target.x, y: target.z }, WORLD_HALF_WIDTH, WORLD_HALF_HEIGHT);
    target.set(clampedTarget2.x, 0, clampedTarget2.y);

    desired.set(target.x, CAMERA_HEIGHT, target.z + CAMERA_DISTANCE);

    const camMinX = -WORLD_HALF_WIDTH + CAMERA_EDGE_MARGIN_X;
    const camMaxX = WORLD_HALF_WIDTH - CAMERA_EDGE_MARGIN_X;
    const camMinZ = -WORLD_HALF_HEIGHT + CAMERA_EDGE_MARGIN_Z;
    const camMaxZ = WORLD_HALF_HEIGHT - CAMERA_EDGE_MARGIN_Z;
    desired.x = Math.max(camMinX, Math.min(camMaxX, desired.x));
    desired.z = Math.max(camMinZ, Math.min(camMaxZ, desired.z));

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
    <Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 42 }}>
      <color attach="background" args={["#b8e9fb"]} />
      <ambientLight intensity={0.82} color="#dff6ff" />
      <directionalLight
        castShadow
        intensity={1.65}
        color="#fffefb"
        position={[18, 26, 14]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight intensity={0.38} color="#c8e9ff" position={[-16, 14, -12]} />

      <CameraFollow snapshot={snapshot} />
      <WaterArena />

      <PlayerShip
        upgradeLevel={snapshot.upgrades.level}
        position={[snapshot.player.position.x, 0, snapshot.player.position.y]}
        rotation={[0, snapshot.player.facing, 0]}
      />
      <ShipWake x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} size={1.05} intensity={1.15} />

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

      <CombatProjectiles projectiles={snapshot.projectiles} />
      <ArenaVisualEffects effects={snapshot.visualEffects} />

      {snapshot.coins.map((coin) => (
        <mesh key={coin.id} position={[coin.position.x, 0.25, coin.position.y]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.25, 0.09, 8, 14]} />
          <meshStandardMaterial color="#ffca3d" emissive="#7a5715" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </Canvas>
  );
}
