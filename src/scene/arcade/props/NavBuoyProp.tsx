import type { ReactElement } from "react";

interface NavBuoyPropProps {
  variant: number;
}

const POLE_COLOR = "#2d2520";
const CAP_COLORS = ["#d24230", "#e8a020", "#1f6fa8"] as const;

export function NavBuoyProp({ variant }: NavBuoyPropProps): ReactElement {
  const capColor = CAP_COLORS[variant % CAP_COLORS.length];
  return (
    <group>
      <mesh castShadow position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.6, 10]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh castShadow position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
        <meshStandardMaterial color={POLE_COLOR} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.13, 10, 10]} />
        <meshStandardMaterial color={capColor} emissive={capColor} emissiveIntensity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.36, 0.5, 16]} />
        <meshBasicMaterial color="#dceaf2" transparent opacity={0.10} depthWrite={false} />
      </mesh>
    </group>
  );
}
