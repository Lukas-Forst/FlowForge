import type { ReactElement } from "react";
import { useRef } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ShipSmoke } from "../effects/ShipSmoke";
import { PLAYER_SHIP_MODEL_CONFIG, ShipModelVisual } from "../models/ShipModelVisual";

export interface PlayerShipProps extends ThreeElements["group"] {
  upgradeLevel: number;
  invulnRemaining?: number;
}

const SHOW_DECK_CANNON_ATTACHMENTS = false;
const GHOST_SPARKLE_COUNT = 8;

function GhostSparkles({ invulnRemaining }: { invulnRemaining: number }): ReactElement {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sparkStates = useRef(
    Array.from({ length: GHOST_SPARKLE_COUNT }, (_, i) => ({
      t: Math.random(),
      speed: 1.5 + Math.random() * 1.5,
      radius: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      yOffset: Math.random() * 1.5 - 0.2,
    })),
  );

  useFrame((_state, delta) => {
    if (invulnRemaining <= 0) return;
    sparkStates.current.forEach((s, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      s.t = (s.t + delta * s.speed) % 1;
      const angle = s.t * Math.PI * 2 + s.phase;
      const fade = Math.sin(s.t * Math.PI);
      mesh.position.set(
        Math.cos(angle) * s.radius,
        0.5 + s.yOffset + s.t * 0.5,
        Math.sin(angle) * s.radius,
      );
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = fade * 0.85;
      const scale = 0.05 + fade * 0.12;
      mesh.scale.setScalar(scale);
    });
  });

  return (
    <>
      {Array.from({ length: GHOST_SPARKLE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => { meshRefs.current[i] = m; }}
          frustumCulled={false}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function DeckCannons({ upgradeLevel }: { upgradeLevel: number }): ReactElement {
  const bonusCannons = Math.min(4, Math.floor(upgradeLevel / 2) + 1);
  const cannonOffsets = Array.from({ length: bonusCannons }, (_, index) => {
    const side = index % 2 === 0 ? 1 : -1;
    const row = Math.floor(index / 2);
    return {
      x: side * 0.95,
      z: -0.6 + row * 0.9,
    };
  });

  return (
    <>
      {cannonOffsets.map((offset) => (
        <mesh key={`${offset.x}-${offset.z}`} castShadow position={[offset.x, 0.38, offset.z]}>
          <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
          <meshStandardMaterial color="#292728" />
        </mesh>
      ))}

      {upgradeLevel >= 4 ? (
        <mesh castShadow position={[0, 1.65, -0.9]}>
          <cylinderGeometry args={[0.12, 0.15, 0.9, 8]} />
          <meshStandardMaterial color="#2e2520" />
        </mesh>
      ) : null}
    </>
  );
}

function PlayerShipPrimitive({ opacity = 1 }: { opacity?: number }): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.72, 1.7, 6, 12]} />
        <meshStandardMaterial color="#3f2a1b" roughness={0.76} transparent opacity={opacity} />
      </mesh>

      <mesh castShadow position={[0, 0.84, 0]}>
        <boxGeometry args={[1.4, 0.55, 1.8]} />
        <meshStandardMaterial color="#b48a62" roughness={0.62} transparent opacity={opacity} />
      </mesh>

      <mesh castShadow position={[-0.26, 1.05, -0.08]}>
        <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#2e2520" transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[-0.26, 1.77, -0.08]}>
        <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
        <meshStandardMaterial color="#2e2520" transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0.26, 1.05, -0.08]}>
        <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#2e2520" transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[0.26, 1.77, -0.08]}>
        <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
        <meshStandardMaterial color="#2e2520" transparent opacity={opacity} />
      </mesh>

      <mesh castShadow position={[-1.08, 0.38, 0.05]}>
        <boxGeometry args={[0.28, 0.55, 1.1]} />
        <meshStandardMaterial color="#5c3d20" roughness={0.75} transparent opacity={opacity} />
      </mesh>
      <mesh castShadow position={[1.08, 0.38, 0.05]}>
        <boxGeometry args={[0.28, 0.55, 1.1]} />
        <meshStandardMaterial color="#5c3d20" roughness={0.75} transparent opacity={opacity} />
      </mesh>
    </>
  );
}

export function PlayerShip({ upgradeLevel, invulnRemaining = 0, ...props }: PlayerShipProps): ReactElement {
  const isGhosted = invulnRemaining > 0;
  const shipOpacity = isGhosted ? 0.5 : 1;

  return (
    <group {...props}>
      {/* Ghost sparkle trail */}
      {isGhosted && <GhostSparkles invulnRemaining={invulnRemaining} />}

      <ShipModelVisual
        config={{
          ...PLAYER_SHIP_MODEL_CONFIG,
          materialPreset: isGhosted ? undefined : "playerSteamboat",
        }}
        fallback={<PlayerShipPrimitive opacity={shipOpacity} />}
      />
      {shipOpacity < 1 && (
        // When ghosted, also halve the smoke opacity via intensity
        <ShipSmoke stackPositions={[[-0.26, 1.95, -0.08], [0.26, 1.95, -0.08]]} intensity={isGhosted ? 0.5 : 1.1} />
      )}
      {!isGhosted && (
        <ShipSmoke stackPositions={[[-0.26, 1.95, -0.08], [0.26, 1.95, -0.08]]} intensity={1.1} />
      )}
      {SHOW_DECK_CANNON_ATTACHMENTS ? <DeckCannons upgradeLevel={upgradeLevel} /> : null}
    </group>
  );
}