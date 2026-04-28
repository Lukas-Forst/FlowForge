import { Text } from "@react-three/drei";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ProjectileKind, ProjectileState, VisualEffect, VisualEffectKind } from "../../game/types";

const EFFECT_DURATION: Record<VisualEffectKind, number> = {
  waterSplash: 0.32,
  hitBurst: 0.26,
  depthBurst: 0.65,
  muzzleFlash: 0.1,
  waterRippleSmall: 0.28,
  telegraphRing: 1.2,
  damageNumber: 0.8,
  enemyDeath: 0.6,
  screenShake: 0.45,
};

function projectileCore(kind: ProjectileKind): {
  radius: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  metalness: number;
  roughness: number;
} {
  switch (kind) {
    case "playerAuto":
      return {
        radius: 0.2,
        color: "#fff2cf",
        emissive: "#ffb84a",
        emissiveIntensity: 1.5,
        metalness: 0.22,
        roughness: 0.28,
      };
    case "playerCannon":
      return {
        radius: 0.38,
        color: "#fff2cc",
        emissive: "#ff6a10",
        emissiveIntensity: 1.7,
        metalness: 0.4,
        roughness: 0.24,
      };
    case "playerTorpedo":
      return {
        radius: 0.3,
        color: "#c5f2ff",
        emissive: "#35d4ff",
        emissiveIntensity: 2.1,
        metalness: 0.46,
        roughness: 0.2,
      };
    case "enemyCorsair":
      return {
        radius: 0.2,
        color: "#c97862",
        emissive: "#4a1810",
        emissiveIntensity: 0.45,
        metalness: 0.12,
        roughness: 0.55,
      };
    case "enemyBomber":
      return {
        radius: 0.1,
        color: "#e0b7ff",
        emissive: "#6f29ab",
        emissiveIntensity: 2.3,
        metalness: 0.2,
        roughness: 0.34,
      };
    case "enemyBrute":
      return {
        radius: 0.3,
        color: "#b0b7c0",
        emissive: "#2a313b",
        emissiveIntensity: 1.6,
        metalness: 0.42,
        roughness: 0.48,
      };
    default:
      return {
        radius: 0.22,
        color: "#ffffff",
        emissive: "#000000",
        emissiveIntensity: 0,
        metalness: 0.1,
        roughness: 0.5,
      };
  }
}

function TorpedoVisual({ p }: { p: ProjectileState }): ReactElement {
  const vx = p.velocity.x;
  const vz = p.velocity.y;
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.05 ? Math.atan2(vx, vz) : 0;
  return (
    <group position={[p.position.x, 0.18, p.position.y]} rotation={[0, yaw, 0]}>
      {/* Water surface wake (circle scaled to oval) */}
      <mesh position={[0, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.32, 0.95, 1]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial color="#cef5ff" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      {/* Main elongated body */}
      <mesh scale={[0.48, 0.48, 1.9]} castShadow>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color="#c5f2ff" emissive="#35d4ff" emissiveIntensity={2.4} metalness={0.5} roughness={0.18} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 0.52]} scale={[0.3, 0.3, 0.22]}>
        <coneGeometry args={[0.3, 1, 8]} />
        <meshStandardMaterial color="#e8fbff" emissive="#80eeff" emissiveIntensity={1.6} metalness={0.4} roughness={0.2} />
      </mesh>
      {/* Side fins */}
      <mesh position={[0.22, 0, -0.44]}>
        <boxGeometry args={[0.08, 0.18, 0.26]} />
        <meshStandardMaterial color="#8cd8e8" emissive="#35d4ff" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[-0.22, 0, -0.44]}>
        <boxGeometry args={[0.08, 0.18, 0.26]} />
        <meshStandardMaterial color="#8cd8e8" emissive="#35d4ff" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.22, -0.44]}>
        <boxGeometry args={[0.18, 0.08, 0.26]} />
        <meshStandardMaterial color="#8cd8e8" emissive="#35d4ff" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.22, -0.44]}>
        <boxGeometry args={[0.18, 0.08, 0.26]} />
        <meshStandardMaterial color="#8cd8e8" emissive="#35d4ff" emissiveIntensity={0.9} metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Bubble trail */}
      <mesh position={[0, 0, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 1.1, 8]} />
        <meshStandardMaterial color="#b9f0ff" emissive="#35d4ff" emissiveIntensity={1.5} transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.92]} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1.15, 1.3]}>
        <coneGeometry args={[0.16, 1.1, 8]} />
        <meshBasicMaterial color="#dff8ff" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Glow */}
      <mesh scale={[0.6, 0.6, 2.1]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshBasicMaterial color="#e8fbff" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <pointLight color="#35d4ff" intensity={2.2} distance={4.0} />
    </group>
  );
}

