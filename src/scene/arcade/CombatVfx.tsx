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
  broadsideCharge: 0.3,
  waterRippleSmall: 0.28,
  telegraphRing: 1.2,
  damageNumber: 0.8,
  enemyDeath: 0.6,
  enemyDeathSmall: 0.3,
  enemyDeathHeavy: 1.0,
  enemyDeathExplosive: 0.75,
  screenShake: 0.45,
  cannonReady: 999,
  playerWake: 999,
  projectileSplash: 0.38,
  afterimage: 0.4,
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
    const heatRingScale = 0.15 + t * 2.5;
    const smokeDrift = t * 0.4;
    const smokeOpacity = 0.22 * (1 - t * 1.1);
    return (
      <group position={[effect.position.x, 0.62, effect.position.y]}>
        {/* heat-shimmer ring — expands rapidly outward */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[heatRingScale, heatRingScale, heatRingScale]}>
          <ringGeometry args={[0.6, 1.0, 24]} />
          <meshBasicMaterial color="#ff8833" transparent opacity={0.65 * (1 - t * 1.2)} depthWrite={false} />
        </mesh>
        {/* secondary heat shimmer — thinner, brighter inner ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[heatRingScale * 0.7, heatRingScale * 0.7, heatRingScale * 0.7]}>
          <ringGeometry args={[0.7, 0.85, 24]} />
          <meshBasicMaterial color="#ffcc88" transparent opacity={0.4 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* smoke puff cone — drifts up and fades */}
        <mesh
          position={[smokeDrift * 0.3, 0.3 + smokeDrift * 1.2, smokeDrift * 0.2]}
          rotation={[0.15, smokeDrift * 2, 0.1]}
          scale={[0.8 + t * 0.6, 0.6 + t * 0.8, 0.8 + t * 0.6]}
        >
          <coneGeometry args={[0.35, 0.9, 10]} />
          <meshBasicMaterial color="#b0b0b0" transparent opacity={smokeOpacity} depthWrite={false} />
        </mesh>
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
    // Flicker between 0.3 and 0.7 for an alarming, threatening pulse
    const flicker = Math.sin(effect.remaining * 14) > 0 ? 0.7 : 0.3;
    return (
      <group position={[effect.position.x, 0.08, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.85, radius, 32]} />
          <meshBasicMaterial color="#ff5050" transparent opacity={flicker} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "damageNumber") {
    const baseSize = 0.55;
    const scaleMult = effect.scale ?? 1.0;
    // Crit shake: wiggle left/right based on time + id
    const shakeX = effect.shake ? Math.sin((effect.id * 7.3 + (effect.remaining / 0.9) * 20) * 4) * 0.12 * (effect.remaining / 0.9) : 0;
    const shakeY = effect.shake ? Math.cos((effect.id * 5.1 + (effect.remaining / 0.9) * 17) * 3.5) * 0.06 * (effect.remaining / 0.9) : 0;
    return (
      <group position={[effect.position.x + shakeX, 0.85 + t * 1.5 + shakeY, effect.position.y]}>
        <Text
          color={effect.color || "#ffffff"}
          fontSize={baseSize * scaleMult}
          outlineWidth={0.06 * scaleMult}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
          fillOpacity={1 - Math.pow(t, 1.5)}
          fontWeight="bold"
        >
          {effect.text || ""}
        </Text>
      </group>
    );
  }

  if (effect.kind === "enemyDeath") {
    const scale = 1 + t * 4.5;
    const sparkCount = Math.max(2, Math.round(12 * particleScale));
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

  if (effect.kind === "enemyDeathSmall") {
    // Small quick pop for swarmer — 4 sparks, fast fade
    const dist = 0.15 + t * 0.9;
    return (
      <group position={[effect.position.x, 0.15, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12 + t * 0.4, 0.18 + t * 0.55, 12]} />
          <meshBasicMaterial color="#ffbd87" transparent opacity={0.8 * (1 - t)} depthWrite={false} />
        </mesh>
        <mesh scale={[1 + t * 1.4, 1 + t * 1.4, 1 + t * 1.4]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#ffdfb8" transparent opacity={0.7 * (1 - t)} depthWrite={false} />
        </mesh>
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * dist, 0.2 + t * 0.6, Math.sin(angle) * dist]} scale={[0.06, 0.06, 0.06]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ffd28b" transparent opacity={0.85 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (effect.kind === "enemyDeathHeavy") {
    // Large splash ring + debris for brute — slow fade
    const scale = 1 + t * 7;
    const debrisCount = Math.max(2, Math.round(16 * particleScale));
    return (
      <group position={[effect.position.x, 0.15, effect.position.y]}>
        {/* big outer ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.35, scale * 0.58, 28]} />
          <meshBasicMaterial color="#c8d8e8" transparent opacity={0.8 * (1 - t * 0.6)} depthWrite={false} />
        </mesh>
        {/* inner ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.55, scale * 0.72, 28]} />
          <meshBasicMaterial color="#e0eeff" transparent opacity={0.55 * (1 - t * 0.7)} depthWrite={false} />
        </mesh>
        {/* heavy burst sphere */}
        <mesh scale={[1 + t * 3, 1 + t * 3, 1 + t * 3]}>
          <sphereGeometry args={[0.45, 14, 14]} />
          <meshBasicMaterial color="#d8e8f8" transparent opacity={0.7 * (1 - t * 0.8)} depthWrite={false} />
        </mesh>
        {/* debris */}
        {Array.from({ length: debrisCount }, (_, i) => {
          const angle = (i / debrisCount) * Math.PI * 2 + t * 1.5;
          const dist = 0.4 + t * 3.2;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * dist, 0.25 + t * 1.5, Math.sin(angle) * dist]}
              scale={[0.1 + t * 0.2, 0.1 + t * 0.2, 0.1 + t * 0.2]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#b8c8d8" transparent opacity={0.9 * (1 - t * 0.9)} depthWrite={false} />
            </mesh>
          );
        })}
        <pointLight color="#c8d8ff" intensity={2.5 * (1 - t)} distance={6} />
      </group>
    );
  }

  if (effect.kind === "enemyDeathExplosive") {
    // Fiery explosion for bomber — orange particles + smoke
    const scale = 1 + t * 5.5;
    const sparkCount = Math.max(2, Math.round(8 * particleScale));
    return (
      <group position={[effect.position.x, 0.2, effect.position.y]}>
        {/* fiery outer ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.38, scale * 0.62, 22]} />
          <meshBasicMaterial color="#ff7020" transparent opacity={0.9 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* inner orange ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[scale * 0.2, scale * 0.36, 22]} />
          <meshBasicMaterial color="#ffaa40" transparent opacity={0.75 * (1 - t)} depthWrite={false} />
        </mesh>
        {/* fiery burst sphere */}
        <mesh scale={[1 + t * 2.8, 1 + t * 2.8, 1 + t * 2.8]}>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial color="#ff9030" transparent opacity={0.8 * (1 - t * 0.9)} depthWrite={false} />
        </mesh>
        {/* smoke puff */}
        <mesh position={[0, 0.35 + t * 0.8, 0]} scale={[0.6 + t * 1.2, 0.6 + t * 1.2, 0.6 + t * 1.2]}>
          <sphereGeometry args={[0.32, 8, 8]} />
          <meshBasicMaterial color="#505050" transparent opacity={0.4 * (1 - t * 1.1)} depthWrite={false} />
        </mesh>
        {/* sparks */}
        {Array.from({ length: sparkCount }, (_, i) => {
          const angle = (i / sparkCount) * Math.PI * 2 + t * 4;
          const dist = 0.35 + t * 2.8;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * dist, 0.3 + t * 1.5, Math.sin(angle) * dist]}
              scale={[0.08 + t * 0.18, 0.08 + t * 0.18, 0.08 + t * 0.18]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#ff8820" transparent opacity={0.9 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
        <pointLight color="#ff8020" intensity={3 * (1 - t)} distance={7} />
      </group>
    );
  }

  if (effect.kind === "screenShake") return null;

  if (effect.kind === "cannonReady") {
    const pulse = 0.65 + Math.sin(effect.remaining * Math.PI * 2.2) * 0.35;
    return (
      <group position={[effect.position.x, 0.08, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9 * pulse, 1.25 * pulse, 32]} />
          <meshBasicMaterial color="#ffc040" transparent opacity={0.38 * pulse} depthWrite={false} />
        </mesh>
        <mesh scale={[pulse * 1.2, pulse * 1.2, pulse * 1.2]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#ffe080" transparent opacity={0.25 * pulse} depthWrite={false} />
        </mesh>
        <pointLight color="#ffb030" intensity={pulse * 1.2} distance={4} />
      </group>
    );
  }

  if (effect.kind === "playerWake") {
    const ring = 0.38 + (1 - Math.min(1, effect.remaining / 1.8)) * 0.72;
    const opacity = 0.28 * Math.min(1, effect.remaining / 0.4);
    return (
      <group position={[effect.position.x, 0.04, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.4, ring * 0.62, 16]} />
          <meshBasicMaterial color="#c8eeff" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.62, ring * 0.8, 16]} />
          <meshBasicMaterial color="#e8f8ff" transparent opacity={opacity * 0.55} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "projectileSplash") {
    const ring = 0.3 + t * 1.8;
    const opacity = 0.32 * (1 - t);
    return (
      <group position={[effect.position.x, 0.055, effect.position.y]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.3, ring * 0.5, 16]} />
          <meshBasicMaterial color="#dff6ff" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 0.5, ring * 0.68, 16]} />
          <meshBasicMaterial color="#f0fbff" transparent opacity={opacity * 0.6} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[0.06 + t * 0.08, 6, 6]} />
          <meshBasicMaterial color="#e0f8ff" transparent opacity={0.25 * (1 - t)} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (effect.kind === "afterimage") {
    // Ghost ship sprite facing the stored direction, fading out as remaining decays
    const opacity = (effect.remaining / 0.4) * 0.55;
    const yaw = effect.facing ?? 0;
    return (
      <group position={[effect.position.x, 0, effect.position.y]} rotation={[0, yaw, 0]}>
        {/* Hull */}
        <mesh position={[0, 0.35, 0]}>
          <capsuleGeometry args={[0.72, 1.7, 6, 12]} />
          <meshStandardMaterial color="#3f2a1b" transparent opacity={opacity} roughness={0.76} depthWrite={false} />
        </mesh>
        {/* Deck */}
        <mesh position={[0, 0.84, 0]}>
          <boxGeometry args={[1.4, 0.55, 1.8]} />
          <meshStandardMaterial color="#b48a62" transparent opacity={opacity} roughness={0.62} depthWrite={false} />
        </mesh>
        {/* Left cannon */}
        <mesh position={[-0.26, 1.05, -0.08]}>
          <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
          <meshStandardMaterial color="#2e2520" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        <mesh position={[-0.26, 1.77, -0.08]}>
          <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
          <meshStandardMaterial color="#2e2520" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        {/* Right cannon */}
        <mesh position={[0.26, 1.05, -0.08]}>
          <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
          <meshStandardMaterial color="#2e2520" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        <mesh position={[0.26, 1.77, -0.08]}>
          <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
          <meshStandardMaterial color="#2e2520" transparent opacity={opacity} depthWrite={false} />
        </mesh>
        {/* Left hull */}
        <mesh position={[-1.08, 0.38, 0.05]}>
          <boxGeometry args={[0.28, 0.55, 1.1]} />
          <meshStandardMaterial color="#5c3d20" transparent opacity={opacity} roughness={0.75} depthWrite={false} />
        </mesh>
        {/* Right hull */}
        <mesh position={[1.08, 0.38, 0.05]}>
          <boxGeometry args={[0.28, 0.55, 1.1]} />
          <meshStandardMaterial color="#5c3d20" transparent opacity={opacity} roughness={0.75} depthWrite={false} />
        </mesh>
      </group>
    );
  }

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

export function ArenaVisualEffects({ effects, particleScale = 1 }: { effects: VisualEffect[]; particleScale?: number }): ReactElement {
  return (
    <>
      {effects.map((e) => (
        <VisualEffectSprite key={e.id} effect={e} />
      ))}
    </>
  );
}
