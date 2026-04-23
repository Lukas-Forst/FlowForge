import type { ReactElement } from "react";

interface RockOutcropPropProps {
  seed: number;
}

export function RockOutcropProp({ seed }: RockOutcropPropProps): ReactElement {
  const s = 0.8 + (seed % 7) * 0.08;
  return (
    <group scale={s}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color="#5f6674" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.4, 0.2, -0.2]} scale={[0.7, 0.6, 0.8]}>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#4e5562" roughness={0.9} />
      </mesh>
    </group>
  );
}
