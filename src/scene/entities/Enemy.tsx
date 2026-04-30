import type { ReactElement } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import type { EnemyType } from "../../game/types";
import { ShipSmoke } from "../effects/ShipSmoke";
import { ShipModelVisual } from "../models/ShipModelVisual";
import type { ShipModelConfig } from "../models/ShipModelVisual";

type EnemyShipProps = ThreeElements["group"] & {
  type: EnemyType;
  isElite?: boolean;
  hitFlashTimer?: number;
  damageState?: "healthy" | "smoking" | "on_fire" | "sinking";
};

const ENEMY_MODEL_CONFIGS: Record<EnemyType, ShipModelConfig> = {
  corsair: {
    assetId: "enemyShipBasic",
    targetLength: 2.25,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  bomber: {
    assetId: "enemyShipFast",
    targetLength: 2.65,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  brute: {
    assetId: "enemyShipTank",
    targetLength: 3.1,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  swarmer: {
    assetId: "enemyShipFast",
    targetLength: 1.8,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  sniper: {
    assetId: "enemyShipTank",
    targetLength: 2.9,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  boss: {
    assetId: "enemyShipBoss",
    targetLength: 4.5,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
  shore_battery: {
    assetId: "enemyShipTank",
    targetLength: 4.8,
    forwardAxis: "positiveZ",
    rotationOffsetY: Math.PI / 2,
    positionOffset: [0, 0.01, 0],
  },
};

function CorsairMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.25, 0]}>
        <boxGeometry args={[1.1, 0.38, 2.1]} />
        <meshStandardMaterial color="#4d251e" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.65, -0.1]}>
        <boxGeometry args={[0.85, 0.42, 1]} />
        <meshStandardMaterial color="#6b3620" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.14, 0.18, 0.22, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 1.1, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-0.72, 0.28, 0]}>
        <boxGeometry args={[0.22, 0.42, 0.85]} />
        <meshStandardMaterial color="#3d1c14" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0.72, 0.28, 0]}>
        <boxGeometry args={[0.22, 0.42, 0.85]} />
        <meshStandardMaterial color="#3d1c14" roughness={0.82} />
      </mesh>
    </>
  );
}

function BomberMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[1.6, 0.52, 2.3]} />
        <meshStandardMaterial color="#4a1f1a" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, 0.82, -0.1]}>
        <boxGeometry args={[1.2, 0.5, 1.4]} />
        <meshStandardMaterial color="#632a24" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.32, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-0.32, 1.85, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.3, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0.32, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.28, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0.32, 1.85, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 1.3, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-1, 0.32, 0.05]}>
        <boxGeometry args={[0.35, 0.55, 1.2]} />
        <meshStandardMaterial color="#3a1810" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[1, 0.32, 0.05]}>
        <boxGeometry args={[0.35, 0.55, 1.2]} />
        <meshStandardMaterial color="#3a1810" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[-0.28, 0.32, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#221f1f" />
      </mesh>
      <mesh castShadow position={[0.28, 0.32, 0.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#221f1f" />
      </mesh>
    </>
  );
}

function BruteMesh(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.75, 0.6, 2.5]} />
        <meshStandardMaterial color="#2f1412" roughness={0.84} />
      </mesh>
      <mesh castShadow position={[0, 0.68, 0]}>
        <boxGeometry args={[1.6, 0.14, 2.2]} />
        <meshStandardMaterial color="#3d2018" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[1.3, 0.55, 1.5]} />
        <meshStandardMaterial color="#4a2218" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.35, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[0, 2.05, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 1.6, 8]} />
        <meshStandardMaterial color="#1e1716" />
      </mesh>
      <mesh castShadow position={[-1.12, 0.38, 0.05]}>
        <boxGeometry args={[0.42, 0.62, 1.35]} />
        <meshStandardMaterial color="#281010" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[1.12, 0.38, 0.05]}>
        <boxGeometry args={[0.42, 0.62, 1.35]} />
        <meshStandardMaterial color="#281010" roughness={0.85} />
      </mesh>
    </>
  );
}

