import type { ReactElement } from "react";
import { PalmProp } from "./PalmProp";

interface IslandPropProps {
  seed: number;
  size: number;
}

const ROCK = "#7a6a55";
const SAND = "#e0cf95";

export function IslandProp({ seed, size }: IslandPropProps): ReactElement {
  const palmCount = 1 + (seed % 3);
  const palms = Array.from({ length: palmCount }, (_, i) => {
    const angle = ((seed >> (i * 3)) % 360) * (Math.PI / 180);
    const radius = size * (0.15 + ((seed >> i) % 100) / 600);
    return (
      <group key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}>
        <PalmProp variant={(seed >> (i * 5)) & 0xff} />
      </group>
    );
  });

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[size * 1.2, 24]} />
        <meshStandardMaterial color={SAND} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[size * 0.85, size, 0.35, 12]} />
        <meshStandardMaterial color={ROCK} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[size * 0.55, size * 0.78, 0.35, 10]} />
        <meshStandardMaterial color={ROCK} roughness={0.85} />
      </mesh>
      {palms}
    </group>
  );
}
