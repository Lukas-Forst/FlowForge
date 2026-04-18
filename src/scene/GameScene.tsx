import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ArenaVisualEffects, CombatProjectiles } from "./arcade/CombatVfx";
import { WaterArena } from "./arcade/WaterArena";
import { EnemyShip } from "./entities/Enemy";
import { PlayerShip } from "./entities/PlayerShip";
import type { PickupState, GameSnapshot } from "../game/types";

const CAMERA_HEIGHT = 24;
const CAMERA_DISTANCE = 23;

interface ShipWakeProps {
  x: number;
  z: number;
  facing: number;
  size?: number;
  intensity?: number;
}

function ShipWake({ x, z, facing, size = 1, intensity = 1 }: ShipWakeProps): ReactElement {
  const segments = [0, 1, 2, 3, 4];
  const clampedIntensity = Math.max(0.45, Math.min(1.45, intensity));
  const backwardX = -Math.sin(facing);
  const backwardZ = -Math.cos(facing);
  const sideX = Math.cos(facing);
  const sideZ = -Math.sin(facing);

  return (
    <group>
      {segments.map((segment) => {
        const distance = (0.7 + segment * 0.58) * size;
        const spread = (0.1 + segment * 0.07) * size;
        const baseOpacity = Math.max(0.02, (0.16 - segment * 0.024) * clampedIntensity);
        const scaleX = (0.45 + segment * 0.13) * size;
        const scaleZ = (0.32 + segment * 0.1) * size;
        return (
          <group key={segment}>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[
                  x + backwardX * distance + sideX * spread * side,
                  0.045,
                  z + backwardZ * distance + sideZ * spread * side,
                ]}
                scale={[scaleX, 1, scaleZ]}
              >
                <circleGeometry args={[0.72, 14]} />
                <meshBasicMaterial color="#f0fbff" transparent opacity={baseOpacity} depthWrite={false} />
              </mesh>
            ))}
          </group>
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
    let shakeOffset = 0;
    for (const effect of snapshot.visualEffects) {
      if (effect.kind === "screenShake") {
        shakeOffset += Math.max(0, effect.remaining) * 1.5;
      }
    }

    target.set(snapshot.player.position.x, 0, snapshot.player.position.y);
    desired.set(target.x, CAMERA_HEIGHT, target.z + CAMERA_DISTANCE);

    lerpAlphaRef.current = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, lerpAlphaRef.current);

    if (shakeOffset > 0) {
      camera.position.x += (Math.random() - 0.5) * shakeOffset;
      camera.position.z += (Math.random() - 0.5) * shakeOffset;
    }

    camera.lookAt(target.x, target.y, target.z);
  });

  return null;
}

interface GameSceneProps {
  snapshot: GameSnapshot;
}

function PickupProp({ pickup }: { pickup: PickupState }): ReactElement {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((_state) => {
    if (!meshRef.current) return;
    const time = _state.clock.elapsedTime;
    meshRef.current.rotation.z = time * 2 + pickup.id;
    if (pickup.kind !== "chest" && !pickup.kind.startsWith("supply")) {
      meshRef.current.position.y = 0.35 + Math.sin(time * 3 + pickup.id) * 0.1;
    } else {
      meshRef.current.position.y = 0.2 + Math.sin(time * 2 + pickup.id) * 0.05;
    }
  });

  if (pickup.kind === "gem") {
    return (
      <mesh ref={meshRef} position={[pickup.position.x, 0.35, pickup.position.y]} rotation={[0, 0, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#c27ceb" emissive="#7f23b2" emissiveIntensity={0.6} />
      </mesh>
    );
  }
  if (pickup.kind === "hp") {
    return (
      <mesh ref={meshRef} position={[pickup.position.x, 0.35, pickup.position.y]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color="#4ade80" emissive="#166534" emissiveIntensity={0.5} />
      </mesh>
    );
  }
  if (pickup.kind === "chest") {
    return (
      <mesh ref={meshRef} position={[pickup.position.x, 0.2, pickup.position.y]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#8b5a2b" emissive="#3e2723" emissiveIntensity={0.3} />
      </mesh>
    );
  }
  if (pickup.kind.startsWith("supply")) {
    const supplyColor = pickup.kind === "supply_heal" ? "#4ade80" : pickup.kind === "supply_invuln" ? "#fbbf24" : "#f87171";
    return (
      <mesh ref={meshRef} position={[pickup.position.x, 0.2, pickup.position.y]} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color={supplyColor} emissive={supplyColor} emissiveIntensity={0.4} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={[pickup.position.x, 0.35, pickup.position.y]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.25, 0.09, 8, 14]} />
      <meshStandardMaterial color="#ffe16b" emissive="#cc8800" emissiveIntensity={0.8} />
    </mesh>
  );
}

export function GameScene({ snapshot }: GameSceneProps): ReactElement {
  return (
    <Canvas shadows dpr={[1, 1.8]} camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 52 }}>
      <color attach="background" args={["#6ecae8"]} />
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
      <WaterArena playerX={snapshot.player.position.x} playerZ={snapshot.player.position.y} />

      <PlayerShip
        upgradeLevel={snapshot.upgrades.level}
        position={[snapshot.player.position.x, 0, snapshot.player.position.y]}
        rotation={[0, snapshot.player.facing, 0]}
      />
      <ShipWake x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} size={1.05} intensity={1.15} />

      {snapshot.enemies.map((enemy) => (
        <group key={enemy.id}>
          <EnemyShip type={enemy.type} position={[enemy.position.x, 0, enemy.position.y]} rotation={[0, enemy.facing, 0]} />
          <ShipWake
            x={enemy.position.x}
            z={enemy.position.y}
            facing={enemy.facing}
            size={enemy.type === "brute" ? 1.05 : enemy.type === "bomber" ? 0.86 : 0.78}
            intensity={enemy.type === "brute" ? 0.92 : 0.72}
          />
        </group>
      ))}

      <CombatProjectiles projectiles={snapshot.projectiles} />
      <ArenaVisualEffects effects={snapshot.visualEffects} />

      {snapshot.pickups.map((pickup) => (
        <PickupProp key={pickup.id} pickup={pickup} />
      ))}
    </Canvas>
  );
}