function EliteAura({ isBoss }: { isBoss: boolean }): ReactElement {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const crownRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.8 + Math.sin(t * 2.8) * 0.2;

    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 1.1;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.7;
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 1.6;
      ring3Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.35;
    }
    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + Math.sin(t * 2.2) * 0.06;
      const s = pulse * (isBoss ? 1.55 : 1.2);
      auraRef.current.scale.set(s, s * 0.55, s);
    }
    for (let i = 0; i < crownRefs.current.length; i += 1) {
      const mesh = crownRefs.current[i];
      if (!mesh) continue;
      const angle = t * 1.35 + (i / crownRefs.current.length) * Math.PI * 2;
      const r = isBoss ? 1.9 : 1.45;
      mesh.position.set(Math.cos(angle) * r, 0.55 + Math.sin(t * 1.8 + i) * 0.18, Math.sin(angle) * r);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 + Math.sin(t * 2.4 + i * 1.1) * 0.25;
    }
  });

  const orbitCount = isBoss ? 8 : 5;
  const ringInner = isBoss ? 1.65 : 1.2;
  const ringOuter = isBoss ? 2.05 : 1.55;

  return (
    <>
      {/* Flat ground ring - always visible marker */}
      <mesh ref={ring1Ref} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 36]} />
        <meshBasicMaterial color={isBoss ? "#ff4400" : "#ffcc00"} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* Second ring slightly tilted */}
      <mesh ref={ring2Ref} position={[0, 0.22, 0]} rotation={[-Math.PI / 2 + 0.42, 0, 0]}>
        <ringGeometry args={[ringInner * 0.75, ringOuter * 0.85, 28]} />
        <meshBasicMaterial color={isBoss ? "#ff7722" : "#ffe066"} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* Vertical spinning ring */}
      <mesh ref={ring3Ref} position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringInner * 0.9, 0.055, 8, 32]} />
        <meshStandardMaterial color={isBoss ? "#ff5500" : "#ffd835"} emissive={isBoss ? "#ff2200" : "#ffb300"} emissiveIntensity={isBoss ? 2.0 : 1.4} />
      </mesh>
      {/* Pulsing aura sphere */}
      <mesh ref={auraRef} position={[0, 0.8, 0]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color={isBoss ? "#ff3300" : "#ffcc44"} transparent opacity={0.12} depthWrite={false} side={THREE.BackSide} />
      </mesh>
      {/* Orbiting energy sparks */}
      {Array.from({ length: orbitCount }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { crownRefs.current[i] = m; }}
          position={[Math.cos((i / orbitCount) * Math.PI * 2) * (isBoss ? 1.9 : 1.45), 0.55, Math.sin((i / orbitCount) * Math.PI * 2) * (isBoss ? 1.9 : 1.45)]}
        >
          <sphereGeometry args={[isBoss ? 0.1 : 0.07, 6, 6]} />
          <meshBasicMaterial color={isBoss ? "#ff6622" : "#ffee55"} transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
      {/* Emissive glow instead of pointLight for performance */}
      <mesh scale={[isBoss ? 2.5 : 2.0, 1, isBoss ? 2.5 : 2.0]}>
        <sphereGeometry args={[0.8, 12, 12]} />
        <meshBasicMaterial
          color={isBoss ? "#ff4400" : "#ffcc33"}
          transparent
          opacity={0.15}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

function BossFloatGroup({
  type,
  damageState,
  children,
}: {
  type: EnemyType;
  damageState?: EnemyShipProps["damageState"];
  children: React.ReactNode;
}): ReactElement {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const isBoss = type === "boss" || type === "shore_battery";
    if (!isBoss || !groupRef.current) return;

    const t = state.clock.elapsedTime;

    // Y bob — primary float
    const bobY = Math.sin(t * 2.094) * 0.15;
    // Roll (Z) — ±2°, period ~4s
    const rollZ = Math.sin(t * 1.571) * 0.0349;
    // Pitch (X) — ±1°, period ~5s, phase offset so not lockstep with roll
    const pitchX = Math.sin(t * 1.257 + 0.6) * 0.0175;

    groupRef.current.position.y = bobY;
    groupRef.current.rotation.z = rollZ;
    groupRef.current.rotation.x = pitchX;

    // Sinking state — ship submerges as HP drops
    if (damageState === "sinking") {
      const sinkDepth = 0.4; // max 0.4 units below original Y
      groupRef.current.position.y = bobY - sinkDepth;
      // More violent rocking when sinking
      groupRef.current.rotation.z = Math.sin(t * 2.5) * 0.087; // ±5°
      groupRef.current.rotation.x = Math.sin(t * 2.0 + 0.8) * 0.052; // ±3°
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function getSmokeIntensity(type: EnemyType, damageState?: EnemyShipProps["damageState"]): number {
  let base = 0.75;
  if (type === "bomber" || type === "swarmer") base = 0.95;
  if (type === "brute" || type === "sniper" || type === "boss" || type === "shore_battery") base = 1.35;

  if (damageState === "smoking") return base * 1.8;
  if (damageState === "on_fire") return base * 2.4;
  if (damageState === "sinking") return base * 0.5;
  return base;
}

export function EnemyShip({ type, isElite = false, hitFlashTimer, damageState, ...props }: EnemyShipProps): ReactElement {
  let variant: ReactElement = <CorsairMesh />;
  if (type === "bomber" || type === "swarmer") {
    variant = <BomberMesh />;
  }
  if (type === "brute" || type === "sniper" || type === "boss" || type === "shore_battery") {
    variant = <BruteMesh />;
  }

  let smokeStacks: Array<[number, number, number]> = [[0, 1.65, 0]];
  if (type === "bomber" || type === "swarmer") {
    smokeStacks = [[-0.32, 2.0, 0], [0.32, 2.0, 0]];
  }
  if (type === "brute" || type === "sniper" || type === "boss" || type === "shore_battery") {
    smokeStacks = [[0, 2.2, 0]];
  }

  const isBoss = type === "boss" || type === "shore_battery";
  const showAura = isElite || isBoss;
  const scale = isElite ? (isBoss ? 1.0 : 1.45) : isBoss ? 1.16 : 1;

  // Hit flash: white overlay fades as timer approaches 0
  const flashOpacity = hitFlashTimer != null ? Math.max(0, hitFlashTimer / 0.1) * 0.6 : 0;

  const smokeIntensity = getSmokeIntensity(type, damageState);

  return (
    <group scale={scale} {...props}>
      <BossFloatGroup type={type} damageState={damageState}>
        {showAura ? <EliteAura isBoss={isBoss} /> : null}
        <ShipModelVisual
          config={ENEMY_MODEL_CONFIGS[type]}
          fallback={variant}
          eliteTint={isElite}
        />
        <ShipSmoke stackPositions={smokeStacks} intensity={smokeIntensity} />
        {/* White hit-flash overlay */}
        {flashOpacity > 0 && (
          <mesh position={[0, 0.85, 0]} scale={[2.0, 1.5, 3.5]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={flashOpacity} depthWrite={false} side={THREE.BackSide} />
          </mesh>
        )}
      </BossFloatGroup>
    </group>
  );
}
