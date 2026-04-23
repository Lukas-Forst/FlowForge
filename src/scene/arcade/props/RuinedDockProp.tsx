import type { ReactElement } from "react";

export function RuinedDockProp(): ReactElement {
  return (
    <group>
      <mesh castShadow position={[0, 0.15, 0]} rotation={[0.05, 0.3, 0.02]}>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshStandardMaterial color="#7a4d2c" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[-0.9, -0.2, -0.2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.9, 8]} />
        <meshStandardMaterial color="#5a341d" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.9, -0.15, 0.1]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#5a341d" roughness={0.9} />
      </mesh>
    </group>
  );
}
