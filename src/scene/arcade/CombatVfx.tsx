import { Text } from "@react-three/drei";
import type { ReactElement } from "react";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ProjectileKind, ProjectileState, VisualEffect, VisualEffectKind } from "../../game/types";

const EFFECT_DURATION: Record<VisualEffectKind, number> = {
  waterSplash: 0.32,
  hitBurst: 0.26,
  muzzleFlash: 0.1,
  waterRippleSmall: 0.28,
  telegraphRing: 1.2,
  damageNumber: 0.8,
  enemyDeath: 1.0,
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
        radius: 0.24,
        color: "#d8f4ff",
        emissive: "#4cc6ff",
        emissiveIntensity: 1.9,
        metalness: 0.46,
        roughness: 0.24,
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

function ProjectileVisual({ projectile: p }: { projectile: ProjectileState }): ReactElement {
  const groupRef = useRef<THREE.Group>(null);
  const exhaustRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => (p.id % 23) * 0.35, [p.id]);
  const vx = p.velocity.x;
  const vz = p.velocity.y;
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.05 ? Math.atan2(vx, vz) : 0;
  const core = projectileCore(p.kind);
  const trail =
    p.kind === "playerAuto" || p.kind === "playerCannon" || p.kind === "playerTorpedo" || p.kind === "enemyBrute" || p.kind === "enemyBomber";

  const trailLen = p.kind === "enemyBomber" ? 0.72 : p.kind === "enemyBrute" ? 0.66 : p.kind === "playerCannon" ? 0.62 : p.kind === "playerTorpedo" ? 1.05 : 0.58;
  const trailRad = p.kind === "enemyBomber" ? 0.035 : p.kind === "enemyBrute" ? 0.12 : p.kind === "playerCannon" ? 0.11 : p.kind === "playerTorpedo" ? 0.16 : 0.05;

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (groupRef.current) {
      const bob = p.kind === "playerTorpedo" ? 0.05 : 0.024;
      groupRef.current.position.y = 0.56 + Math.sin(t * 9) * bob;
      if (p.kind === "playerTorpedo" || p.kind === "enemyBomber") {
        groupRef.current.rotation.z = Math.sin(t * 16) * 0.05;
      }
    }
    if (shellRef.current && p.kind === "playerTorpedo") {
      shellRef.current.rotation.y = t * 8;
    }
    if (exhaustRef.current) {
      const scale = 0.8 + (Math.sin(t * 24) + 1) * 0.22;
      exhaustRef.current.scale.set(scale, scale, scale);
      const mat = exhaustRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = p.kind === "playerTorpedo" ? 0.35 + Math.sin(t * 20) * 0.1 : 0.22 + Math.sin(t * 14) * 0.06;
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
      {p.kind === "playerTorpedo" ? (
        <mesh ref={shellRef} castShadow position={[0, 0, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.72, 12]} />
          <meshStandardMaterial color="#8b9eb0" emissive="#2e3f4d" emissiveIntensity={0.6} metalness={0.72} roughness={0.3} />
        </mesh>
      ) : null}
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
      {p.kind === "playerTorpedo" ? (
        <mesh position={[0, 0.02, -0.88]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.23, 14]} />
          <meshBasicMaterial color="#e8fcff" transparent opacity={0.48} depthWrite={false} />
        </mesh>
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
    return (
      <group position={[effect.position.x, 0.055, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.35, ring * 0.55, 20]} />
          <meshBasicMaterial color="#f5fdff" transparent opacity={0.35 * (1 - t)} depthWrite={false} />
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

  if (effect.kind === "muzzleFlash") {
    const flashScale = 0.34 + t * 0.46;
    return (
      <group position={[effect.position.x, 0.62, effect.position.y]}>
        <mesh scale={[flashScale, flashScale, flashScale]}>
          <sphereGeometry args={[0.28, 8, 8]} />
          <meshBasicMaterial color="#ffe7b8" transparent opacity={0.75 * (1 - t)} depthWrite={false} />
        </mesh>
        <mesh rotation={[0.2, t * 5, 0]} scale={[flashScale * 1.2, flashScale * 0.8, flashScale * 1.2]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial color="#ff9c3a" transparent opacity={0.62 * (1 - t)} depthWrite={false} />
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
    return (
      <group position={[effect.position.x, 0.8 + t * 1.5, effect.position.y]}>
        <Text
          color={effect.color || "#ffffff"}
          fontSize={0.4}
          outlineWidth={0.04}
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
    const scale = 1 + t * 4;
    return (
      <group position={[effect.position.x, 0.2, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.4, scale * 0.6, 24]} />
          <meshBasicMaterial color="#ffbd87" transparent opacity={0.8 * (1 - t)} depthWrite={false} />
        </mesh>
        <mesh scale={[1 + t * 2, 1 + t * 2, 1 + t * 2]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshBasicMaterial color="#ffdfb8" transparent opacity={0.7 * (1 - t)} depthWrite={false} />
        </mesh>
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
