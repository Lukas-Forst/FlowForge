import type { ReactElement } from "react";

interface PalmPropProps {
  variant: number;
}

const TRUNK = "#5a3a1a";
const FROND = "#3a8a3a";

export function PalmProp({ variant }: PalmPropProps): ReactElement {
  const lean = ((variant % 5) - 2) * 0.06;
  return (
    <group rotation={[lean, 0, lean * 0.4]}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.06, 0.10, 1.4, 7]} />
        <meshStandardMaterial color={TRUNK} roughness={0.85} />
      </mesh>
      {[0, 1, 2, 3, 4].map((n) => {
        const angle = (n / 5) * Math.PI * 2;
        const tilt = -Math.PI / 4 + (n % 2) * 0.1;
        return (
          <mesh
            key={n}
            castShadow
            position={[Math.cos(angle) * 0.3, 1.45, Math.sin(angle) * 0.3]}
            rotation={[tilt, angle, 0]}
          >
            <coneGeometry args={[0.08, 0.65, 5]} />
            <meshStandardMaterial color={FROND} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
