import type { ReactElement } from "react";
import type { ThreeElements } from "@react-three/fiber";

type PlayerShipProps = ThreeElements["group"] & {
  upgradeLevel: number;
};

export function PlayerShip({ upgradeLevel, ...props }: PlayerShipProps): ReactElement {
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
    <group {...props}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[1.8, 0.5, 3.1]} />
        <meshStandardMaterial color="#6f4c2a" roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, 0.85, 0]}>
        <boxGeometry args={[1.4, 0.55, 1.8]} />
        <meshStandardMaterial color="#7a5533" roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.3, 8]} />
        <meshStandardMaterial color="#2e2520" />
      </mesh>

      <mesh castShadow position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 1.4, 8]} />
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
    </group>
  );
}
