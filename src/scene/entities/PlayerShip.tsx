import type { ReactElement } from "react";
import type { ThreeElements } from "@react-three/fiber";
import { PLAYER_SHIP_MODEL_CONFIG, ShipModelVisual } from "../models/ShipModelVisual";

type PlayerShipProps = ThreeElements["group"] & {
  upgradeLevel: number;
};

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

function PlayerShipPrimitive(): ReactElement {
  return (
    <>
      <mesh castShadow position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.72, 1.7, 6, 12]} />
        <meshStandardMaterial color="#3f2a1b" roughness={0.76} />
      </mesh>

      <mesh castShadow position={[0, 0.84, 0]}>
        <boxGeometry args={[1.4, 0.55, 1.8]} />
        <meshStandardMaterial color="#b48a62" roughness={0.62} />
      </mesh>

      <mesh castShadow position={[-0.26, 1.05, -0.08]}>
        <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#2e2520" />
      </mesh>
      <mesh castShadow position={[-0.26, 1.77, -0.08]}>
        <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
        <meshStandardMaterial color="#2e2520" />
      </mesh>
      <mesh castShadow position={[0.26, 1.05, -0.08]}>
        <cylinderGeometry args={[0.17, 0.2, 0.3, 8]} />
        <meshStandardMaterial color="#2e2520" />
      </mesh>
      <mesh castShadow position={[0.26, 1.77, -0.08]}>
        <cylinderGeometry args={[0.12, 0.15, 1.15, 8]} />
        <meshStandardMaterial color="#2e2520" />
      </mesh>

      <mesh castShadow position={[-1.08, 0.38, 0.05]}>
        <boxGeometry args={[0.28, 0.55, 1.1]} />
        <meshStandardMaterial color="#5c3d20" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[1.08, 0.38, 0.05]}>
        <boxGeometry args={[0.28, 0.55, 1.1]} />
        <meshStandardMaterial color="#5c3d20" roughness={0.75} />
      </mesh>
    </>
  );
}

export function PlayerShip({ upgradeLevel, ...props }: PlayerShipProps): ReactElement {
  return (
    <group {...props}>
      <ShipModelVisual config={PLAYER_SHIP_MODEL_CONFIG} fallback={<PlayerShipPrimitive />} />
      <DeckCannons upgradeLevel={upgradeLevel} />
    </group>
  );
}
