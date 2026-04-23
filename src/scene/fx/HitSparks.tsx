import type { ReactElement } from "react";

interface HitSparksProps {
  position: [number, number, number];
}

export function HitSparks({ position }: HitSparksProps): ReactElement {
  return (
    <group position={position}>
      <mesh position={[0.2, 0.2, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#fff2a8" />
      </mesh>
      <mesh position={[-0.18, 0.1, 0.14]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      <mesh position={[0.08, 0.28, -0.2]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#fff8cc" />
      </mesh>
    </group>
  );
}
