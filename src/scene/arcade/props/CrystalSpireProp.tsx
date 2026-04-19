import { useFrame } from "@react-three/fiber";
import type { ReactElement } from "react";
import { useRef } from "react";
import * as THREE from "three";

interface CrystalSpirePropProps {
  seed: number;
}

export function CrystalSpireProp({ seed }: CrystalSpirePropProps): ReactElement {
  const innerRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);

  useFrame((_state) => {
    if (!innerRef.current || !outerRef.current) return;
    const time = _state.clock.elapsedTime;
    innerRef.current.position.y = 0.6 + Math.sin(time * 0.8 + seed * 2) * 0.15;
    innerRef.current.rotation.y = time * 0.2 + seed;
    outerRef.current.position.y = 0.6 + Math.sin(time * 0.8 + seed * 2) * 0.15;
    outerRef.current.rotation.y = -(time * 0.15) + seed;
  });

  return (
    <group>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.9, 1.2, 0.8, 8]} />
        <meshStandardMaterial color="#2a3a4e" roughness={0.9} />
      </mesh>
      
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#6fa8c8" emissive="#2d7a92" emissiveIntensity={0.6} />
      </mesh>
      
      <mesh ref={outerRef} scale={[1.2, 1.8, 1.2]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshPhysicalMaterial
          color="#a8d8e0"
          transparent
          opacity={0.3}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>
    </group>
  );
}
