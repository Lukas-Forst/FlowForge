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

      <mesh castShadow position={[0, 0.85, -0.2]}>
        <boxGeometry args={[1.2, 0.45, 1.3]} />
        <meshStandardMaterial color="#8b6437" roughness={0.7} />
      </mesh>

      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.11, 0.14, 1.8, 8]} />
        <meshStandardMaterial color="#3d3023" />
      </mesh>

      <mesh castShadow position={[0, 1.55, 0.2]}>
        <boxGeometry args={[0.06, 1.1, 1.1]} />
        <meshStandardMaterial color="#e9e5cf" />
      </mesh>

      {cannonOffsets.map((offset) => (
        <mesh key={`${offset.x}-${offset.z}`} castShadow position={[offset.x, 0.55, offset.z]}>
          <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
          <meshStandardMaterial color="#292728" />
        </mesh>
      ))}
    </group>
  );
}
