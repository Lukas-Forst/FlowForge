import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ArenaVisualEffects, CombatProjectiles } from "./arcade/CombatVfx";
import { WaterArena } from "./arcade/WaterArena";
import { EnemyShip } from "./entities/Enemy";
import { HarvestableEntity } from "./entities/HarvestableEntity";
import { PlayerShip } from "./entities/PlayerShip";
import type { PickupState, GameSnapshot } from "../game/types";
import { BIOME_THEMES } from "./biomeThemes";

const ISO_OFFSET = 24;

const MAX_FOAM = 12;

type FoamParticle = { x: number; z: number; age: number; maxAge: number; size: number };

function ShipWakeFoam({
  x,
  z,
  facing,
  sizeScale = 1,
}: {
  x: number;
  z: number;
  facing: number;
  sizeScale?: number;
}): ReactElement {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particles = useRef<FoamParticle[]>([]);
  const emitTimer = useRef(0);
  const xRef = useRef(x);
  const zRef = useRef(z);
  const facingRef = useRef(facing);
  xRef.current = x;
  zRef.current = z;
  facingRef.current = facing;

  useFrame((_state, delta) => {
    emitTimer.current += delta;

    if (emitTimer.current > 0.055) {
      emitTimer.current = 0;
      const f = facingRef.current;
      const bx = -Math.sin(f);
      const bz = -Math.cos(f);
      const sx = Math.cos(f);
      const sz = -Math.sin(f);
      for (const side of [-1, 1] as const) {
        if (particles.current.length < MAX_FOAM) {
          particles.current.push({
            x: xRef.current + bx * 0.75 * sizeScale + sx * side * 0.45 * sizeScale,
            z: zRef.current + bz * 0.75 * sizeScale + sz * side * 0.45 * sizeScale,
            age: 0,
            maxAge: 0.42 + Math.random() * 0.18,
            size: (0.22 + Math.random() * 0.16) * sizeScale,
          });
        }
      }
    }

    for (let i = particles.current.length - 1; i >= 0; i -= 1) {
      const p = particles.current[i];
      if (!p) continue;
      p.age += delta;
      if (p.age > p.maxAge) {
        particles.current.splice(i, 1);
      }
    }

    for (let i = 0; i < MAX_FOAM; i += 1) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const p = particles.current[i];
      if (!p) {
        mesh.scale.setScalar(0);
        continue;
      }
      const t = p.age / p.maxAge;
      const s = p.size * (0.5 + t * 1.2);
      mesh.position.set(p.x, 0.045, p.z);
      mesh.scale.set(s, s, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - t) * 0.20);
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_FOAM }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.045, 0]}
          scale={[0, 0, 1]}
        >
          <circleGeometry args={[1, 10]} />
          <meshBasicMaterial color="#f0fbff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CameraFollow({ snapshot }: { snapshot: GameSnapshot }): null {
  const { camera } = useThree();
  const desired = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_state, delta) => {
    let shakeOffset = 0;
    for (const effect of snapshot.visualEffects) {
      if (effect.kind === "screenShake") {
        shakeOffset += Math.max(0, effect.remaining) * 1.5;
      }
    }

    target.set(snapshot.player.position.x, 0, snapshot.player.position.y);
    desired.set(
      target.x + ISO_OFFSET,
      ISO_OFFSET,
      target.z + ISO_OFFSET,
    );

    // Exponential decay: closes ~89% of gap per frame at 60fps (near-snap follow).
    const alpha = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, alpha);

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
  const theme = BIOME_THEMES[snapshot.runBiome];
  return (
    <Canvas shadows dpr={[1, 1.8]} orthographic camera={{ position: [ISO_OFFSET, ISO_OFFSET, ISO_OFFSET], zoom: 22, near: 0.1, far: 600 }}>
      <color attach="background" args={[theme.backgroundColor]} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
      <ambientLight intensity={theme.ambient.intensity} color={theme.ambient.color} />
      <directionalLight
        castShadow
        intensity={theme.directional.intensity}
        color={theme.directional.color}
        position={theme.directional.position}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        intensity={theme.rim.intensity}
        color={theme.rim.color}
        position={[-16, 14, -12]}
      />

      <CameraFollow snapshot={snapshot} />
      <WaterArena
        playerX={snapshot.player.position.x}
        playerZ={snapshot.player.position.y}
        theme={theme}
        biome={snapshot.runBiome}
      />

      <PlayerShip
        upgradeLevel={snapshot.upgrades.level}
        position={[snapshot.player.position.x, 0, snapshot.player.position.y]}
        rotation={[0, snapshot.player.facing, 0]}
      />
      <ShipWakeFoam x={snapshot.player.position.x} z={snapshot.player.position.y} facing={snapshot.player.facing} sizeScale={1.05} />

      {snapshot.enemies.map((enemy) => (
        <group key={enemy.id}>
          <EnemyShip type={enemy.type} position={[enemy.position.x, 0, enemy.position.y]} rotation={[0, enemy.facing, 0]} />
          <ShipWakeFoam
            x={enemy.position.x}
            z={enemy.position.y}
            facing={enemy.facing}
            sizeScale={enemy.type === "brute" ? 1.05 : enemy.type === "bomber" ? 0.86 : 0.78}
          />
        </group>
      ))}

      <CombatProjectiles projectiles={snapshot.projectiles} />
      <ArenaVisualEffects effects={snapshot.visualEffects} />

      {snapshot.pickups.map((pickup) => (
        <PickupProp key={pickup.id} pickup={pickup} />
      ))}
      {snapshot.harvestables.map((h) => (
        <HarvestableEntity key={`harv-${h.id}`} state={h} />
      ))}
    </Canvas>
  );
}
