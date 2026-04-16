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
      <color attach="background" args={["#0c2438"]} />
      {/* addons.md: reduce fog haze so ships remain readable */}
      <fog attach="fog" args={["#0c2438", 45, 180]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        intensity={1.25}
        color="#d7e8ff"
        position={[9, 15, 7]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <CameraFollow snapshot={snapshot} />

      {/* Ocean "tiles" (no textures, but tiled geometry keeps the world from feeling tiny). */}
      {[
        [-110, -110],
        [110, -110],
        [-110, 110],
        [110, 110],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[x, 0, z]}>
          <planeGeometry args={[220, 220, 1, 1]} />
          <meshStandardMaterial color="#0d4b66" roughness={0.95} metalness={0} />
        </mesh>
      ))}

      {/* Outer playfield ring (invisible bounds feel better than hard walls). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[WORLD_HALF_SIZE - 2, WORLD_HALF_SIZE + 2, 96]} />
        <meshBasicMaterial color="#1a8fb4" opacity={0.26} transparent />
      </mesh>

      <PlayerShip
        upgradeLevel={snapshot.upgrades.level}
        position={[snapshot.player.position.x, 0, snapshot.player.position.y]}
        rotation={[0, snapshot.player.facing, 0]}
      />

      {snapshot.enemies.map((enemy) => (
        <EnemyShip
          key={enemy.id}
          type={enemy.type}
          position={[enemy.position.x, 0, enemy.position.y]}
          rotation={[0, enemy.facing, 0]}
        />
      ))}

      {snapshot.projectiles.map((projectile) => (
        <mesh key={projectile.id} position={[projectile.position.x, 0.55, projectile.position.y]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#f7d085" emissive="#8f4f16" emissiveIntensity={0.9} />
        </mesh>
      ))}

      {snapshot.enemyProjectiles.map((projectile) => (
        <mesh key={projectile.id} position={[projectile.position.x, 0.55, projectile.position.y]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color="#ff5b5b" emissive="#7a1111" emissiveIntensity={0.85} />
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
