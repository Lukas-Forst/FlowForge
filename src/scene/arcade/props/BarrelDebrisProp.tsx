import type { ReactElement } from "react";

interface BarrelDebrisPropProps {
  variant: number;
}

export function BarrelDebrisProp({ variant }: BarrelDebrisPropProps): ReactElement {
  const tilt = ((variant % 7) - 3) * 0.08;
  return (
    <group rotation={[tilt, 0, tilt * 0.6]}>
      <mesh castShadow position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.55, 12]} />
        <meshStandardMaterial color="#6b3a18" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.225, 0.225, 0.06, 12]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} />
      </mesh>
      <mesh position={[-0.22, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.225, 0.225, 0.06, 12]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} />
      </mesh>
    </group>
  );
}
