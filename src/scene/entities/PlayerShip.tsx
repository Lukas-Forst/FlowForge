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
      <mesh castShadow position={[0, 0.34, 0]} scale={[1.32, 1, 1.64]}>
        <cylinderGeometry args={[0.96, 1.1, 0.56, 12]} />
        <meshStandardMaterial color="#273449" roughness={0.58} metalness={0.12} />
      </mesh>

      <mesh castShadow position={[0, 0.3, 1.55]}>
        <sphereGeometry args={[0.58, 10, 8]} />
        <meshStandardMaterial color="#31415a" roughness={0.58} metalness={0.1} />
      </mesh>

      <mesh castShadow position={[0, 0.8, -0.08]}>
        <boxGeometry args={[1.62, 0.48, 1.98]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.74} metalness={0.02} />
      </mesh>

      <mesh castShadow position={[0, 1.03, 1.02]} scale={[1.18, 1, 1]}>
        <cylinderGeometry args={[0.28, 0.36, 0.26, 10]} />
        <meshStandardMaterial color="#ffffff" roughness={0.72} metalness={0.02} />
      </mesh>

      {[-0.42, 0.05, 0.52].map((z, index) => {
        if (index === 2 && upgradeLevel < 4) {
          return null;
        }
        return (
          <group key={`stack-${z}`}>
            <mesh castShadow position={[0, 1.26, z]}>
              <cylinderGeometry args={[0.16, 0.22, 0.18, 10]} />
              <meshStandardMaterial color="#f4f6fb" roughness={0.66} metalness={0.03} />
            </mesh>
            <mesh castShadow position={[0, 1.86, z]}>
              <cylinderGeometry args={[0.19, 0.25, 1.12, 10]} />
              <meshStandardMaterial color="#e85d56" roughness={0.45} metalness={0.08} />
            </mesh>
            <mesh castShadow position={[0, 2.5, z]}>
              <cylinderGeometry args={[0.26, 0.26, 0.14, 12]} />
              <meshStandardMaterial color="#f4f6fb" roughness={0.5} metalness={0.06} />
            </mesh>
          </group>
        );
      })}

      {[-0.62, -0.08, 0.48].map((z) => (
        <mesh key={`port-left-${z}`} castShadow position={[-1.12, 0.48, z]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 10]} />
          <meshStandardMaterial color="#b9deff" roughness={0.35} metalness={0.12} />
        </mesh>
      ))}
      {[-0.62, -0.08, 0.48].map((z) => (
        <mesh key={`port-right-${z}`} castShadow position={[1.12, 0.48, z]}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 10]} />
          <meshStandardMaterial color="#b9deff" roughness={0.35} metalness={0.12} />
        </mesh>
      ))}

      <mesh castShadow position={[-1.2, 0.42, 0.02]}>
        <cylinderGeometry args={[0.22, 0.22, 0.84, 10]} />
        <meshStandardMaterial color="#f1b24a" roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh castShadow position={[1.2, 0.42, 0.02]}>
        <cylinderGeometry args={[0.22, 0.22, 0.84, 10]} />
        <meshStandardMaterial color="#f1b24a" roughness={0.5} metalness={0.1} />
      </mesh>

      {cannonOffsets.map((offset) => (
        <mesh key={`${offset.x}-${offset.z}`} castShadow position={[offset.x, 0.44, offset.z]}>
          <cylinderGeometry args={[0.09, 0.09, 0.7, 8]} />
          <meshStandardMaterial color="#24313d" roughness={0.42} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
