import type { ReactElement } from "react";
import type { ProjectileKind, ProjectileState, VisualEffect, VisualEffectKind } from "../../game/types";

const EFFECT_DURATION: Record<VisualEffectKind, number> = {
  waterSplash: 0.32,
  hitBurst: 0.26,
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
        radius: 0.26,
        color: "#ffe8a8",
        emissive: "#ff9a1a",
        emissiveIntensity: 1.35,
        metalness: 0.22,
        roughness: 0.32,
      };
    case "playerCannon":
      return {
        radius: 0.34,
        color: "#fff2cc",
        emissive: "#ff7a14",
        emissiveIntensity: 1.55,
        metalness: 0.35,
        roughness: 0.28,
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
        radius: 0.13,
        color: "#d4a8ff",
        emissive: "#3a1a5c",
        emissiveIntensity: 0.55,
        metalness: 0.2,
        roughness: 0.38,
      };
    case "enemyBrute":
      return {
        radius: 0.3,
        color: "#9aa0a8",
        emissive: "#1a1e24",
        emissiveIntensity: 0.35,
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
  const vx = p.velocity.x;
  const vz = p.velocity.y;
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.05 ? Math.atan2(vx, vz) : 0;
  const core = projectileCore(p.kind);
  const trail =
    p.kind === "playerAuto" || p.kind === "playerCannon" || p.kind === "enemyBrute" || p.kind === "enemyBomber";

  const trailLen = p.kind === "enemyBomber" ? 0.42 : p.kind === "enemyBrute" ? 0.55 : p.kind === "playerCannon" ? 0.5 : 0.38;
  const trailRad = p.kind === "enemyBomber" ? 0.06 : 0.09;

  return (
    <group position={[p.position.x, 0.56, p.position.y]} rotation={[0, yaw, 0]}>
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
        <mesh position={[0, 0, -trailLen * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[trailRad, trailLen, 6]} />
          <meshStandardMaterial
            color={p.kind.startsWith("enemy") ? "#6a6f78" : "#ffd699"}
            emissive={p.kind.startsWith("enemy") ? "#22262c" : "#ff8c22"}
            emissiveIntensity={p.kind.startsWith("enemy") ? 0.25 : 0.55}
            transparent
            opacity={0.85}
            depthWrite={false}
          />
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

function VisualEffectSprite({ effect }: { effect: VisualEffect }): ReactElement {
  const max = EFFECT_DURATION[effect.kind];
  const t = Math.max(0, Math.min(1, 1 - effect.remaining / max));

  if (effect.kind === "waterSplash") {
    const ring = 0.35 + t * 2.8;
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