function ProjectileVisual({ projectile: p }: { projectile: ProjectileState }): ReactElement {
  if (p.kind === "playerTorpedo") return <TorpedoVisual p={p} />;

  const groupRef = useRef<THREE.Group>(null);
  const exhaustRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => (p.id % 23) * 0.35, [p.id]);
  const vx = p.velocity.x;
  const vz = p.velocity.y;
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.05 ? Math.atan2(vx, vz) : 0;
  const core = projectileCore(p.kind);
  const trail =
    p.kind === "playerAuto" || p.kind === "playerCannon" || p.kind === "enemyBrute" || p.kind === "enemyBomber";

  const trailLen =
    p.kind === "enemyBomber" ? 0.72 : p.kind === "enemyBrute" ? 0.66 : p.kind === "playerCannon" ? 0.62 : 0.58;
  const trailRad =
    p.kind === "enemyBomber" ? 0.035 : p.kind === "enemyBrute" ? 0.12 : p.kind === "playerCannon" ? 0.11 : 0.05;

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (groupRef.current) {
      groupRef.current.position.y = 0.56 + Math.sin(t * 9) * 0.024;
      if (p.kind === "enemyBomber") {
        groupRef.current.rotation.z = Math.sin(t * 16) * 0.05;
      }
    }
    if (exhaustRef.current) {
      const scale = 0.8 + (Math.sin(t * 24) + 1) * 0.22;
      exhaustRef.current.scale.set(scale, scale, scale);
      const mat = exhaustRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 + Math.sin(t * 14) * 0.06;
    }
  });

  return (
    <group ref={groupRef} position={[p.position.x, 0.56, p.position.y]} rotation={[0, yaw, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[core.radius, 14, 14]} />
        <meshStandardMaterial
          color={core.color}
          emissive={core.emissive}
          emissiveIntensity={core.emissiveIntensity}
          metalness={core.metalness}
          roughness={core.roughness}
        />
      </mesh>
      {trail ? (
        <>
          <mesh position={[0, 0, -trailLen * 0.48]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[trailRad, trailLen, 6]} />
            <meshStandardMaterial
              color={p.kind.startsWith("enemy") ? (p.kind === "enemyBomber" ? "#d5aaff" : "#808892") : "#ffd698"}
              emissive={p.kind.startsWith("enemy") ? (p.kind === "enemyBomber" ? "#7c2fca" : "#2f3640") : "#ff8c22"}
              emissiveIntensity={p.kind.startsWith("enemy") ? (p.kind === "enemyBomber" ? 1.8 : 1.2) : 0.68}
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0, -trailLen * 0.52]} rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 1.1, 1.25]}>
            <coneGeometry args={[trailRad, trailLen, 6]} />
            <meshBasicMaterial
              color={p.kind.startsWith("enemy") ? (p.kind === "enemyBomber" ? "#d7c3ec" : "#8e949e") : "#fff2d1"}
              transparent
              opacity={p.kind.startsWith("enemy") ? 0.16 : 0.26}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}
      {trail ? (
        <mesh ref={exhaustRef} position={[0, 0.01, -trailLen * 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[trailRad * 0.5, trailRad * 1.24, 12]} />
          <meshBasicMaterial color={p.kind.startsWith("enemy") ? "#ffd7c2" : "#fff7da"} transparent opacity={0.25} depthWrite={false} />
        </mesh>
      ) : null}
      {p.kind === "playerAuto" || p.kind === "playerCannon" ? (
        <mesh scale={[1.18, 1.18, 1.18]}>
          <sphereGeometry args={[core.radius, 10, 10]} />
          <meshBasicMaterial color="#fff6dd" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function VisualEffectSprite({ effect }: { effect: VisualEffect }): ReactElement | null {
  const max = EFFECT_DURATION[effect.kind];
  const t = Math.max(0, Math.min(1, 1 - effect.remaining / max));

  if (effect.kind === "waterSplash") {
    const ring = 0.45 + t * 4.4;
    const opacity = 0.35 * (1 - t * t);
    return (
      <group position={[effect.position.x, 0.055, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[ring, ring, 1]}>
          <circleGeometry args={[0.5, 20]} />
          <meshBasicMaterial color="#f5fdff" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.12 + t * 0.2, 8, 8]} />
          <meshBasicMaterial color="#dff6ff" transparent opacity={0.4 * (1 - t)} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "waterRippleSmall") {
    const ring = 0.26 + t * 1.45;
    return (
      <group position={[effect.position.x, 0.05, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.36, ring * 0.52, 18]} />
          <meshBasicMaterial color="#dff8ff" transparent opacity={0.34 * (1 - t)} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.58, ring * 0.76, 18]} />
          <meshBasicMaterial color="#f8fdff" transparent opacity={0.18 * (1 - t)} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "depthBurst") {
    const geyserH = 0.4 + t * 3.5;
    const outerRing = 0.5 + t * 5.5;
    return (
      <group position={[effect.position.x, 0.05, effect.position.y]}>
        {/* Expanding water ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[outerRing * 0.7, outerRing, 28]} />
          <meshBasicMaterial color="#7bd3ff" transparent opacity={0.7 * (1 - t)} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[outerRing * 0.3, outerRing * 0.65, 28]} />
          <meshBasicMaterial color="#c8f0ff" transparent opacity={0.45 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* Water geyser pillar */}
        <mesh position={[0, geyserH * 0.5, 0]} scale={[1 - t * 0.5, 1, 1 - t * 0.5]}>
          <cylinderGeometry args={[0.28 + t * 0.4, 0.55 + t * 0.8, geyserH, 12]} />
          <meshBasicMaterial color="#d8f6ff" transparent opacity={0.72 * (1 - t * 0.8)} depthWrite={false} />
        </mesh>
        {/* Spray crown */}
        <mesh position={[0, geyserH, 0]} scale={[1 + t * 1.5, 1, 1 + t * 1.5]}>
          <sphereGeometry args={[0.5 + t * 0.6, 12, 8]} />
          <meshBasicMaterial color="#e8fbff" transparent opacity={0.6 * (1 - t)} depthWrite={false} />
        </mesh>
        <pointLight color="#7bd3ff" intensity={3.5 * (1 - t)} distance={8} />
      </group>
    );
  }

  if (effect.kind === "muzzleFlash") {
    const flashScale = 0.4 + t * 0.55;
    const glowScale = 0.6 + t * 0.8;
    return (
      <group position={[effect.position.x, 0.62, effect.position.y]}>
        {/* outer glow */}
        <mesh scale={[glowScale, glowScale, glowScale]}>
          <sphereGeometry args={[0.28, 8, 8]} />
          <meshBasicMaterial color="#fff4e0" transparent opacity={0.5 * (1 - t * 0.8)} depthWrite={false} />
        </mesh>
        {/* core flash */}
        <mesh scale={[flashScale, flashScale, flashScale]}>
          <sphereGeometry args={[0.28, 8, 8]} />
          <meshBasicMaterial color="#ffe7b8" transparent opacity={0.85 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* spark */}
        <mesh rotation={[0.2, t * 7, 0]} scale={[flashScale * 1.4, flashScale * 0.9, flashScale * 1.4]}>
          <octahedronGeometry args={[0.24, 0]} />
          <meshBasicMaterial color="#ff9c3a" transparent opacity={0.7 * (1 - t)} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "telegraphRing") {
    const radius = Math.max(0.1, effect.remaining * 2.5);
    return (
      <group position={[effect.position.x, 0.08, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.85, radius, 32]} />
          <meshBasicMaterial color="#ff5050" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "damageNumber") {
    const baseSize = 0.4;
    const scaleMult = effect.scale ?? 1.0;
    return (
      <group position={[effect.position.x, 0.8 + t * 1.5, effect.position.y]}>
        <Text
          color={effect.color || "#ffffff"}
          fontSize={baseSize * scaleMult}
          outlineWidth={0.04 * scaleMult}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
          fillOpacity={1 - Math.pow(t, 2)}
        >
          {effect.text || ""}
        </Text>
      </group>
    );
  }

  if (effect.kind === "enemyDeath") {
    const scale = 1 + t * 4.5;
    const sparkCount = 6;
    return (
      <group position={[effect.position.x, 0.2, effect.position.y]}>
        {/* expanding ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.4, scale * 0.65, 24]} />
          <meshBasicMaterial color="#ffbd87" transparent opacity={0.85 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* burst sphere */}
        <mesh scale={[1 + t * 2.5, 1 + t * 2.5, 1 + t * 2.5]}>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshBasicMaterial color="#ffdfb8" transparent opacity={0.75 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* debris sparks */}
        {Array.from({ length: sparkCount }, (_, i) => {
          const angle = (i / sparkCount) * Math.PI * 2 + t * 3;
          const dist = 0.3 + t * 2.5;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * dist, 0.3 + t * 1.2, Math.sin(angle) * dist]}
              scale={[0.08 + t * 0.15, 0.08 + t * 0.15, 0.08 + t * 0.15]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ffd28b" transparent opacity={0.9 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (effect.kind === "screenShake") return null;

  return (
    <group position={[effect.position.x, 0.62, effect.position.y]}>
      <mesh>
        <sphereGeometry args={[0.22 + t * 0.35, 10, 10]} />
        <meshStandardMaterial
          color="#ffe6b0"
          emissive="#ff6a18"
          emissiveIntensity={1.8 * (1 - t * 0.85)}
          transparent
          opacity={0.95 * (1 - t * 0.7)}
        />
      </mesh>
      <mesh rotation={[0.3, t * 4, 0]}>
        <octahedronGeometry args={[0.18 + t * 0.25, 0]} />
        <meshStandardMaterial color="#fff0cc" emissive="#ffb020" emissiveIntensity={1.2 * (1 - t)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]}>
        <ringGeometry args={[0.26 + t * 0.48, 0.36 + t * 0.68, 16]} />
        <meshBasicMaterial color="#ffd28b" transparent opacity={0.4 * (1 - t)} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function CombatProjectiles({ projectiles }: { projectiles: ProjectileState[] }): ReactElement {
  return (
    <>
      {projectiles.map((p) => (
        <ProjectileVisual key={p.id} projectile={p} />
      ))}
    </>
  );
}

export function ArenaVisualEffects({ effects }: { effects: VisualEffect[] }): ReactElement {
  return (
    <>
      {effects.map((e) => (
        <VisualEffectSprite key={e.id} effect={e} />
      ))}
    </>
  );
}
