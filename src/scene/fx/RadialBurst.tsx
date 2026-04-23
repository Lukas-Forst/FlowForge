import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useRef } from "react";
import * as THREE from "three";

interface RadialBurstProps {
  position: [number, number, number];
  life?: number;
  color?: string;
}

export function RadialBurst({ position, life = 0.4, color = "#ffe16b" }: RadialBurstProps): ReactElement {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = Math.min(1, state.clock.getElapsedTime() / Math.max(0.001, life));
    const s = 0.5 + t * 1.8;
    ref.current.scale.setScalar(s);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 1 - t;
  });
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.2, 0.35, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
    </mesh>
  );
}
